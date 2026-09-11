from datetime import date, datetime, timedelta, timezone

# The shop operates in Marikina City. Timestamps are stored as UTC in timestamptz columns
# (which is correct — the column normalizes anyway), but anything that asks "what day/month/
# year is this?" has to ask in local terms, or an order placed at 9am Manila on the 1st is
# reported as the previous month at UTC+8.
BUSINESS_TZ = timezone(timedelta(hours=8), name="UTC+8")


# The shop keeps records going back to 1998, so that's how far back any order or payment
# date may be set. Anything earlier is a typo, not history.
EARLIEST_RECORD_DATE = date(1998, 1, 1)


def validate_record_date(value: date, what: str) -> date:
    """Rejects dates in the future or before records began. Shared by every editable date so
    the rule — and its wording — is the same everywhere."""
    if value > business_today():
        raise ValueError(f"{what} can't be in the future.")
    if value < EARLIEST_RECORD_DATE:
        raise ValueError(f"{what} can't be before {EARLIEST_RECORD_DATE.year}.")
    return value


def business_now() -> datetime:
    """Current time as the shop experiences it."""
    return datetime.now(BUSINESS_TZ)


def business_today() -> date:
    """Today's calendar date in shop-local terms — not the server's idea of today."""
    return business_now().date()


def to_business(value: datetime) -> datetime:
    """Re-expresses any timestamp in shop-local time. Naive values are assumed to already
    be shop-local, which is what the admin order form sends."""
    if value.tzinfo is None:
        return value.replace(tzinfo=BUSINESS_TZ)
    return value.astimezone(BUSINESS_TZ)
