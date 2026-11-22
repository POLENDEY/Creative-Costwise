# Creative Costwise

A Next.js prototype for handmade-product costing and shop setup. The current release focuses on the account shell, shop settings, material inventory, printer ink baselines, per-piece product costing, and saved price sets. Data is stored locally in SQLite through Prisma.

## Run locally

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env` and set a long, private `NEXTAUTH_SECRET`.
3. Install dependencies with `npm install`.
4. Create the local SQLite schema with `npm run db:push`.
5. Seed the local admin and demo crafter with `npm run db:seed`.
6. Start the app with `npm run dev`.

The seed command prints the local demo credentials. Defaults are `admin@local.test` / `admin12345` for administration and `hello@creativecostwise.local` / `craft12345` for the demo shop. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_CRAFTER_EMAIL`, and `DEMO_CRAFTER_PASSWORD` before seeding to use different values. These defaults are for local development only and must not be used in a deployed environment.

## Current prototype scope

- Credentials sign-in, role-aware admin/crafter entry, plan expiry checks, first-login password changes, and a one-time welcome.
- Per-crafter SQLite records for materials, printers, costing tabs, and price sets.
- Material pack cost per unit, low-stock indicators, printer color/black base costs, loss/overage/labor/packaging calculations, and suggested retail/bulk/promo/loyal prices.
- PHP/USD formatting and nine accent themes with light/dark color schemes.
- A responsive dashboard, getting-started guide, and admin-created crafter accounts.

Costing math is isolated in `src/lib/costing.ts` and tested with `npm test`. Money is persisted in integer minor units. Every shop query is scoped to the signed-in crafter.

The supplied `DEVELOPMENT.md` remains the detailed product specification. Orders, stock deductions from delivered sales, invoices, expense tracking, community tools, image uploads, and production deployment hardening remain future phases; this prototype does not claim those workflows are implemented yet.
