from app.messaging.events import DomainEvent, EventType


def review_created_event(
    review_id: int, listing_id: int, host_id: int
) -> DomainEvent:
    return DomainEvent(
        event_type=EventType.REVIEW_CREATED,
        data={
            "review_id": review_id,
            "listing_id": listing_id,
            "host_id": host_id,
        },
    )
