from sqlalchemy.orm import Session

from app.core.exceptions import ConflictException, NotFoundException
from app.users.models import User
from app.users.repository import UserRepository
from app.users.schemas import UserCreate


class UserService:
    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def get_user(self, user_id: int) -> User:
        user = self.repo.get_by_id(user_id)
        if not user:
            raise NotFoundException("USER_NOT_FOUND", "User not found")
        return user

    def get_all_users(self) -> list[User]:
        return self.repo.get_all()

    def create_user(self, data: UserCreate) -> User:
        if self.repo.get_by_email(data.email):
            raise ConflictException("EMAIL_EXISTS", "Email already in use")
        user = User(
            name=data.name,
            email=data.email,
            role=data.role,
            avatar_url=data.avatar_url,
        )
        return self.repo.create(user)
