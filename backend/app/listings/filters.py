from datetime import date

from app.core.exceptions import BadRequestException


def validate_search_params(
    check_in: str | None,
    check_out: str | None,
    guests: int | None,
    min_price: float | None,
    max_price: float | None,
) -> tuple[date | None, date | None]:
    parsed_check_in = None
    parsed_check_out = None

    if check_in:
        try:
            parsed_check_in = date.fromisoformat(check_in)
        except ValueError:
            raise BadRequestException(
                "INVALID_DATE_RANGE", "Invalid check-in date format"
            )

    if check_out:
        try:
            parsed_check_out = date.fromisoformat(check_out)
        except ValueError:
            raise BadRequestException(
                "INVALID_DATE_RANGE", "Invalid check-out date format"
            )

    if (
        parsed_check_in
        and parsed_check_out
        and parsed_check_out <= parsed_check_in
    ):
        raise BadRequestException(
            "INVALID_DATE_RANGE", "Check-out must be after check-in"
        )

    if (parsed_check_in and not parsed_check_out) or (
        parsed_check_out and not parsed_check_in
    ):
        raise BadRequestException(
            "INVALID_DATE_RANGE",
            "Both check-in and check-out dates are required",
        )

    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise BadRequestException(
            "BAD_REQUEST", "min_price must be less than max_price"
        )

    if guests is not None and guests < 1:
        raise BadRequestException(
            "INVALID_GUEST_COUNT", "Guests must be at least 1"
        )

    return parsed_check_in, parsed_check_out
