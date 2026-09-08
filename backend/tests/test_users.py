import pytest

from app.core.exceptions import ConflictException, NotFoundException
from app.users.models import UserRole
from app.users.schemas import UserCreate
from app.users.service import UserService


def test_create_user(db):
    service = UserService(db)
    data = UserCreate(name="Test", email="test@test.com", role=UserRole.GUEST)
    user = service.create_user(data)
    assert user.name == "Test"
    assert user.email == "test@test.com"


def test_get_user(db, sample_host):
    service = UserService(db)
    user = service.get_user(sample_host.id)
    assert user.id == sample_host.id


def test_get_user_not_found(db):
    service = UserService(db)
    with pytest.raises(NotFoundException):
        service.get_user(9999)


def test_duplicate_email(db):
    service = UserService(db)
    data = UserCreate(name="Test", email="dup@test.com")
    service.create_user(data)
    with pytest.raises(ConflictException):
        service.create_user(data)
