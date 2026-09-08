from app.core.exceptions import ForbiddenException
from app.users.models import User, UserRole


def require_host(user: User) -> None:
    if user.role != UserRole.HOST:
        raise ForbiddenException("FORBIDDEN", "Host access required")


def require_owner(user: User, resource_user_id: int) -> None:
    if user.id != resource_user_id:
        raise ForbiddenException(
            "HOST_OWNERSHIP_REQUIRED", "You do not own this resource"
        )
