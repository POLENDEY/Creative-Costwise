# Architecture

Creative Costwise is a Next.js App Router application.

- `src/app/(shop)` is the crafter workspace. `src/app/admin` is the provider console for accounts, stock the provider sells, and purchase orders crafters submit.
- `src/lib/session.ts` loads the JWT session and exposes `requireCrafter` and the admin guard. Server actions and pages take the user id from that session.
- `src/lib/prisma.ts` is the only database client. It checks the database name, caches reads for 20 seconds, and drops that cache when a write or transaction finishes.
- `src/lib/costing.ts` and `src/lib/money.ts` are the shared calculation modules. UI components call these instead of reimplementing prices.
- `src/lib/inventory.ts` owns the restock rule: the entered number becomes the new on-hand quantity.
- Email for a submitted purchase order goes out through `src/lib/purchase-order-email.ts`.

Customer orders, invoices, and the finance ledger are not separate services. When they are added they should use the same Prisma client, the same user id filter, and the same money helpers.
