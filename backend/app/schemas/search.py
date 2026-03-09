from pydantic import BaseModel


class UserSearchOut(BaseModel):
    id: str
    name: str
    email: str
    student_id: str | None = None


class GameSearchOut(BaseModel):
    id: str
    name: str
    quantity_total: int
    quantity_avail: int


class ProductSearchOut(BaseModel):
    id: str
    name: str
    stock: int
    price: float


class GlobalSearchResponse(BaseModel):
    users: list[UserSearchOut]
    games: list[GameSearchOut]
    products: list[ProductSearchOut]