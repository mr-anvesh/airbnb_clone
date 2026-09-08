import logging

from app.messaging.consumer import EventConsumer
from app.messaging.events import EventType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def handle_event(event: dict):
    event_type = event.get("event_type")
    data = event.get("data", {})
    logger.info(
        "Analytics event: %s | data: %s", event_type, data
    )


def main():
    consumer = EventConsumer(
        queue_name="analytics.q",
        routing_keys=[
            EventType.BOOKING_CREATED.value,
            EventType.BOOKING_CANCELLED.value,
            EventType.LISTING_CREATED.value,
            EventType.REVIEW_CREATED.value,
            EventType.WISHLIST_UPDATED.value,
        ],
    )
    consumer.connect()
    logger.info("Analytics worker started")
    consumer.consume(handle_event)


if __name__ == "__main__":
    main()
