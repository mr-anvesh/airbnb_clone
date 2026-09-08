from app.messaging.events import DomainEvent, EventType


def booking_created_event(
    booking_id: int, listing_id: int, guest_id: int
) -> DomainEvent:
    return DomainEvent(
        event_type=EventType.BOOKING_CREATED,
        data={
            "booking_id": booking_id,
            "listing_id": listing_id,
            "guest_id": guest_id,
        },
    )


def booking_cancelled_event(
    booking_id: int, listing_id: int
) -> DomainEvent:
    return DomainEvent(
        event_type=EventType.BOOKING_CANCELLED,
        data={"booking_id": booking_id, "listing_id": listing_id},
    )
