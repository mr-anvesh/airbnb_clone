from datetime import date

CLEANING_FEE_RATE = 0.10
SERVICE_FEE_RATE = 0.12


class PriceCalculation:
    def __init__(
        self,
        nightly_price: float,
        nights: int,
        nightly_subtotal: float,
        cleaning_fee: float,
        service_fee: float,
        total: float,
    ):
        self.nightly_price = nightly_price
        self.nights = nights
        self.nightly_subtotal = nightly_subtotal
        self.cleaning_fee = cleaning_fee
        self.service_fee = service_fee
        self.total = total


def calculate_price(
    price_per_night: float, check_in: date, check_out: date
) -> PriceCalculation:
    nights = (check_out - check_in).days
    nightly_subtotal = price_per_night * nights
    cleaning_fee = round(nightly_subtotal * CLEANING_FEE_RATE, 2)
    service_fee = round(nightly_subtotal * SERVICE_FEE_RATE, 2)
    total = round(nightly_subtotal + cleaning_fee + service_fee, 2)
    return PriceCalculation(
        nightly_price=price_per_night,
        nights=nights,
        nightly_subtotal=nightly_subtotal,
        cleaning_fee=cleaning_fee,
        service_fee=service_fee,
        total=total,
    )
