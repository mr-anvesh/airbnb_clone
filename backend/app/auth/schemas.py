from pydantic import BaseModel
from app.users.models import UserRole


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    role: UserRole = UserRole.GUEST


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    name: str
    email: str
    role: str
    avatar_url: str | None = None
