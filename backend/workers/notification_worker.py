import logging

from app.database.connection import SessionLocal
from app.messaging.consumer import EventConsumer
from app.messaging.events import EventType
from app.notifications.models import Notification

# Import all models so SQLAlchemy's mapper registry is fully populated
# before any relationship strings are resolved.
import app.users.models  # noqa: F401
import app.listings.models  # noqa: F401
import app.bookings.models  # noqa: F401
import app.reviews.models  # noqa: F401
import app.wishlist.models  # noqa: F401

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


def handle_event(event: dict):
    event_type = event.get("event_type")
    data = event.get("data", {})

    db = SessionLocal()
    try:
        if event_type == EventType.BOOKING_CREATED.value:
            host_id = data.get("host_id")
            if not host_id:
                logger.warning("BOOKING_CREATED missing host_id, skipping notification")
                return

            booking_id = data.get("booking_id")
            listing_title = data.get("listing_title", "your listing")
            nights = data.get("nights", 0)
            check_in = data.get("check_in", "")
            check_out = data.get("check_out", "")
            total = data.get("total", 0)
            nights_label = f"{nights} night{'s' if nights != 1 else ''}"

            db.add(Notification(
                user_id=host_id,
                title="New booking received!",
                message=(
                    f'"{listing_title}" has been booked for {nights_label} '
                    f"({check_in} → {check_out}). "
                    f"Total: ${total:,.0f}"
                ),
                link=f"/hosting?tab=bookings&booking_id={booking_id}" if booking_id else "/hosting?tab=bookings",
            ))
            db.commit()
            logger.info("Host %s notified of new booking #%s", host_id, booking_id)

        elif event_type == EventType.BOOKING_CANCELLED.value:
            host_id = data.get("host_id")
            if not host_id:
                logger.warning("BOOKING_CANCELLED missing host_id, skipping notification")
                return

            booking_id = data.get("booking_id")
            listing_title = data.get("listing_title", "your listing")
            check_in = data.get("check_in", "")
            check_out = data.get("check_out", "")

            db.add(Notification(
                user_id=host_id,
                title="Booking cancelled",
                message=(
                    f'A booking for "{listing_title}" '
                    f"({check_in} → {check_out}) "
                    f"has been cancelled by the guest."
                ),
                link=f"/hosting?tab=bookings&booking_id={booking_id}" if booking_id else "/hosting?tab=bookings",
            ))
            db.commit()
            logger.info("Host %s notified of booking #%s cancellation", host_id, booking_id)

        elif event_type == EventType.REVIEW_CREATED.value:
            host_id = data.get("host_id")
            if host_id:
                listing_id = data.get("listing_id")
                listing_title = data.get("listing_title", "your listing")
                rating = data.get("rating", 0)
                guest_name = data.get("guest_name", "A guest")
                stars = "★" * int(rating) + "☆" * (5 - int(rating))
                db.add(Notification(
                    user_id=host_id,
                    title=f"New {rating}-star review on \"{listing_title}\"",
                    message=(
                        f"{guest_name} left a {rating}/5 review ({stars}) "
                        f'on "{listing_title}".'
                    ),
                    link=f"/hosting?tab=bookings&listing_id={listing_id}" if listing_id else "/hosting?tab=bookings",
                ))
                db.commit()
                logger.info(
                    "Host %s notified of %s-star review on listing %s",
                    host_id, rating, listing_id,
                )

        else:
            logger.debug("Unhandled event type: %s", event_type)

    except Exception as e:
        logger.error("Error handling event %s: %s", event_type, e)
        db.rollback()
    finally:
        db.close()


def main():
    consumer = EventConsumer(
        queue_name="notification.q",
        routing_keys=[
            EventType.BOOKING_CREATED.value,
            EventType.BOOKING_CANCELLED.value,
            EventType.BOOKING_COMPLETED.value,
            EventType.REVIEW_CREATED.value,
        ],
    )
    consumer.connect()
    logger.info("Notification worker started — listening on queue 'notification.q'")
    consumer.consume(handle_event)


if __name__ == "__main__":
    main()
