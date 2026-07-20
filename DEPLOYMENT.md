# Deployment Guide

This guide deploys the existing project as-is:
- **Frontend** (React + Vite) → **Vercel**
- **Backend** (FastAPI) → **Railway** or **Render**
- **Database** → managed **MySQL** on Railway/Render (or PlanetScale, Aiven, etc.)

No localhost URLs remain in the code — everything reads from environment
variables (`VITE_API_URL` on the frontend, `DATABASE_URL`/`DB_*`,
`SECRET_KEY`/`JWT_SECRET`, `CORS_ORIGINS` on the backend).

---

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

---

## 2. Deploy the database (MySQL)

Pick one:
- **Railway**: New Project → "Provision MySQL" → gives you a `DATABASE_URL` automatically.
- **Render**: Render doesn't offer managed MySQL directly — use **PlanetScale**,
  **Aiven for MySQL**, or a Railway MySQL plugin instead, then copy its
  connection string.

Once you have credentials, either:
- Copy the full connection string into `DATABASE_URL`, or
- Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` individually.

Run the schema once against the new database:
```bash
mysql -h <host> -P <port> -u <user> -p <database> < backend/sql/schema.sql
```
(Or just start the backend once — `Base.metadata.create_all()` in `app/main.py`
creates any missing tables automatically on boot.)

---

## 3. Deploy the backend

### Option A — Railway
1. New Project → **Deploy from GitHub repo** → select this repo.
2. Set the service's **root directory** to `backend`.
3. Railway auto-detects the `Dockerfile` and builds it. (If it instead
   detects Nixpacks, that's fine too — the `Procfile` and `runtime.txt`
   cover that path.)
4. Add environment variables (Settings → Variables):
   - `DATABASE_URL` (or the `DB_*` / `MYSQL_*` vars — see `backend/.env.example`)
   - `SECRET_KEY` (a long random string) — `JWT_SECRET` also works
   - `ALGORITHM=HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES=120`
   - `CORS_ORIGINS=https://your-app.vercel.app`
   - `FRONTEND_ORIGIN=https://your-app.vercel.app`
5. Railway injects `PORT` automatically — the Dockerfile/Procfile already
   read it (`--port ${PORT}`).
6. Deploy, then note the public URL, e.g. `https://sri-backend.up.railway.app`.
7. Visit `https://<backend-url>/docs` to confirm the API is live.
8. Create the first admin user:
   ```bash
   # from your local machine, pointed at the deployed DB via .env, or
   # via Railway's "Run a command" against the deployed service
   python create_admin.py
   ```
   or use `POST /auth/register` from the Swagger UI.

### Option B — Render
1. New → **Web Service** → connect the repo.
2. Root Directory: `backend`. Render will detect the `Dockerfile` automatically
   (or set Runtime: Python 3 and it'll use `runtime.txt` + `Procfile`/start
   command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`).
3. Add the same environment variables as above.
4. Deploy, confirm `/docs` loads.

---

## 4. Deploy the frontend (Vercel)

1. Import the GitHub repo into Vercel.
2. **Root Directory:** `frontend`.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`,
   output directory `dist` (defaults are correct — no changes needed).
4. Environment Variables:
   - `VITE_API_URL=https://<your-backend-url>` (no trailing slash)
5. Deploy.
6. `frontend/vercel.json` already rewrites all routes to `index.html`, so
   refreshing any client-side route (e.g. `/products`, `/billing`) works
   correctly instead of 404ing.

---

## 5. Connect them

- Confirm the backend's `CORS_ORIGINS` / `FRONTEND_ORIGIN` env vars include
  your exact Vercel URL (`https://your-app.vercel.app`, no trailing slash).
- Confirm the frontend's `VITE_API_URL` points at the exact backend URL.
- Redeploy either side after changing env vars (Vercel/Railway/Render only
  read them at build/boot time).

---

## 6. Local development with Docker (optional)

A root-level `docker-compose.yml` spins up MySQL + the backend together:
```bash
docker compose up --build
```
Then run the frontend separately with `npm run dev` inside `frontend/`,
pointing `VITE_API_URL` at `http://localhost:8000`.

---

## Environment variable reference

**Frontend**
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the deployed backend |

**Backend**
| Variable | Description |
|---|---|
| `DATABASE_URL` | Full MySQL connection string (preferred if your host provides one) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Used if `DATABASE_URL` isn't set |
| `MYSQL_HOST` / `MYSQL_PORT` / `MYSQL_USER` / `MYSQL_PASSWORD` / `MYSQL_DATABASE` | Alternate names some hosts use — also supported |
| `SECRET_KEY` / `JWT_SECRET` | JWT signing secret (either name works) |
| `ALGORITHM` | JWT algorithm, default `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime |
| `FRONTEND_ORIGIN` / `CORS_ORIGINS` | Allowed frontend origin(s) for CORS |

---

## What this does *not* include yet

The current codebase covers auth, products, categories, inventory, billing,
customers, suppliers, dashboard, and reports — and is now fully
deployment-ready as described above.

It does **not** yet include OCR invoice scanning, AI product matching,
sales forecasting, an Ollama-based chatbot, or a payment gateway
integration. Those are substantial standalone features (each needs real
model hosting/inference, not just code) and are best added incrementally,
one module at a time, so each can actually be tested rather than shipped
as non-functional scaffolding.
