"""
Revoked refresh tokens blacklist.
Stores the JTI (JWT ID) of each revoked token so /auth/refresh can reject them.
Expired tokens are cleaned up by the nightly cron job.
"""
import uuid
from datetime import datetime

from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    # jti is the unique identifier embedded in each refresh token
    jti: Mapped[str] = mapped_column(String(36), primary_key=True)
    # Keep the expiry so the cleanup cron can prune old rows efficiently
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
