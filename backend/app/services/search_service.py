import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.products import Product
from app.models.user import User, UserRole


async def search_everything(
    db: AsyncSession,
    query_text: str,
    cubiculo_id: uuid.UUID,
    limit: int = 5,
) -> dict[str, list]:
    pattern = f"%{query_text.strip()}%"

    users_result = await db.execute(
        select(User)
        .where(
            User.is_active.is_(True),
            User.role == UserRole.student,
            or_(
                User.name.ilike(pattern),
                User.email.ilike(pattern),
                User.student_id.ilike(pattern),
            ),
        )
        .order_by(User.name.asc())
        .limit(limit)
    )

    games_result = await db.execute(
        select(Game)
        .where(
            Game.cubiculo_id == cubiculo_id,
            Game.is_active.is_(True),
            Game.name.ilike(pattern),
        )
        .order_by(Game.name.asc())
        .limit(limit)
    )

    products_result = await db.execute(
        select(Product)
        .where(
            Product.cubiculo_id == cubiculo_id,
            Product.is_active.is_(True),
            or_(Product.name.ilike(pattern), Product.category.ilike(pattern)),
        )
        .order_by(Product.name.asc())
        .limit(limit)
    )

    return {
        "users": list(users_result.scalars().all()),
        "games": list(games_result.scalars().all()),
        "products": list(products_result.scalars().all()),
    }