import uuid
from pydantic import BaseModel
from datetime import datetime


class CubiculoCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    location: str | None = None
    games_enabled: bool = True
    printing_enabled: bool = True
    products_enabled: bool = True


class CubiculoUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    location: str | None = None
    is_active: bool | None = None
    games_enabled: bool | None = None
    printing_enabled: bool | None = None
    products_enabled: bool | None = None


class CubiculoOut(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    location: str | None
    is_active: bool
    games_enabled: bool
    printing_enabled: bool
    products_enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}
