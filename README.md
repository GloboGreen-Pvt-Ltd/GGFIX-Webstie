# Repair Shop SaaS – Admin Web Panel

Next.js admin panel for the mobile repair SaaS platform. Super Admin features: shop management, subscription management, and **master data management** so that all dropdown values in the mobile apps are driven from backend APIs.

## Features

- **Dashboard** – Overview and quick links
- **Shop management** – Create shop, activate shop, suspend shop
- **Subscription management** – Assign plans to shops, manage expiry, view payments (and plans list)
- **Master data (CRUD)** – All values consumed by mobile app dropdowns:
  - Mobile brands (`GET /master/brands`)
  - Mobile models by brand (`GET /master/brands/:id/models`)
  - Repair services (`GET /master/repair-services`)
  - RAM options (`GET /master/ram-options`)
  - Storage options (`GET /master/storage-options`)

## Setup

```bash
cd repair-shop-admin
npm install
cp .env.local.example .env.local
# Edit .env.local: set NEXT_PUBLIC_API_BASE to your Master Data service URL (e.g. http://localhost:8091)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Login** with your auth service credentials (admin role). After login you are redirected to the dashboard.

## Environment

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_BASE` | Master Data service base URL (default `http://localhost:8091`) |
| `NEXT_PUBLIC_AUTH_BASE` | Auth service for login (default `http://localhost:8081`) |
| `NEXT_PUBLIC_SHOP_BASE` | Shop service for create/activate/suspend (default `http://localhost:8084`) |
| `NEXT_PUBLIC_SUBSCRIPTION_BASE` | Subscription service (default `http://localhost:8089`) |

## Backend

- **Master Data service** – CRUD endpoints were added so the admin can create/update/delete brands, models, repair services, RAM options, and storage options. The same service continues to expose the existing GET endpoints used by the mobile app; no hardcoded dropdown values.
- **Shop service** – Admin expects `GET /shops`, `POST /shops`, `PATCH /shops/:id/status` with body `{ "status": "ACTIVE" \| "SUSPENDED" }`. Implement or stub as needed.
- **Subscription service** – Admin expects `GET /subscriptions`, `GET /plans`, `GET /payments`, `POST /subscriptions` (assign plan), `PATCH /subscriptions/:id` (e.g. expiry). Implement or stub as needed.

## Folder structure

```
src/
├── app/
│   ├── layout.js, globals.css
│   ├── (site)/                     # public customer-facing site
│   └── management/                 # the admin portal, served at /management
│       ├── (login)/page.js         # -> /management  (login; deliberately OUTSIDE
│       │                           #    the portal group so the auth-check layout
│       │                           #    does not wrap it and bounce in a loop)
│       └── (portal)/               # everything below is auth-gated
│           ├── layout.js           # Sidebar + auth check
│           ├── dashboard/page.js   # -> /management/dashboard
│           ├── shops/page.js       # -> /management/shops (+ new, new-owner, view,
│           │                       #    edit, settings — id via ?id= query string)
│           ├── users/page.js
│           ├── subscriptions/page.js
│           ├── models/page.js      # -> /management/models  (master data is FLAT:
│           ├── brands/page.js      #    no /master segment in the URL)
│           ├── series/page.js
│           ├── repair-services/page.js
│           ├── banners/page.js     # customer-app directory (also flat)
│           ├── shop-directory/page.js
│           └── items/page.js       # marketplace

├── components/
│   ├── Sidebar.js
│   └── DataTable.js
└── lib/
    ├── api.js    # masterApi, authApi, shopApi, subscriptionApi
    └── auth.js   # getToken, setToken
```

## CORS

If the admin runs on a different origin (e.g. `http://localhost:3000`) and the backend rejects requests, enable CORS on the Master Data (and other) services for the admin origin, or proxy API calls through Next.js API routes.
