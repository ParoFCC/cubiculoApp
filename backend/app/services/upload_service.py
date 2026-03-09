"""
Cloudinary upload service.
Reads CLOUDINARY_URL from settings (format: cloudinary://api_key:api_secret@cloud_name).
"""
import cloudinary
import cloudinary.uploader
from app.core.config import settings


def _configure() -> None:
    if not settings.CLOUDINARY_URL:
        raise ValueError("CLOUDINARY_URL not configured")
    # The Cloudinary SDK automatically parses CLOUDINARY_URL when set as an
    # environment variable, but we set it explicitly from settings to be safe.
    cloudinary.config(cloudinary_url=settings.CLOUDINARY_URL)


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
