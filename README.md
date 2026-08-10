# Theresa Shoes App

A custom-shoe ordering app: guests browse the collection and submit orders, admins manage
companies, orders, payments, and the catalog.

## Structure

- `api/` — FastAPI + SQLAlchemy backend, deployed to AWS Lambda (via Mangum) behind API Gateway.
  Data lives in Supabase Postgres.
- `web/` — React + Vite frontend, deployed to Vercel.

## Local development

```
# backend
cd api
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# frontend
cd web
npm install
npm run dev
```

Both need a `.env` file (see `api/.env`'s existing keys / `web/.env.example`) — not committed,
ask for the values.

## Branches

- `master` — the real app, real auth (PIN + device gate).
- `demo` — public showcase deploy. `DEMO_MODE=true` (backend) / `VITE_DEMO_MODE=true` (frontend)
  bypass the PIN check and hide/disable real contact info — see inline comments where
  `demo_mode` / `isDemoMode` are checked.

## Deploying

- Backend: `cd api && sam build --use-container && sam deploy` (see `api/template.yaml`).
- Frontend: `cd web && vercel --prod` (env vars are set in the Vercel project settings, not
  in `.env`).
