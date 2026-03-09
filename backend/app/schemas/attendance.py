import uuid
from datetime import datetime

from pydantic import BaseModel


class AttendanceOut(BaseModel):
    id: uuid.UUID
    admin_id: uuid.UUID
    cubiculo_id: uuid.UUID
    type: str
    method: str
    recorded_at: datetime
    admin_name: str = ""

    model_config = {"from_attributes": True}


class AttendanceStatusOut(BaseModel):
    status: str  # "in" | "out"
    last_record: AttendanceOut | None = None
