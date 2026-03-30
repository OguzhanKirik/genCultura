import uuid
from datetime import datetime
from typing import Literal
from pydantic import BaseModel

Role = Literal["grower", "manager", "admin"]


class UserSchema(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: str
    full_name: str
    password: str
    role: Role = "grower"


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: Role | None = None
    is_active: bool | None = None
