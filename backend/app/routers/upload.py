from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from pydantic import BaseModel

from app.dependencies.roles import require_admin
from app.services.upload_service import upload_file

router = APIRouter()

ALLOWED_MIME_PREFIXES = ("image/", "video/", "application/pdf")
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


class UploadResponse(BaseModel):
    url: str
    filename: str


@router.post("", response_model=UploadResponse, dependencies=[Depends(require_admin)])
async def upload_resource(file: UploadFile = File(...)) -> UploadResponse:
    """Upload an image, video or PDF to Cloudinary. Admin only."""
    content_type = file.content_type or ""
    if not any(content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Tipo de archivo no permitido: {content_type}. "
                   "Se aceptan imágenes, videos y PDFs.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"El archivo supera el límite de {MAX_FILE_SIZE_MB} MB.",
        )

    try:
        url = upload_file(file_bytes, file.filename or "upload")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al subir a Cloudinary: {exc}",
        )

    return UploadResponse(url=url, filename=file.filename or "upload")
