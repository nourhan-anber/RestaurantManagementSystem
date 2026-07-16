# Restaurant Management System

A multi-tenant restaurant SaaS: a **Platform Admin** onboards restaurants; each restaurant's **Owner/Manager** runs its menu, tables, and staff; **Chefs** work a live kitchen display; **Servers** work the floor; and diners order from their table via a QR code.

> **Status:** migrating from a two-app demo to a single, production-grade **Next.js** application. See the migration plan and phased roadmap in the planning doc.

## Repository layout

| Path | What it is |
|------|------------|
| `web/` | **The product** — Next.js 16 (App Router, TypeScript, Tailwind). All new work happens here. |
| `backend/` | Legacy Express + PostgreSQL demo API. Reference only; retired once `web/` reaches parity. |
| `frontend/` | Legacy React + Vite demo SPA. Reference only; retired once `web/` reaches parity. |

## Tech stack (target)

- **Next.js 16** (App Router) + **TypeScript** — unified UI + API in one app
- **Prisma** ORM on **PostgreSQL**
- **Auth.js / NextAuth v5** — staff auth with role- & tenant-based access; customers order via signed per-table QR tokens
- **Roles:** `PLATFORM_ADMIN` · `OWNER` · `MANAGER` · `CHEF` · `SERVER`
- **Stripe** — restaurant subscriptions + customer payments
- **Vitest** (unit/integration, ≥90% coverage gate) + **Playwright** (e2e)

## Develop (`web/`)

```bash
cd web
cp .env.example .env.local   # fill in DATABASE_URL, AUTH_SECRET, TABLE_SECRET_KEY
npm install
npm run dev                  # http://localhost:3000
```

### Quality gates

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run coverage    # vitest run --coverage (fails under 90%)
```

## Engineering workflow

- One feature branch + PR per migration phase.
- Commit each completed feature **only after its unit tests pass**; never commit red tests.
- CI (`.github/workflows/ci.yml`) enforces typecheck, lint, and the ≥90% coverage gate on every push/PR.
