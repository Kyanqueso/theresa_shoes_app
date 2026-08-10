"""Seed demo companies, orders, and payments against a running API.

Creates a mix of current/completed/archived orders with varied payment states
(fully paid & delivered, unpaid, undelivered, both) so the admin UI — tables,
archive tabs, Analytics — has realistic data to look at.

Usage:
    python scripts/seed_demo_data.py small
    python scripts/seed_demo_data.py medium
    python scripts/seed_demo_data.py large

Talks to a running API (default http://localhost:8000). Mints its own admin
session from the device registered in the `devices` table (matched against
VITE_DEVICE_ID in web/.env) — no PIN needed. Run the API locally first.
"""

import argparse
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config.auth import create_access_token  # noqa: E402
from app.db.base import SessionLocal  # noqa: E402
from app.db.models import Device  # noqa: E402

SIZES = {
    "small": {"companies": 3, "orders": (4, 8)},
    "medium": {"companies": 8, "orders": (10, 20)},
    "large": {"companies": 20, "orders": (20, 40)},
}

COMPANY_NAMES = [
    "BDO Bedana Pasig", "BPI Espana", "Metrobank Ortigas", "Times Corp Inc.",
    "Assumption College", "PNB Makati", "Landbank QC", "Unionbank Alabang",
    "RCBC Cebu", "Chinabank Davao", "Security Bank Taguig", "EastWest Bank Pasay",
    "Maybank BGC", "AUB Manila", "Robinsons Bank Cainta", "PSBank Marikina",
    "Philam Life Ortigas", "Sunlife Alabang", "Ayala Land Makati", "SM Corporate Pasay",
]

FIRST_NAMES = [
    "Juan", "Maria", "Pedro", "Ana", "Jose", "Rosa", "Carlos", "Lita", "Miguel", "Grace",
    "Antonio", "Carmen", "Ramon", "Teresa", "Eduardo", "Josefina", "Ricardo", "Corazon",
    "Manuel", "Luz", "Francisco", "Remedios", "Roberto", "Norma", "Ernesto", "Fe",
]
LAST_NAMES = [
    "dela Cruz", "Santos", "Reyes", "Garcia", "Lim", "Mendoza", "Tan", "Cruz", "Ramos",
    "Bautista", "Torres", "Flores", "Rivera", "Villanueva", "Gonzales", "Castro", "Aquino",
    "Fernandez", "Del Rosario", "Pascual",
]


def rand_client_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"


def rand_contact():
    return "09" + "".join(str(random.randint(0, 9)) for _ in range(9))


def resolve_device_token(explicit):
    if explicit:
        return explicit
    env_path = Path(__file__).resolve().parent.parent.parent / "web" / ".env"
    for line in env_path.read_text().splitlines():
        if line.startswith("VITE_DEVICE_ID="):
            return line.split("=", 1)[1].strip()
    raise SystemExit(f"VITE_DEVICE_ID not found in {env_path}. Pass --device-token explicitly.")


def get_admin_headers(device_token):
    db = SessionLocal()
    try:
        device = db.query(Device).filter(Device.device_token == device_token).first()
        if device is None:
            raise SystemExit(
                f"No device found with token {device_token!r} — check VITE_DEVICE_ID matches a row in `devices`."
            )
        token = create_access_token(str(device.id))
    finally:
        db.close()
    return {"X-Device-Id": device_token, "Authorization": f"Bearer {token}"}


def fetch_catalog(api_url):
    shoes = requests.get(f"{api_url}/shoes").json()
    attrs = requests.get(f"{api_url}/attributes").json()
    by_category = {}
    for attr in attrs:
        by_category.setdefault(attr["category"], []).append(attr)
    return shoes, by_category


def random_date_this_year():
    today = datetime.now(timezone.utc)
    start = datetime(today.year, 1, 1, tzinfo=timezone.utc)
    offset = random.randint(0, max((today - start).days, 0))
    dt = start + timedelta(days=offset, hours=random.randint(8, 18), minutes=random.randint(0, 59))
    return min(dt, today)


def create_company(api_url, headers, name):
    resp = requests.post(f"{api_url}/companies", json={"name": name}, headers=headers)
    resp.raise_for_status()
    return resp.json()


def create_order(api_url, company_id, shoes, attrs):
    materials = [a for a in attrs.get("material", []) if a["parent_id"] is None]
    mold_types = attrs.get("mold_type", [])
    heel_types = attrs.get("heel_type", [])
    flatforms = attrs.get("flatform", [])
    slingbacks = attrs.get("slingback", [])

    with_flatform = bool(flatforms) and random.random() < 0.15
    with_slingback = bool(slingbacks) and random.random() < 0.15
    order_date = random_date_this_year()
    material = random.choice(materials) if materials else None

    payload = {
        "company_id": company_id,
        "client_name": rand_client_name(),
        "contact_number": rand_contact(),
        "material_id": material["id"] if material else None,
        "color_code": material.get("swatch_color") if material else None,
        "mold_type_id": random.choice(mold_types)["id"] if mold_types else None,
        "heel_type_id": random.choice(heel_types)["id"] if heel_types else None,
        "size": random.randint(5, 10),
        "heel_size": random.choice([1, 2, 3, 4]),
        "quantity": random.choices([1, 2, 3], weights=[80, 15, 5])[0],
        "with_flatform": with_flatform,
        "flatform_id": random.choice(flatforms)["id"] if with_flatform else None,
        "with_slingback": with_slingback,
        "slingback_id": random.choice(slingbacks)["id"] if with_slingback else None,
        "custom_created_at": order_date.isoformat(),
        "notes_blocks": [],
    }

    if shoes and random.random() >= 0.2:
        shoe = random.choice(shoes)
        payload["shoe_id"] = shoe["id"]
        payload["unit_price"] = float(shoe["price"])
    else:
        payload["custom_model_name"] = f"Custom Model {random.randint(1000, 9999)}"
        payload["unit_price"] = round(random.uniform(1500, 2400), 2)

    resp = requests.post(f"{api_url}/orders", json=payload)
    resp.raise_for_status()
    return resp.json(), order_date


def apply_lifecycle(api_url, headers, order, order_date, payment):
    """Randomly move the order to completed/archived, and fill in its payment."""
    roll = random.random()
    if roll < 0.85:
        target_status = "current" if roll < 0.55 else "completed"
    else:
        target_status = "archived"
        # half of archived orders were "previously completed" before being archived,
        # so completed_at gets set first — matches the app's archive-lifecycle rules.
        if random.random() < 0.5:
            requests.patch(f"{api_url}/orders/{order['id']}", json={"status": "completed"}, headers=headers)

    if target_status != "current":
        requests.patch(f"{api_url}/orders/{order['id']}", json={"status": target_status}, headers=headers)

    if payment is None:
        return

    total = float(order["unit_price"]) * order["quantity"]
    delivered_date = (order_date + timedelta(days=random.randint(3, 21))).date().isoformat()
    payment_roll = random.random()
    if payment_roll < 0.35:
        body = {"first_payment": total, "date_delivered": delivered_date}  # fulfilled
    elif payment_roll < 0.55:
        body = {"first_payment": total}  # paid, undelivered
    elif payment_roll < 0.75:
        body = {"first_payment": round(total * random.uniform(0.3, 0.7), 2), "date_delivered": delivered_date}  # unpaid, delivered
    elif payment_roll < 0.9:
        body = {"first_payment": round(total * random.uniform(0.2, 0.6), 2)}  # unpaid, undelivered
    else:
        body = None  # untouched: unpaid, undelivered

    if body:
        requests.patch(f"{api_url}/payments/{payment['id']}", json=body, headers=headers)


def seed(size, api_url, device_token):
    headers = get_admin_headers(device_token)
    shoes, attrs = fetch_catalog(api_url)
    if not shoes:
        print("Warning: no shoes in the catalog — every order will use a custom model name instead.")

    config = SIZES[size]
    company_names = random.sample(COMPANY_NAMES, k=min(config["companies"], len(COMPANY_NAMES)))

    total_orders = 0
    for name in company_names:
        company = create_company(api_url, headers, name)
        order_count = random.randint(*config["orders"])
        created = [create_order(api_url, company["id"], shoes, attrs) for _ in range(order_count)]

        payments = requests.get(f"{api_url}/payments", params={"company_id": company["id"]}, headers=headers).json()
        payment_by_order = {p["order_id"]: p for p in payments}

        for order, order_date in created:
            apply_lifecycle(api_url, headers, order, order_date, payment_by_order.get(order["id"]))

        total_orders += order_count
        print(f"  {name}: {order_count} orders")

    print(f"\nSeeded {len(company_names)} companies, {total_orders} orders ({size}).")


def main():
    parser = argparse.ArgumentParser(description="Seed demo companies/orders/payments.")
    parser.add_argument("size", choices=SIZES.keys())
    parser.add_argument("--api-url", default="http://localhost:8000")
    parser.add_argument("--device-token", default=None, help="Overrides the VITE_DEVICE_ID lookup from web/.env")
    args = parser.parse_args()

    device_token = resolve_device_token(args.device_token)
    seed(args.size, args.api_url, device_token)


if __name__ == "__main__":
    main()
