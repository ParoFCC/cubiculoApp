"""
Email service using Resend (https://resend.com)
Free tier: 3,000 emails/month, 100/day — no credit card required.

Setup:
  1. Create account at resend.com
  2. Go to API Keys → Create API Key
  3. Paste the key in .env → RESEND_API_KEY=re_...
"""
import resend
from app.core.config import settings


def _client() -> None:
    resend.api_key = settings.RESEND_API_KEY


def send_verification_code(to_email: str, code: str, name: str) -> None:
    """Send a 6-digit verification code email. Falls back to console on any error."""
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_xxx"):
        print(f"\n[DEV] Código de verificación para {to_email}: {code}\n")
        return

    _client()
    try:
        resend.Emails.send({
            "from": f"Cubículo Estudiantil <{settings.EMAIL_FROM}>",
            "to": [to_email],
            "subject": "Código de verificación — Cubículo Estudiantil",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #5C35D9;">🎲 Cubículo Estudiantil</h2>
                <p>Hola <strong>{name}</strong>,</p>
                <p>Tu código de verificación es:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px;
                            color: #5C35D9; text-align: center; padding: 20px;
                            background: #F0EEFF; border-radius: 12px; margin: 20px 0;">
                    {code}
                </div>
                <p style="color: #888; font-size: 13px;">
                    Este código expira en {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutos.<br>
                    Si no creaste esta cuenta, ignora este mensaje.
                </p>
            </div>
            """,
        })
    except Exception as exc:  # noqa: BLE001
        # Fallback: print code to server console so dev flow is never blocked
        print(f"\n[EMAIL ERROR] No se pudo enviar email a {to_email}: {exc}")
        print(f"[FALLBACK] Código de verificación para {to_email}: {code}\n")


def send_password_reset_code(to_email: str, code: str) -> None:
    """Send a 6-digit password reset code. Falls back to console on any error."""
    if not settings.RESEND_API_KEY or settings.RESEND_API_KEY.startswith("re_xxx"):
        print(f"\n[DEV] Código de recuperación para {to_email}: {code}\n")
        return

    _client()
    try:
        resend.Emails.send({
            "from": f"Cubículo Estudiantil <{settings.EMAIL_FROM}>",
            "to": [to_email],
            "subject": "Recuperación de contraseña — Cubículo Estudiantil",
            "html": f"""
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #5C35D9;">🎲 Cubículo Estudiantil</h2>
                <p>Recibimos una solicitud para restablecer tu contraseña.</p>
                <p>Tu código de recuperación es:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px;
                            color: #5C35D9; text-align: center; padding: 20px;
                            background: #F0EEFF; border-radius: 12px; margin: 20px 0;">
                    {code}
                </div>
                <p style="color: #888; font-size: 13px;">
                    Este código expira en {settings.VERIFICATION_CODE_EXPIRE_MINUTES} minutos.<br>
                    Si no solicitaste este cambio, ignora este mensaje.
                </p>
            </div>
            """,
        })
    except Exception as exc:  # noqa: BLE001
        print(f"\n[EMAIL ERROR] No se pudo enviar email a {to_email}: {exc}")
        print(f"[FALLBACK] Código de recuperación para {to_email}: {code}\n")
