# Theresa Shoes

The application has already been approved by the client and is currently undergoing further improvements based on their feedback and evolving requirements.

This repository was created as a fresh, centralized version of the project. The previous implementation was built using vanilla HTML, CSS, and JavaScript and had become increasingly spread out as the project evolved. To provide a cleaner structure, improve maintainability, and establish a more scalable foundation for future development, the application was restructured using React.

The current focus is on refining the application and implementing the remaining improvements requested by the client to ensure the software is intuitive, reliable, and used effectively.

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

## Deploying

- **Backend:** `cd api && py -m samcli build --use-container && py -m samcli deploy`
  (Docker must be running — Pillow and psycopg2 need Linux binaries.) Parameters live in
  `api/samconfig.toml`, which is gitignored because it holds secrets.
- **Frontend:** push to `master`. Vercel builds and deploys automatically.
