import uuid
from fastapi import Header, HTTPException


async def get_cubiculo_id(x_cubiculo_id: str = Header(...)) -> uuid.UUID:
    try:
        return uuid.UUID(x_cubiculo_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="X-Cubiculo-Id inválido")
