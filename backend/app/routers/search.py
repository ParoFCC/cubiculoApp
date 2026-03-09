import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.cubiculo import get_cubiculo_id
from app.dependencies.roles import require_admin
from app.schemas.search import GlobalSearchResponse
import app.services.search_service as svc

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/global", response_model=GlobalSearchResponse, dependencies=[Depends(require_admin)])
async def global_search(
    q: str = Query(..., min_length=2, description="Texto para busqueda global"),
    limit: int = Query(default=5, ge=1, le=15),
    db: AsyncSession = Depends(get_db),
    cubiculo_id: uuid.UUID = Depends(get_cubiculo_id),
):
    results = await svc.search_everything(db, q, cubiculo_id, limit=limit)
    return GlobalSearchResponse(
        users=[
            {
                "id": str(item.id),
                "name": item.name,
                "email": item.email,
                "student_id": item.student_id,
            }
            for item in results["users"]
        ],
        games=[
            {
                "id": str(item.id),
                "name": item.name,
                "quantity_total": item.quantity_total,
                "quantity_avail": item.quantity_avail,
            }
            for item in results["games"]
        ],
        products=[
            {
                "id": str(item.id),
                "name": item.name,
                "stock": item.stock,
                "price": float(item.price),
            }
            for item in results["products"]
        ],
    )