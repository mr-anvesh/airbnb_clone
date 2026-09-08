from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException
from app.notifications.models import Notification
from app.notifications.repository import NotificationRepository
from app.notifications.schemas import NotificationCreate


class NotificationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = NotificationRepository(db)

    def get_user_notifications(
        self, user_id: int
    ) -> list[Notification]:
        return self.repo.get_by_user(user_id)

    def create_notification(
        self, data: NotificationCreate
    ) -> Notification:
        notification = Notification(
            user_id=data.user_id,
            title=data.title,
            message=data.message,
            link=data.link,
        )
        return self.repo.create(notification)

    def mark_as_read(
        self, user_id: int, notification_id: int
    ) -> Notification:
        notification = self.repo.get_by_id(notification_id)
        if not notification or notification.user_id != user_id:
            raise NotFoundException(
                "NOT_FOUND", "Notification not found"
            )
        notification.is_read = True
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def mark_all_read(self, user_id: int) -> None:
        notifications = self.repo.get_by_user(user_id)
        for n in notifications:
            if not n.is_read:
                n.is_read = True
        self.db.commit()
