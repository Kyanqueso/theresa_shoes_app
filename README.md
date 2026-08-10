# Theresa Shoes App — Demo

A custom-shoe ordering app: guests browse the collection and submit orders, admins manage
companies, orders, payments, and the catalog.

**This repo currently only has the `demo` branch published — a public showcase deploy.**

## Live demo

- **Site**: https://web-kappa-two-18.vercel.app
- **Admin panel**: click "Admin" → enter any 4 digits as the PIN, no real PIN needed.

This is a showcase build, not the real production app:
- The PIN check is bypassed — any 4 digits log you into the admin panel.
- Real owner contact info (name, phone, email) is blurred/hidden on the Contact page and footer.
- The "Contact Us in Viber" button is disabled here (shows a note instead of messaging the
  real owner).

These are controlled by `DEMO_MODE=true` (backend) and `VITE_DEMO_MODE=true` (frontend) — see
where `demo_mode` / `isDemoMode` are checked in the code.

The real (`master`) app is under ongoing modification as requested by the client — features
and fixes land there as they're commissioned, and it isn't published yet. This demo isn't a
stripped-down preview, though: feature-wise, it's effectively the whole thing as it stands
today, just with the PIN check bypassed and the owner's real contact info hidden.

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

Both need a `.env` file (see `api/.env`'s existing keys) — not committed, ask for the values.

## Deploying

- Backend: `cd api && sam build --use-container && sam deploy` (see `api/template.yaml`).
- Frontend: `cd web && vercel --prod` (env vars are set in the Vercel project settings, not
  in `.env`).
