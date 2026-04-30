import uuid
import re
import random
import string
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.config import settings
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User, UserRole
from app.models.email_verification import EmailVerification
from app.models.revoked_token import RevokedToken
from app.services.email_service import send_verification_code, send_password_reset_code
from jose import JWTError

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class LoginRequest(BaseModel):
    email: str  # accepts matricula, @alm.buap.mx or @alumno.buap.mx
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    student_id: str
    period: str | None = None
    role: UserRole = UserRole.admin


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str


def _generate_code() -> str:
    return "".join(random.choices(string.digits, k=6))


@router.post("/register", status_code=202)
@limiter.limit("5/minute")
async def register(request: Request, payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Step 1: validate data, send verification code, do NOT create user yet."""
    email = payload.email.lower()

    # Domain check
    if not (email.endswith("@alm.buap.mx") or email.endswith("@alumno.buap.mx")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Solo se permiten correos @alm.buap.mx o @alumno.buap.mx",
        )

    # Validate student_id format for student role: 4-digit year followed by 5 digits
    if payload.role == UserRole.student and not re.match(r'^\d{9}$', payload.student_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La matrícula debe tener exactamente 9 dígitos (año + 5 dígitos)",
        )

    # Validate student_id is contained in the email username
    email_username = email.split("@")[0]
    if payload.student_id not in email_username:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La matrícula debe estar incluida en el correo institucional",
        )

    # Check email not already registered
    existing = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El email ya está registrado")

    if len(payload.password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 8 caracteres",
        )
    if not re.search(r'[0-9]', payload.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe contener al menos un número",
        )
    if not re.search(r'[A-Z]', payload.password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe contener al menos una letra mayúscula",
        )

    # Invalidate previous codes for this email
    await db.execute(delete(EmailVerification).where(EmailVerification.email == email))
    await db.commit()

    code = _generate_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES)
    verification = EmailVerification(email=email, code=code, expires_at=expires)
    db.add(verification)
    await db.commit()

    # Send email (prints to console in dev if RESEND_API_KEY is not configured)
    send_verification_code(to_email=email, code=code, name=payload.name)

    return {"message": f"Código enviado a {email}. Válido por {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutos."}


@router.post("/verify-email", status_code=status.HTTP_410_GONE)
async def verify_email_gone():
    """Deprecated endpoint — use /verify-email-full instead."""
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="Este endpoint fue eliminado. Usa /auth/verify-email-full.",
    )


class VerifyEmailFullRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    student_id: str
    period: str | None = None
    role: UserRole = UserRole.admin
    code: str


@router.post("/verify-email-full", response_model=TokenResponse, status_code=201)
@limiter.limit("10/minute")
async def verify_email_full(request: Request, payload: VerifyEmailFullRequest, db: AsyncSession = Depends(get_db)):
    """Step 2 (full): verify code + create user + return tokens."""
    email = payload.email.lower()

    verification = (
        await db.execute(
            select(EmailVerification).where(
                EmailVerification.email == email,
                EmailVerification.is_used.is_(False),
            )
        )
    ).scalar_one_or_none()

    if not verification:
        raise HTTPException(status_code=400, detail="No hay un código pendiente para este correo")

    if verification.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="El código ha expirado. Vuelve a registrarte.")

    MAX_ATTEMPTS = 5
    if verification.failed_attempts >= MAX_ATTEMPTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demasiados intentos fallidos. Vuelve a registrarte para obtener un nuevo código.",
        )

    if verification.code != payload.code:
        verification.failed_attempts += 1
        await db.commit()
        remaining = MAX_ATTEMPTS - verification.failed_attempts
        raise HTTPException(
            status_code=400,
            detail=f"Código incorrecto. Intentos restantes: {remaining}",
        )

    # Mark code used
    verification.is_used = True
    await db.commit()

    # Create user
    derived_period = payload.period
    if not derived_period:
        # Matricula format: 4-digit year followed by 5 digits (e.g. 202612345)
        m = re.match(r'^(\d{4})\d{5}$', payload.student_id)
        if m:
            derived_period = f"{m.group(1)}-1"

    user = User(
        name=payload.name,
        email=email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        student_id=payload.student_id,
        period=derived_period,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
async def login(request: Request, payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    raw = payload.email.strip().lower()

    # Resolve to a User: by email (any domain) or by student_id
    if "@" in raw:
        result = await db.execute(
            select(User).where(User.email == raw, User.is_active.is_(True))
        )
    else:
        # Treat as student_id / matricula
        result = await db.execute(
            select(User).where(User.student_id == raw, User.is_active.is_(True))
        )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    # Bootstrap: auto-promote original super-admin if flag not set yet
    if user.student_id == settings.SUPER_ADMIN_ID and not user.is_super_admin:
        user.is_super_admin = True
        user.role = UserRole.admin
        await db.commit()

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id)),
    )


@router.post("/refresh", response_model=dict)
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        data = decode_token(payload.refresh_token)
        if data.get("type") != "refresh":
            raise JWTError()
        user_id = data.get("sub")
        jti = data.get("jti")
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
        )

    try:
        uid = uuid.UUID(user_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    # Reject if the token was revoked (logged out)
    if jti:
        revoked = await db.get(RevokedToken, jti)
        if revoked:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token revocado. Inicia sesión nuevamente.",
            )

    result = await db.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no activo")

    return {"access_token": create_access_token(str(user.id), user.role.value)}


class LogoutRequest(BaseModel):
    refresh_token: str


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    """Revoke the refresh token so it cannot be reused after logout."""
    try:
        data = decode_token(payload.refresh_token)
        jti = data.get("jti")
        exp = data.get("exp")
        if jti and exp:
            expires_at = datetime.fromtimestamp(exp, tz=timezone.utc)
            db.add(RevokedToken(
                jti=jti,
                expires_at=expires_at,
                revoked_at=datetime.now(timezone.utc),
            ))
            await db.commit()
    except Exception:
        # Token already invalid / expired — logout is still successful
        pass


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


@router.post("/forgot-password", status_code=200)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Step 1: send a 6-digit reset code to the user's email."""
    email = payload.email.lower()

    user = (
        await db.execute(
            select(User).where(User.email == email, User.is_active.is_(True))
        )
    ).scalar_one_or_none()

    # Always return 200 to avoid email enumeration
    if not user:
        return {"message": f"Si el correo existe, recibirás un código en los próximos minutos."}

    # Invalidate previous codes for this email
    await db.execute(delete(EmailVerification).where(EmailVerification.email == email))
    await db.commit()

    code = _generate_code()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.VERIFICATION_CODE_EXPIRE_MINUTES)
    db.add(EmailVerification(email=email, code=code, expires_at=expires))
    await db.commit()

    send_password_reset_code(to_email=email, code=code)
    return {"message": f"Si el correo existe, recibirás un código en los próximos minutos."}


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    pin: str          # 6-digit code sent to email
    new_password: str


@router.post("/reset-password", status_code=200)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Step 2: verify the emailed code and set a new password."""
    email = payload.email.lower()

    if len(payload.new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe tener al menos 8 caracteres",
        )
    if not re.search(r'[0-9]', payload.new_password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe contener al menos un número",
        )
    if not re.search(r'[A-Z]', payload.new_password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La contraseña debe contener al menos una letra mayúscula",
        )

    verification = (
        await db.execute(
            select(EmailVerification).where(
                EmailVerification.email == email,
                EmailVerification.is_used.is_(False),
            )
        )
    ).scalar_one_or_none()

    if not verification or verification.code != payload.pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código incorrecto o no encontrado",
        )

    if datetime.now(timezone.utc) > verification.expires_at:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="El código ha expirado. Solicita uno nuevo.",
        )

    user = (
        await db.execute(
            select(User).where(User.email == email, User.is_active.is_(True))
        )
    ).scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado",
        )

    user.password_hash = hash_password(payload.new_password)
    verification.is_used = True
    await db.commit()
    return {"message": "Contraseña actualizada correctamente"}
