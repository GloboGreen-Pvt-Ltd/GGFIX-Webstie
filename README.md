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
# Edit .env.local: set NEXT_PUBLIC_MASTER_DATA_BASE to your Master Data service URL (e.g. https://api.ggfix.in/master)
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

### CloudFront must rewrite directory URIs

The buckets are REST origins behind OAC, **not** S3 website endpoints, so CloudFront
does no directory-index lookup — "Default Root Object" maps only `/`. Since
`trailingSlash: true` exports `management/index.html`, a request for `/management/`
asks S3 for the key `management/`, gets a 404, and the custom error response serves
`/index.html` with **status 200**. Every route then renders the home page and the
failure looks like a routing bug in the app.

Fix, per distribution:

1. Create a CloudFront Function from [`infra/cloudfront-rewrite-index.js`](infra/cloudfront-rewrite-index.js),
   publish it, and attach it to the default behavior as **Viewer Request**.
2. Change the custom error response from `404 -> /index.html (200)` to
   `404 -> /404.html` returning **404**. The 200 fallback masks every missing page
   and makes bad URLs look valid.

Verify with `curl -I https://<host>/management/` — the `ETag` must differ from
`curl -I https://<host>/`. Identical ETags mean the fallback is still swallowing it.

### One distribution per environment

`preview`, `deploy`, `ggfix.in` and `www` must each resolve to their **own**
distribution whose origin is that environment's bucket. If several hostnames alias
the same distribution they all serve one bucket, and the three-bucket split does
nothing — a preview deploy either does not show up, or overwrites production.

Two more things that bite if missed:

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

> **Every base ends with its `/<service>` segment — except master-data, which is the
> bare host.** e.g. `NEXT_PUBLIC_AUTH_BASE=https://api.ggfix.in/auth` but
> `NEXT_PUBLIC_MASTER_DATA_BASE=https://api.ggfix.in`.
>
> `src/lib/api.js` already prefixes every call with the service name. For most
> services the name therefore appears **twice** in the wire URL, and that is correct:
> the nginx edge uses a trailing-slash `proxy_pass`
> (`location /auth/ { proxy_pass http://127.0.0.1:8081/; }`), which **strips** the
> first segment before forwarding. One copy is consumed by nginx for routing, the
> other is what the Spring controller is mapped on.
>
> master-data-service is special-cased at the edge so its public path stays clean —
> `location /master/ { proxy_pass http://127.0.0.1:8091/master/; }` keeps the segment
> instead of eating it. Its base is therefore the bare host, and `/master` appears
> once. Media is the wrinkle: the controller is `@RequestMapping("/media")` but the
> edge only exposes it under `/master/media/`, so uploads go through
> `MEDIA_UPLOAD_URL()` in `src/lib/api.js` rather than being spelled out at each
> call site.
>
> Verified against the live edge (nginx/1.30.3) on 2026-08-04:
>
> | Request | Result |
> |---|---|
> | `/master/brands` | 200, JSON — clean, preferred |
> | `/master/master/brands` | 200 — legacy shape, still routed for shipped APKs |
> | `/master/media/ping` | 200 |
> | `/media/ping` | 404 — media exists only under the `/master` prefix |
> | `/auth/auth/shop-owners` | 200, JSON |
> | `POST /auth/auth/login` | 400 — endpoint exists |
>
> Dropping a non-master suffix makes those calls 404. `api.js` normalises the master
> base, stripping a stray trailing `/master`, so an un-updated deploy variable still
> resolves correctly. Note all of this is the opposite of talking to a service
> directly by port (`http://host:8091/master/colors`), where the path is preserved
> and no suffix belongs in the base. Confirm with a curl against whatever edge you
> point at before setting these — under a misconfigured edge a failure can surface in
> the browser as an opaque CORS/`ERR_FAILED` rather than a 404, because the error
> response carries no `Access-Control-Allow-Origin` header.

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_MASTER_DATA_BASE` | Master Data service — **bare host**, no `/master` suffix (default `https://api.ggfix.in`) |
| `NEXT_PUBLIC_API_BASE` | Legacy alias for the above; only used if it is unset |
| `NEXT_PUBLIC_AUTH_BASE` | Auth service for login (default `https://api.ggfix.in/auth`) |
| `NEXT_PUBLIC_TICKET_BASE` | Ticket service (default `https://api.ggfix.in/ticket`) |
| `NEXT_PUBLIC_USER_BASE` | User service (default `https://api.ggfix.in/user`) |
| `NEXT_PUBLIC_SHOP_BASE` | Shop service for create/activate/suspend (default `https://api.ggfix.in/shop`) |
| `NEXT_PUBLIC_TECHNICIAN_BASE` | Technician service (default `https://api.ggfix.in/technician`) |
| `NEXT_PUBLIC_INVENTORY_BASE` | Inventory service (default `https://api.ggfix.in/inventory`) |
| `NEXT_PUBLIC_MARKETPLACE_BASE` | Marketplace service (default `https://api.ggfix.in/marketplace`) |
| `NEXT_PUBLIC_PICKUP_BASE` | Pickup service (default `https://api.ggfix.in/pickup`) |
| `NEXT_PUBLIC_NOTIFICATION_BASE` | Notification service (default `https://api.ggfix.in/notification`) |
| `NEXT_PUBLIC_SUBSCRIPTION_BASE` | Subscription service (default `https://api.ggfix.in/subscription`) |
| `NEXT_PUBLIC_ORDER_BASE` | Order service (default `https://api.ggfix.in/order`) |

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
