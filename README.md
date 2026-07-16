# Restaurant Management System — Mise

A multi-tenant restaurant SaaS: a **Platform Admin** onboards restaurants; each restaurant's **Owner/Manager** runs its menu, tables, and staff; **Chefs** work a live kitchen display; **Servers** work the floor; and diners order from their table via a QR code.

> **Status:** the product lives in **`web/`** (Next.js 16). The legacy two-app demo (`backend/` Express + `frontend/` Vite) is kept for reference and can be removed now that `web/` covers its functionality.

## What's built

| Area | Details |
|------|---------|
| Auth & roles | NextAuth v5 (credentials, JWT). Roles: `PLATFORM_ADMIN` · `OWNER` · `MANAGER` · `CHEF` · `SERVER`, enforced by an RBAC matrix + tenant guards |
| Multi-tenancy | Path-based `/r/[slug]`; every query scoped by `restaurantId`; cross-tenant access returns 404/zero-rows |
| Platform admin | `/admin` — create restaurants + onboard the first owner |
| Owner/Manager | Menu CRUD, tables + QR links, staff invites (chef/server), settings & billing |
| Kitchen (chef) | Live KDS (5s polling) with New / In-progress / Ready columns |
| Floor (server) | Table map + open orders + close-bill |
| Customer | QR → `/dine/[slug]/[table]?token=` menu, cart, token-authenticated ordering |
| Billing | Stripe subscriptions (checkout + webhook), status gating helpers |
| Reports | Revenue / orders / avg / items sold + top items (owner/manager) |
| Data | Prisma 7 on Postgres; table-status **triggers** + quantity CHECK preserved from the original schema |

## Tech stack

- **Next.js 16** (App Router, standalone output) + **TypeScript**
- **Prisma 7** ORM (pg driver adapter) on **PostgreSQL 17**
- **Auth.js / NextAuth v5**; per-table **HMAC QR tokens** (tenant-bound)
- **Stripe** for restaurant subscriptions
- **Tailwind v4** design system (frontend-design)
- **Vitest** unit + integration (≥90% coverage gate), Postgres-backed integration suite

## Develop (`web/`)

```bash
cd web
cp .env.example .env            # DATABASE_URL, AUTH_SECRET, TABLE_SECRET_KEY (+ STRIPE_* to enable billing)
npm install
npm run db:migrate              # apply schema (triggers + constraints)
npm run db:seed                 # Bella Vista + admin@platform.test / owner@bellavista.test
npm run dev                     # http://localhost:3000
```

Demo logins: `admin@platform.test / admin1234` (platform admin) · `owner@bellavista.test / owner1234` (owner).

### Quality gates

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run coverage         # vitest unit + ≥90% coverage gate
npm run test:integration # Postgres-backed (uses .env.test / DATABASE_URL_TEST)
```

## Deploy

The app is **host-portable**. Two supported paths:

### A) Container host (Fly.io / Render / Railway / a VPS) — `docker compose`

```bash
export AUTH_SECRET=$(openssl rand -base64 32)
export TABLE_SECRET_KEY=$(openssl rand -hex 32)
export POSTGRES_PASSWORD=change-me
docker compose up --build       # runs Postgres, applies migrations, starts the app on :3000
```

`web/Dockerfile` produces a minimal standalone image; the compose `migrate` service runs `prisma migrate deploy` before the app starts. Health probe: `GET /api/health`.

### B) Vercel + managed Postgres (Neon / Supabase)

- Set the project root to `web/`.
- Env: `DATABASE_URL` (pooled connection — Neon pooler / PgBouncer / Prisma Accelerate to avoid serverless connection exhaustion), `AUTH_SECRET`, `AUTH_URL`, `TABLE_SECRET_KEY`, and `STRIPE_*` for billing.
- Run `prisma migrate deploy` in the build/release step.
- Note: long-lived SSE isn't ideal on serverless — the KDS uses polling; upgrade to a managed realtime service (Supabase Realtime/Ably) if you want push.

### Enabling Stripe billing

Set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` (a recurring price), and `STRIPE_WEBHOOK_SECRET`, then point a Stripe webhook at `/api/webhooks/stripe` for `customer.subscription.*` events. Until configured, the billing UI shows a clear "not configured" state.

## Engineering workflow

- One feature branch + PR per migration phase (this build shipped Phases 0–10 as separate commits).
- Commit each feature **only after its unit tests pass**; never commit red tests.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, the ≥90% coverage gate, and Postgres-backed integration tests on every push/PR.
