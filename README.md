# Creative Costwise

A Next.js prototype for handmade-product costing and shop setup. It includes a crafter-submitted purchase-request workflow with saved product cost snapshots, admin review, admin-only inventory, and in-app responses. Data is stored in the dedicated MongoDB database `creative_costwise` through Prisma. Other databases on the same cluster are never modified.

## Run locally

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env` and set a long, private `NEXTAUTH_SECRET`.
3. Install dependencies with `npm install`.
4. Create this app's collections with `npm run db:push`. The connection string must use the `creative_costwise` database.
5. Seed the admin and demo crafter with `npm run db:seed`.
6. Start the app with `npm run dev`.

## Purchase requests and email

Crafters create a purchase request from their saved price sets. Unsubmitted products, quantities, pricing choices, and notes are automatically saved as a draft and can also be saved explicitly. Each submitted line keeps a cost breakdown snapshot, selected retail or bulk price, quantity, and estimated totals. The form can be printed or saved as PDF from the browser's print dialog. Admins review requests under **Purchase requests**; approving one adds its product and requested quantity to the admin-only **Product inventory** module. New requests and admin responses create persistent in-app notifications and remain in each account's purchase-order history.

Email is optional. Without SMTP configuration, requests and responses still work in the website inbox and the UI reports that email was not sent. To enable email, configure these variables in the private `.env` file:

- `SMTP_SERVICE=gmail` with `SMTP_USER` and `SMTP_PASSWORD` (or `SMTP_PASS`), or `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD`
- `MAIL_FROM` or `EMAIL_FROM` (optional; defaults to `SMTP_USER`)
- `ADMIN_NOTIFICATION_EMAIL` or `INQUIRY_NOTIFY_TO` (optional; falls back to `ADMIN_EMAIL`)

A submitted purchase request emails that address with the subject "Transaction received". Admin replies email the crafter. For Gmail, use an app password rather than the account password. Never commit `.env`, `atlas-credentials.env`, or real credentials.

The seed command prints the local demo credentials. Defaults are `admin@local.test` / `admin12345` for administration and `hello@creativecostwise.local` / `craft12345` for the demo shop. Set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEMO_CRAFTER_EMAIL`, and `DEMO_CRAFTER_PASSWORD` before seeding to use different values. These defaults are for local development only and must not be used in a deployed environment.

## Current prototype scope

- Credentials sign-in, role-aware admin/crafter entry, plan expiry checks, first-login password changes, and a one-time welcome.
- Crafter purchase requests with printable cost breakdowns; admin request review, email notifications/replies when SMTP is configured, and an admin-only inventory catalog.
- Admin module tabs and sign-out, account-labeled temporary passwords, self-service password changes, and a one-tap saved theme switch.
- Logo uploads accept JPEG, PNG, and WebP, validate their content, then convert and store them as AVIF files.
- Per-crafter MongoDB records for materials, starred categories, stock movements, expenses, printers, printer supplies, print template links, costing tabs, price sets, customers, and orders. The server pings `creative_costwise` every 10 seconds while the app is running.
- Material pack cost per unit, low-stock indicators, printer color/black base costs, loss/overage/labor/packaging calculations, and suggested retail/bulk/promo/loyal prices.
- PHP/USD formatting and nine accent themes with light/dark color schemes.
- A responsive dashboard, getting-started guide, and admin-created crafter accounts.

Costing math is isolated in `src/lib/costing.ts`, image conversion in `src/lib/images.ts`, and both are tested with `npm test`. Uploaded images are stored as optimized AVIF files on disk; the database stores only each image's file path. Money is persisted in integer minor units. Every shop query is scoped to the signed-in crafter.

The supplied `DEVELOPMENT.md` remains the detailed product specification. Inventory is a record of approved request quantities and does not automatically deduct stock from sales. Order fulfillment, invoices, expense tracking, community tools, and production deployment hardening remain future phases.
