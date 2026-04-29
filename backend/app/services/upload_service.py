"""
Cloudinary upload service.
Reads CLOUDINARY_URL from settings (format: cloudinary://api_key:api_secret@cloud_name).
"""
import os
from urllib.parse import urlparse

import cloudinary
import cloudinary.uploader
from app.core.config import settings


def _configure() -> None:
    url = settings.CLOUDINARY_URL
    if not url:
        raise ValueError("CLOUDINARY_URL not configured")

    # Parse cloudinary://<api_key>:<api_secret>@<cloud_name> manually.
    # The SDK auto-parses CLOUDINARY_URL only from os.environ, and the
    # `cloudinary_url=` kwarg is unreliable across versions, so we set the
    # individual fields explicitly to avoid "Must supply api_key" errors.
    parsed = urlparse(url)
    if parsed.scheme != "cloudinary" or not parsed.hostname or not parsed.username or not parsed.password:
        # Fallback: expose to env and let the SDK parse it.
        os.environ["CLOUDINARY_URL"] = url
        cloudinary.config()
        return

    cloudinary.config(
        cloud_name=parsed.hostname,
        api_key=parsed.username,
        api_secret=parsed.password,
        secure=True,
    )


def upload_file(file_bytes: bytes, filename: str, folder: str = "cubiculoapp") -> str:
    """
    Upload a file to Cloudinary and return the secure URL.
    Supports images, videos, PDFs and raw documents.
    """
    _configure()

    # Determine resource type: image, video, or raw (PDFs, docs, etc.)
    lower = filename.lower()
    if any(lower.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg")):
        resource_type = "image"
    elif any(lower.endswith(ext) for ext in (".mp4", ".mov", ".avi", ".webm", ".mkv")):
        resource_type = "video"
    else:
        resource_type = "raw"  # PDFs, Word docs, etc.

    result = cloudinary.uploader.upload(
        file_bytes,
        folder=folder,
        resource_type=resource_type,
        use_filename=True,
        unique_filename=True,
    )
    return result["secure_url"]
