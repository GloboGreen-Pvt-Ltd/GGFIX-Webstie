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
# Edit .env.local: set NEXT_PUBLIC_MASTER_DATA_BASE to your Master Data service URL (e.g. http://localhost:8091)
npm run dev
```

Open [http://localhost:3000/management](http://localhost:3000/management) — the admin
portal login. Sign in with your auth service credentials (SUPER_ADMIN role) and you
land on `/management/dashboard`. The public customer site is at `/`.

## Deployment

Three branches, one environment each. A push deploys; there is no separate release step.

| Branch | Environment | Bucket variable | Purpose |
|---|---|---|---|
| `Preview` | `preview` | `S3_BUCKET_PREVIEW` | test |
| `Development` | `development` | `S3_BUCKET_DEVELOPMENT` | deploy-test |
| `main` | `production` | `S3_BUCKET_PRODUCTION` | LIVE |

`.github/workflows/deploy-s3.yml` resolves the branch to an environment, picks the
bucket by indexing the vars context with that name, builds the static export and
syncs it to S3. Put a required reviewer on the `production` environment so nothing
auto-ships from `main`.

Repository **variables** (shared by all three environments):

- `AWS_REGION`, `S3_BUCKET_PREVIEW`, `S3_BUCKET_DEVELOPMENT`, `S3_BUCKET_PRODUCTION`
- every `NEXT_PUBLIC_*_BASE` from the table below
- optional `CLOUDFRONT_DISTRIBUTION_PREVIEW` / `_DEVELOPMENT` / `_PRODUCTION`
- optional `NEXT_PUBLIC_BASE_PATH` (only for sub-path hosting)

AWS credentials, either one:

- set the `AWS_ROLE_TO_ASSUME` variable to an IAM role ARN trusting the GitHub OIDC
  provider (preferred — no long-lived keys), **or**
- leave it unset and add `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` as repository
  **secrets**. The workflow picks whichever is configured.

Two things that bite if missed:

- `output: 'export'` bakes `NEXT_PUBLIC_*` in at **build** time. An unset variable does
  not error — `lib/api.js` falls back to `http://localhost:*` and you ship a bundle
  that talks to nothing. The workflow fails the run up front rather than deploy that.
- The buckets have Block Public Access on and are read through CloudFront OAC, so a
  sync alone leaves the previous build live. Set the `CLOUDFRONT_DISTRIBUTION_*`
  variables or the run warns and skips invalidation.

## Environment

Every base is read as a **static** `process.env.NEXT_PUBLIC_*` literal in `src/lib/api.js`
— a dynamic lookup would not be inlined into the client bundle and would silently fall
back to localhost in the browser.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_MASTER_DATA_BASE` | Master Data service (default `http://localhost:8091`) |
| `NEXT_PUBLIC_API_BASE` | Legacy alias for the above; only used if it is unset |
| `NEXT_PUBLIC_AUTH_BASE` | Auth service for login (default `http://localhost:8081`) |
| `NEXT_PUBLIC_TICKET_BASE` | Ticket service (default `http://localhost:8082`) |
| `NEXT_PUBLIC_USER_BASE` | User service (default `http://localhost:8083`) |
| `NEXT_PUBLIC_SHOP_BASE` | Shop service for create/activate/suspend (default `http://localhost:8084`) |
| `NEXT_PUBLIC_TECHNICIAN_BASE` | Technician service (default `http://localhost:8085`) |
| `NEXT_PUBLIC_INVENTORY_BASE` | Inventory service (default `http://localhost:8086`) |
| `NEXT_PUBLIC_MARKETPLACE_BASE` | Marketplace service (default `http://localhost:8087`) |
| `NEXT_PUBLIC_PICKUP_BASE` | Pickup service (default `http://localhost:8088`) |
| `NEXT_PUBLIC_NOTIFICATION_BASE` | Notification service (default `http://localhost:8089`) |
| `NEXT_PUBLIC_SUBSCRIPTION_BASE` | Subscription service (default `http://localhost:8090`) |
| `NEXT_PUBLIC_ORDER_BASE` | Order service (default `http://localhost:8092`) |

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
