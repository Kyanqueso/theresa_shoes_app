# Theresa Shoes

Custom-shoe ordering app. Guests browse the collection and submit orders; the owner manages
companies, orders, payments and the catalog from an admin panel.

- `api/` — FastAPI + SQLAlchemy on AWS Lambda (Mangum), Supabase Postgres + Storage
- `web/` — React + Vite on Vercel

## Environments

| | Frontend | Backend stack | Database |
|---|---|---|---|
| **Production** | `theresa-shoes-app-final.vercel.app` (branch `master`) | `theresa-shoes-api-prod` | Supabase (Singapore) |
| **Demo** | `web-kappa-two-18.vercel.app` (branch `demo`) | `theresa-shoes-api` | Supabase (separate) |

The demo runs with `DEMO_MODE=true`, which accepts any PIN and hides the owner's real contact
details. Production has it off.

## Admin access

Two layers. A device must be on the allowlist (`devices` table) to reach the PIN screen at
all; then a 4-digit PIN issues a session. New devices join via **Admin → Devices → Add
Device**, which prints a single-use code to enter on the new device at `/pair`.

## Local development

```
# backend
cd api && python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd web && npm install && npm run dev
```

Both need a `.env` (not committed). `api/.env` needs `DATABASE_URL`, `SUPABASE_URL`,
`SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `PIN_PEPPER`, `ADMIN_EMAIL`, `CORS_ORIGINS`.
`web/.env` needs `VITE_API_URL`.

## Deploying

- **Backend:** `cd api && py -m samcli build --use-container && py -m samcli deploy`
  (Docker must be running — Pillow and psycopg2 need Linux binaries.) Parameters live in
  `api/samconfig.toml`, which is gitignored because it holds secrets.
- **Frontend:** push to `master`. Vercel builds automatically.

## Schema

`api/app/db/models.py` is the source of truth; `api/schema.sql` is the runnable bootstrap,
maintained by hand. There are no migrations — keep the two in sync when you change a model.
