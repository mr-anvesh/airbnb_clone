from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.users.models import User
from app.users.repository import UserRepository

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: int) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    data = {"sub": str(user_id), "exp": expire}
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Optional[int]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        return int(user_id)
    except JWTError:
        return None


class AuthService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def signup(self, name: str, email: str, password: str, role) -> User:
        if self.repo.get_by_email(email):
            raise ConflictException("EMAIL_EXISTS", "Email already in use")
        user = User(
            name=name,
            email=email,
            role=role,
            password_hash=hash_password(password),
        )
        return self.repo.create(user)

    def login(self, email: str, password: str) -> User:
        user = self.repo.get_by_email(email)
        if not user or not user.password_hash:
            raise UnauthorizedException("INVALID_CREDENTIALS", "Invalid email or password")
        if not verify_password(password, user.password_hash):
            raise UnauthorizedException("INVALID_CREDENTIALS", "Invalid email or password")
        return user
