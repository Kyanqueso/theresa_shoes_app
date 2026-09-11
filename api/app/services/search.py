import re

# Accepts the ways someone might type an order reference: "ORDER-005", "order 5", "ord-5",
# "#5", "005" or just "5". Case-insensitive; leading zeros don't matter.
_ORDER_REFERENCE = re.compile(r"^\s*(?:order|ord)?[\s#-]*0*(\d{1,9})\s*$", re.IGNORECASE)


def parse_order_number(search: str | None) -> int | None:
    """The order number a search term refers to, or None if it isn't one.

    Used alongside the client-name match rather than instead of it, so a term like "5" still
    finds a client called "Unit 5" as well as ORDER-005.
    """
    if not search:
        return None
    match = _ORDER_REFERENCE.match(search)
    return int(match.group(1)) if match else None
