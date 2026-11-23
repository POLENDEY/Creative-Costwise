# Repository audit

Audit date: 23 November 2026. This describes the application as it exists in this repository. It is the Phase 0 baseline for `CREATIVE_COSTWISE_CURSOR_IMPLEMENTATION_GUIDE.md`.

## Stack

- Next.js 15 App Router, TypeScript, Tailwind CSS v4.
- Auth.js credentials sessions stored as JWTs. There is no self-service signup.
- Prisma 6 with the MongoDB provider. The only application database is `creative_costwise` on the shared Atlas cluster. `src/lib/project-database.ts` refuses `depth_dot`, `sample_mflix`, `admin`, `local`, and `config`.
- Money is stored as integer minor units. Quantities and percents are floats because Prisma MongoDB has no decimal type.
- Zod validates server-action input. Vitest covers costing, money, passwords, and the restock quantity rule.
- Uploaded logos are files under `public/uploads/{userId}/`. The database stores the path.
- A dev-server keepalive pings Atlas every 10 seconds. Prisma reads are cached in memory for 20 seconds and the cache is cleared on writes, including after `$transaction`.

## Roles

- Crafter: shop workspace under `src/app/(shop)`.
- Platform admin: `src/app/admin` for users, admin inventory, and purchase orders sent by crafters.
- Membership expiry redirects the crafter to `/account-expired`. That behavior already existed and is kept. The guide still lists the long-term expiry policy as unconfirmed (C-02).

## What already worked before this pass

| Area | Where | Notes |
| --- | --- | --- |
| Sign-in, password change, disabled and expired accounts | `src/lib/auth.ts`, `src/app/login` | Admin-provisioned accounts only |
| Business settings, currency, theme, logo, payment details | `src/actions/shop.ts`, settings page | One shop per user |
| Setup checklist | `src/lib/checklist.ts` | Twelve step ids. Completion is a manual toggle. Which action should auto-complete each step is C-22 |
| Materials | materials page, `Material` | Pack price, unit cost, stock, low-stock flag, supplier URL |
| Print hub printers | print hub page, `Printer` | Ink price and page yield. Cost multipliers in `src/lib/costing.ts` are provisional |
| Costing projects and price sets | costing and prices pages | Several print lines per project. Price sets snapshot a sellable price |
| Crafter purchase requests | purchase-orders pages | Emails “Transaction received” through Gmail SMTP. This is separate from a customer order board |
| Admin inventory and notifications | admin pages, `Notification` | Kept. The guide says not to replace this with a new admin console |

## Database conflict

`DEVELOPMENT.md` still describes SQLite. The running app uses MongoDB. This audit follows the live Prisma schema and the implementation guide: do not switch the database.

## Not in the product yet

Invoices and receipts, the sales and expense ledger UI, the calendar, and the annual community page are not built yet. Order-time inventory deduction stays unimplemented until C-09, C-10, and C-11 are decided. Customers, orders, bundles, promotions, and digital products are in the shop.
