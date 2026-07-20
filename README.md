# E-commerce Management System

A full-stack **Smart Provision Store Management System** for a small family-owned grocery store: products, categories, inventory, POS billing, customers (with a self-service storefront), suppliers, sales reports — plus a set of AI-powered features (invoice OCR, AI product matching, sales forecasting, and a store chatbot).

## Features

### Core Modules
1. **Authentication & Authorization** — JWT-based auth with staff/customer roles and RBAC
2. **Product Management** — Full CRUD with images, brands, categories, search/filter
3. **Customer Storefront** — Self-service online ordering, wishlist, cart, reviews
4. **Supplier Management** — Supplier CRUD with purchase history tracking
5. **Invoice OCR Scanner** — AI-powered invoice scanning and text parsing (Tesseract/RapidOCR)
6. **AI Product Matching** — Fuzzy matching for auto-linking scanned invoice items to catalog products
7. **Inventory Management** — Stock tracking with adjustment logs and expiry monitoring
8. **Low-Stock Alerts** — Automatic notifications when stock falls below threshold
9. **Dashboard** — Real-time KPIs, sales charts, profit/loss, and expiry status
10. **POS Billing** — Point-of-sale system with line items, stock deduction, and receipt generation
11. **Sales Analytics** — Charts and breakdowns by period, category, product
12. **Sales Forecasting** — Statistical moving-average + trend prediction for reorder planning
13. **AI Chatbot** — Rule-based assistant with optional Ollama LLM fallback
14. **Global Search** — Unified search across products, customers, suppliers
15. **Barcode & QR Codes** — Generate and scan product barcodes/QR codes
16. **Razorpay Payments** — Online payment integration for customer orders
17. **Reports & Export** — CSV/Excel export for sales, purchases, inventory, suppliers, customers
18. **Role-Based Dashboard Views** — Different dashboard layouts per user role
19. **Email Notifications** — SMTP email with console fallback (password reset, low stock, order confirm)
20. **Coupon & Referral System** — Discount coupons and referral tracking

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router, Axios, Recharts, lucide-react |
| Backend | Python FastAPI, SQLAlchemy, Pydantic |
| Database | MySQL 8.0+ (or MariaDB) |
| Auth | JWT (python-jose) with bcrypt password hashing |
| AI/ML | Rule-based + statistical (zero extra installs), optional Ollama/Tesseract |
| PWA | Service Worker, Web App Manifest |
| Deployment | Vercel (frontend), Render (backend) |

## Folder Structure

```
sps/
├── backend/                  # FastAPI REST API
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, router registration
│   │   ├── config.py         # Settings loaded from .env
│   │   ├── database.py       # SQLAlchemy engine/session
│   │   ├── models.py         # All ORM tables
│   │   ├── schemas.py        # Pydantic request/response models
│   │   ├── auth.py           # Password hashing, JWT, RBAC dependencies
│   │   ├── utils/
│   │   │   ├── email.py      # SMTP sender with console fallback
│   │   │   ├── ocr.py        # Invoice OCR + text parsing
│   │   │   └── ai_matching.py # Fuzzy product matching
│   │   └── routers/
│   │       ├── auth.py
│   │       ├── products.py
│   │       ├── brands.py
│   │       ├── categories.py
│   │       ├── storefront.py
│   │       ├── suppliers.py
│   │       ├── purchases.py
│   │       ├── sales.py
│   │       ├── inventory.py
│   │       ├── forecasting.py
│   │       ├── chatbot.py
│   │       ├── search.py
│   │       ├── payments.py
│   │       ├── reports.py
│   │       ├── notifications.py
│   │       ├── dashboard.py
│   │       ├── orders.py
│   │       ├── customers.py
│   │       ├── coupons.py
│   │       └── referrals.py
│   ├── sql/schema.sql
│   ├── uploads/products/
│   ├── create_admin.py
│   ├── seed_data.py
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── Procfile
│   ├── render.yaml
│   ├── runtime.txt
│   └── .env.example
├── frontend/                 # React (Vite) single-page app
│   ├── public/
│   │   ├── manifest.json     # PWA manifest
│   │   └── sw.js             # Service worker
│   ├── src/
│   │   ├── api/              # Axios instance, API endpoints
│   │   ├── components/       # Layout, Sidebar, Navbar, ChatWidget, etc.
│   │   ├── context/          # AuthContext, ThemeContext
│   │   ├── pages/            # All page components
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vercel.json
│   └── vite.config.js
├── docker-compose.yml
├── README.md
└── DEPLOYMENT.md
```

## Prerequisites

- **Python 3.10+** — https://www.python.org/downloads/
- **Node.js 18+** and npm — https://nodejs.org/
- **MySQL 8.0+** (or MariaDB) — https://dev.mysql.com/downloads/

Optional (only for specific AI features):
- **Tesseract OCR** — for invoice scanning (Module 5)
- **Ollama** — for chatbot freeform fallback (Module 13)

## Database Setup

```sql
CREATE DATABASE sri_provision_store CHARACTER SET utf8mb4;
```

Or load the full schema directly:

```bash
mysql -u root -p sri_provision_store < backend/sql/schema.sql
```

> **PowerShell:** `Get-Content backend/sql/schema.sql | mysql -u root -p sri_provision_store`

## Installation

### Backend

```bash
cd sps/backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### Frontend

```bash
cd sps/frontend
npm install
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DB_HOST` | Yes | MySQL host (default: `localhost`) |
| `DB_PORT` | Yes | MySQL port (default: `3306`) |
| `DB_USER` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_NAME` | Yes | Database name (`sri_provision_store`) |
| `SECRET_KEY` | Yes | JWT secret key (long random string) |
| `FRONTEND_ORIGIN` | Yes | Frontend URL (default: `http://localhost:5173`) |
| `SMTP_HOST` | No | SMTP server for email notifications |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASSWORD` | No | SMTP password |
| `OLLAMA_URL` | No | Ollama server URL for chatbot |
| `RAZORPAY_KEY_ID` | No | Razorpay test/live key |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Backend API URL (default: `http://localhost:8000`) |

## Running Locally

### Start Backend

```bash
cd sps/backend
uvicorn app.main:app --reload
```

API starts at **http://localhost:8000**.

### Create Admin User

```bash
python create_admin.py
```

### Start Frontend

```bash
cd sps/frontend
npm run dev
```

App starts at **http://localhost:5173**.

## API Documentation

Interactive Swagger UI is auto-generated by FastAPI:

**http://localhost:8000/docs**

Use `POST /auth/login` to get a token, click **Authorize**, and paste `Bearer <token>` to test all protected endpoints.

### Key Endpoint Groups

| Area | Endpoints |
|------|-----------|
| Auth | `/auth/login`, `/auth/register`, `/auth/customer/login`, `/auth/customer/register` |
| Products | `/products` (CRUD), `/products/barcode/{code}`, `/products/{id}/barcode-image` |
| Storefront | `/storefront/cart`, `/storefront/orders`, `/storefront/wishlist` |
| Suppliers | `/suppliers` (CRUD) |
| Purchases | `/purchases/scan-invoice`, `/purchases` |
| Inventory | `/inventory`, `/inventory/logs` |
| Billing | `/sales`, `/payments/razorpay/create-order` |
| Reports | `/reports/sales`, `/reports/purchases`, `/reports/inventory` |
| Dashboard | `/dashboard/summary`, `/dashboard/sales-by-period`, `/dashboard/profit-loss` |
| Chatbot | `/chatbot` |
| Search | `/search/global`, `/search/admin` |
| Notifications | `/notifications` |

## Deployment

### Frontend — Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import the repository
3. Set root directory to `sps/frontend`
4. Framework preset: **Vite**
5. Build command: `npm run build`
6. Output directory: `dist`
7. Add environment variable: `VITE_API_URL` = your backend URL

### Backend — Render

1. Go to [render.com](https://render.com) and create a new **Web Service**
2. Connect your GitHub repo
3. Set root directory to `sps/backend`
4. Runtime: **Python 3.11**
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add environment variables from the table above
8. Or use the included `render.yaml` Blueprint for automated setup

### Docker

```bash
docker-compose up --build
```

## Default Admin Credentials

After running `python create_admin.py`:

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `admin123` |

> **Change this password immediately in production.**

## AI Features

Every AI feature degrades gracefully — the app runs fine without optional dependencies:

- **Invoice OCR (Module 5):** Requires Tesseract or RapidOCR. Parses tabular invoices with regex heuristics.
- **AI Product Matching (Module 6):** Works out of the box. Fuzzy token-overlap matching.
- **Sales Forecasting (Module 12):** Works out of the box. Pure-Python moving average + trend.
- **Chatbot (Module 13):** Works out of the box with rule-based answers. Optional Ollama for freeform questions.
- **Barcode/QR (Module 15):** Optional `python-barcode` and `qrcode` packages.
- **Razorpay (Module 16):** Optional `razorpay` package with test keys.
- **Excel Export (Module 17):** Optional `openpyxl`. Falls back to CSV if not installed.
- **Email (Module 19):** Works in console mode. Set SMTP vars for real emails.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the **MIT License**.

---

Built with React, FastAPI, and ❤️ for small grocery store management.
