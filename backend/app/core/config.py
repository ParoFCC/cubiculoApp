from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import model_validator
from typing import List, Any
import json


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    DEBUG: bool = False
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database (Neon PostgreSQL)
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host/db

    # CORS – stored raw, parsed by model validator below
    # Accepts JSON array ("["x","y"]") or comma-separated ("x,y" or "*")
    ALLOWED_ORIGINS: Any = "*"

    @model_validator(mode="after")
    def _parse_origins(self) -> "Settings":
        v = self.ALLOWED_ORIGINS
        if isinstance(v, list):
            pass
        elif isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                try:
                    v = json.loads(v)
                except json.JSONDecodeError:
                    # Remove brackets and split: [a,b] -> ["a","b"]
                    inner = v.strip("[]")
                    v = [i.strip() for i in inner.split(",") if i.strip()] or ["*"]
            else:
                v = [i.strip() for i in v.split(",") if i.strip()] or ["*"]
        self.ALLOWED_ORIGINS = v
        return self

    # Printing config
    FREE_PRINTS_PER_PERIOD: int = 10
    PAID_PRINT_PRICE: float = 0.50  # precio por hoja

    # El único matrícula autorizado para crear otros admins
    SUPER_ADMIN_ID: str = "be202329205"

    # Email (Resend - https://resend.com, free: 3000/month)
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@alm.buap.mx"
    VERIFICATION_CODE_EXPIRE_MINUTES: int = 15

    # Cloudinary (CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name)
    CLOUDINARY_URL: str = ""


settings = Settings()
