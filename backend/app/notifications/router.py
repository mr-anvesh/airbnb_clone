from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.dependencies import get_current_user_id, get_db
from app.notifications.schemas import NotificationResponse
from app.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
def get_notifications(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    return service.get_user_notifications(user_id)


@router.post(
    "/{notification_id}/read",
    response_model=NotificationResponse,
)
def mark_notification_read(
    notification_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    return service.mark_as_read(user_id, notification_id)


@router.post("/read-all", status_code=204)
def mark_all_read(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    service = NotificationService(db)
    service.mark_all_read(user_id)
