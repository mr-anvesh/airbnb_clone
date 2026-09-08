from datetime import datetime

from pydantic import BaseModel

from app.users.models import UserRole


class UserBase(BaseModel):
    name: str
    email: str


class UserCreate(UserBase):
    role: UserRole = UserRole.GUEST
    avatar_url: str | None = None


class UserResponse(UserBase):
    id: int
    role: UserRole
    avatar_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserBrief(BaseModel):
    id: int
    name: str
    avatar_url: str | None

    model_config = {"from_attributes": True}
