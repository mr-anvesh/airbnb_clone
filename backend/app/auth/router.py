from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.schemas import LoginRequest, SignupRequest, TokenResponse
from app.auth.service import AuthService, create_access_token
from app.dependencies import get_current_user_id, get_db
from app.users.schemas import UserResponse
from app.users.service import UserService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=TokenResponse, status_code=201)
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.signup(data.name, data.email, data.password, data.role)
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        avatar_url=user.avatar_url,
    )


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    service = AuthService(db)
    user = service.login(data.email, data.password)
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        user_id=user.id,
        name=user.name,
        email=user.email,
        role=user.role.value,
        avatar_url=user.avatar_url,
    )


@router.get("/me", response_model=UserResponse)
def me(user_id: int = Depends(get_current_user_id), db: Session = Depends(get_db)):
    service = UserService(db)
    return service.get_user(user_id)
