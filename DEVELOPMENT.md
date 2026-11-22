# Crafters Toolkit — development spec

Build a multi-tenant web app in Next.js. One business owner (the admin) sells access to the toolkit. Each paying crafter gets a login that expires with their plan. Inside that login, the crafter runs a handmade-goods shop: materials, printing costs, product prices, orders, invoices, and profit.

This file is the source of truth for implementation. The walkthrough video and `Transcript-from-youtube.pdf` describe the crafter's shop. The client added the admin layer: create a user, grant access, and expire that access from the plan.

Where the walkthrough never states a number, this spec gives a **seed default** and says so. Do not treat seed defaults as quotes from the video.

## How to build

- Use the Next.js App Router and TypeScript.
- Keep money math in one pure module, `src/lib/costing.ts`, with no database imports. Test that file first.
- Every shop row belongs to one crafter `userId`. Never list one crafter's materials, orders, or customers to another crafter.
- The admin manages logins. The admin does not edit a crafter's shop data.
- Ship the phases at the bottom in order. Each phase should run with `npm run dev`.

## Stack

Lock these choices. Do not swap them for another framework, ORM, or auth library.

| Piece | Choice |
| --- | --- |
| App | Next.js App Router, TypeScript, React |
| Style | Tailwind CSS. Themes are CSS variables, not a component library. |
| Data | Prisma. SQLite file `prisma/dev.db` for local development. |
| Auth | Auth.js Credentials. Email + password. Session strategy `jwt`. Passwords hashed with bcrypt. |
| Validation | Zod on every server action. |
| Dates | `date-fns` |
| Drag and drop | `@dnd-kit/core` for the order board on wide screens |
| Money | Integer minor units. PHP and USD both use 2 decimal places, so ?10.00 is `1000`. Never store money as `number` float. |
| Quantities | Decimal. A sheet count can be fractional. |
| Uploads | Save under `public/uploads/{userId}/`. Serve as normal static files. |
| Email | Optional. If `SMTP_HOST` is missing, still create the user and show the temporary password on the admin screen. |

Scripts the app needs:

- `npm run dev`
- `npm run test` — Vitest, at least for `src/lib/costing.ts`
- `npx prisma db push`
- `npm run db:seed`

Do not add a payment gateway. The admin creates accounts by hand after the crafter has paid outside the app.

## Actors

**Admin.** One or more platform staff. Creates crafter logins, sets the plan, sets the expiry, and can renew or disable a login. Can publish the community links that annual members see.

**Crafter.** The subscriber. Owns one shop: settings, materials, printers, prices, customers, orders, documents, and finance.

**Crafter's customer.** Not a login. A record the crafter saves (name, phone, email, address, notes) and reuses on orders and documents.

There is a second, different subscription inside the shop. That one is a plan the crafter sells to their own customer (a monthly template club, a coaching package). It is not the login that unlocks the toolkit.

## Plans and access

Plans:

| Plan | Length | Community |
| --- | --- | --- |
| `quarterly` | 3 calendar months | No |
| `annual` | 1 calendar year | Yes, until expiry |

The video names both plans and says annual members get one year of the Crafters Community. It does not say the quarterly length in days. **3 calendar months is the rule for this build.** Add the length with `date-fns` `addMonths(start, 3)` or `addYears(start, 1)`.

When the admin creates a user:

1. Require name, email, and plan.
2. Generate a temporary password. Show it once on the success screen. Hash it before saving.
3. Set `mustChangePassword` to true.
4. Set `expiresAt` to the plan length after now.
5. If SMTP is configured, also email the address and the temporary password. The screen still shows the password if sending fails.

Renewal:

- New expiry = plan length after the later of `now` and the current `expiresAt`.
- Switching a live annual user to quarterly removes community access on the next page load.
- Switching to annual turns community access on immediately and does not shorten `expiresAt`.

Expiry behavior:

- Before `expiresAt`, the crafter uses the whole shop.
- After `expiresAt`, the crafter can still sign in, but every shop route redirects to `/account-expired`.
- `/account-expired` explains that the plan has ended and shows the expiry date. It has no shop data and no way to pay inside the app.
- Their rows stay in the database. Orders, stock counts, and finance records are still there when an admin renews the login.
- A disabled user (`disabledAt` set) is signed out and cannot sign in. Disabling is separate from expiry.

First sign-in:

- Force a password change before the dashboard.
- Show a welcome dialog once. Store `welcomedAt` so it does not show again.

## Global shop settings

One `ShopSettings` row per crafter.

| Field | Rule |
| --- | --- |
| `currency` | `PHP` or `USD`. Format every amount in this currency. Do not convert PHP to USD. |
| `theme` | `pink` (default), `purple`, `green`, `blue`, `red`, `beige`, `orange`, `gray`, `black` |
| `colorScheme` | `light` or `dark` |
| `logoPath` | Optional image. Used in the header and on invoices and receipts. |
| `businessName`, `businessAddress`, `businessPhone`, `businessEmail` | Printed on documents. |
| `paymentAccountName`, `bankDetails`, `gcashNumber` | Printed in the payment block. All optional. |
| `defaultLossPercent` | Seed `3`. The video's default. |
| `defaultOperationalFeeMinor` | Seed `1000` when currency is PHP (?10). Seed `0` when currency is USD. The crafter types over this per product. |
| `defaultLaborPercent` | Seed `100`. The video's suggested default. |
| `markupRetailPercent` | Seed `100` |
| `markupBulkPercent` | Seed `50` |
| `markupPromoPercent` | Seed `30` |
| `markupLoyalPercent` | Seed `40` |
| `masterSheetUrl` | Optional URL. The app only stores and opens it. |
| `checklist` | JSON map of step id ? completed at. See Checklist. |

Markup seeds are **not** from the video. The video says the defaults can be changed and does not read the numbers. Loss, the ?10 fee, and 100% labor are from the video.

Theme colors, light mode, as the primary button and accent:

| Theme | Accent |
| --- | --- |
| pink | `#BE185D` |
| purple | `#7E22CE` |
| green | `#15803D` |
| blue | `#1D4ED8` |
| red | `#B91C1C` |
| beige | `#92400E` |
| orange | `#C2410C` |
| gray | `#334155` |
| black | `#171717` |

Dark mode keeps the same accent and uses a near-black background (`#121212`) with light text. Put the choice on `document.documentElement` as `data-theme` and `data-scheme`.

## Images

Accept JPEG, PNG, and WebP. Reject anything else. Max file size 2 MB.

Required:

- Business logo in settings.
- The same logo can be turned on or off per invoice and per receipt.

Also allow one optional image on a material and one optional image on a price set. The video itself only shows the logo. The client asked for image upload, so these two extra slots are in scope. Do not build a gallery, cropping tool, or image editor.

## Checklist

The video says the quarterly plan has 11 setup steps and the annual plan adds a community step. It only names some of the titles, then continues through the tools. Use this list for this build. Do not invent extra official titles.

| Id | Label | Who sees it |
| --- | --- | --- |
| `personalize` | Personalize the toolkit | Everyone |
| `guide` | Read the welcome guide and FAQs | Everyone |
| `materials` | Add materials | Everyone |
| `print-hub` | Set up Print hub | Everyone |
| `costing` | Cost a product | Everyone |
| `prices` | Save a price | Everyone |
| `customer` | Add a customer | Everyone |
| `order` | Create an order | Everyone |
| `document` | Make an invoice or receipt | Everyone |
| `finance` | Review sales and finance | Everyone |
| `calendar` | Open the calendar | Everyone |
| `community` | Join the community | Annual only |

The crafter marks a step done by hand. Completing real work does not auto-check the box, except: saving settings can check `personalize` if a currency and a theme are set. Keep that as the only auto-check.

The guide and FAQ are static pages in the app (`/guide`). They stay available after the box is checked. Write a short guide that explains materials, costing, orders, and finance in plain language. Do not copy the YouTube transcript into the page.

## Routes

Crafter routes require a crafter session and a live plan. Admin routes require an admin session.

| Route | Screen |
| --- | --- |
| `/login` | Email and password |
| `/change-password` | Required when `mustChangePassword` is true |
| `/account-expired` | Locked shop |
| `/dashboard` | Totals, this week, low stock, checklist |
| `/settings` | Currency, theme, dark mode, logo, business details, payment details, master-sheet URL |
| `/guide` | Welcome guide and FAQ |
| `/materials` | Library, starred categories, search |
| `/materials/new`, `/materials/[id]` | Create and edit, plus restock |
| `/print-hub` | Printers, supplies, template links |
| `/costing` | List of costing tabs |
| `/costing/[id]` | Calculator and price sets for one product |
| `/prices` | Physical price list by category |
| `/prices/bundles` | Bundle builder |
| `/prices/digital` | Digital templates |
| `/promos` | Discount calculator and saved promo notes |
| `/customers` | Customer list |
| `/orders` | Board |
| `/orders/[id]` | Order editor |
| `/calendar` | Month view |
| `/documents` | List of invoices and receipts |
| `/documents/new?type=invoice` and `?type=receipt` | Editor |
| `/documents/[id]` | Preview, print, PNG |
| `/finance` | Range totals, sales log |
| `/finance/expenses` | Expense list and form |
| `/finance/subscriptions` | Memberships the crafter sells |
| `/resources/community` | Annual only. Quarterly users see a short locked message. |
| `/admin/users` | Crafter accounts |
| `/admin/users/new` | Create login |
| `/admin/community` | Links and template posts shown to annual members |

## Dashboard

Top row, for the selected range. Default range is this month. Also offer this week and the last 7 days.

- Product revenue
- Subscription earnings
- Expenses
- Net profit
- Current orders (count of orders whose stage is not `done`)

Below that:

- Pending orders due in the next 7 days
- Top products (up to 5 price sets or bundles by quantity on delivered orders in the range)
- Inventory summary: count of materials, and up to 5 that are at or under their low-stock alert
- Checklist progress

An order is pending when its stage is `inquiry`, `quoted`, `in_production`, or `ready`, and its due date falls in the next 7 days.

## Materials and inventory

A material has:

- name
- category (create or pick)
- pieces per pack (decimal, greater than 0)
- price per pack (minor units, 0 or more)
- optional specs: GSM, thickness, size note
- finish: `matte`, `glossy`, `satin`, or `other` plus a short label
- unit label (sheet, piece, meter, and so on)
- quantity on hand
- optional low-stock alert
- optional supplier URL
- optional image

**Cost per piece** is always computed:

```
costPerPieceMinor = round(pricePerPackMinor / piecesPerPack)
```

Round half up to the nearest minor unit.

The library shows up to five starred categories as the default chips. Other categories are in a dropdown. Search filters by name.

Opening a material shows the saved fields, the cost per piece, and the quantity on hand.

### Stock rules

- Saving a new material stores the entered quantity as the starting on-hand amount.
- When an order line is saved for a price set, deduct that price set's materials. See Orders.
- Digital products do not deduct stock.
- Low stock means `quantityOnHand <= lowStockAlert` when the alert is set. Show those materials on the material page and on the dashboard.
- Restock replaces the on-hand quantity with the new total the crafter types. It does not add to the old number. The video says the new total becomes the starting point for later deductions.
- Restock then requires an expense: amount, payment method, optional note. Saving the restock and the expense is one action. The expense category is `packaging_supplies` unless the crafter picks another.

## Print hub

### Printer

- name
- ink type: `dye`, `sublimation`, or `pigment`
- color ink price (minor units)
- color page yield (number of pages, greater than 0)
- black ink price (minor units)
- black page yield (greater than 0)

```
colorCostPerSheetMinor = round(colorInkPriceMinor / colorPageYield)
blackCostPerSheetMinor = round(blackInkPriceMinor / blackPageYield)
```

Show both on the printer card and label them as the base cost. The product calculator applies size, quality, and coverage on top.

### Supplies

A supply is a printer-related item that is not a shop material: ink, a maintenance box, print-head cleaner.

- name
- optional supplier URL
- last price (minor units)

Actions: open the supplier URL, and log a purchase. Logging a purchase writes an expense with today's date, category `tools_equipment`, the supply name as the description, and the amount. The crafter picks the payment method before saving. Payment methods: `cash`, `gcash`, `bank`, `card`, `other`.

### Templates

- name
- URL (Canva or Google Drive)
- optional note

The order screen can list these links. The app does not open Canva's API and does not store the design file. The crafter opens the URL, edits there, and prints outside the app.

## Product costing

A costing tab is one product, such as "A5 notebook". It has a name, material lines, printing lines, adjustments, and one or more price sets.

### Material line

- material id
- units used (how much of that material this batch consumes)
- finished pieces (how many sellable items that amount produces, greater than 0)

Show the material's quantity on hand and its cost per piece. Do not block the line when stock is short. Show a warning instead.

```
lineCostMinor = round(costPerPieceMinor * unitsUsed)
perPieceMinor = round(lineCostMinor / finishedPieces)
```

The material cost for one finished item is the sum of `perPieceMinor` across material lines.

If two lines have different `finishedPieces`, still sum the per-piece costs. The usual case is the same finished-piece count on every line. The form should default every new line to the first line's finished-piece count.

### Printing line

- printer id
- paper size: `A4`, `A5`, `A3`, `LETTER`, `LEGAL`
- quality: `draft`, `standard`, `best`
- coverage: `black_white`, `light_color`, `normal_color`, `photo_heavy`
- sheet count (greater than 0)
- finished pieces (same meaning as on a material line)

Seed multipliers. Store them in a `CostingDefaults` table with a single row so an admin can edit them later without a code change. These numbers are **not** from the video. The video shows that multipliers exist and does not read them out.

| Paper size | Multiplier |
| --- | --- |
| A5 | 0.5 |
| A4 | 1 |
| LETTER | 1 |
| LEGAL | 1.2 |
| A3 | 2 |

| Quality | Multiplier |
| --- | --- |
| draft | 0.6 |
| standard | 1 |
| best | 1.5 |

| Coverage | Multiplier | Ink used |
| --- | --- | --- |
| black_white | 0.4 | black cost per sheet |
| light_color | 0.8 | color cost per sheet |
| normal_color | 1 | color cost per sheet |
| photo_heavy | 1.8 | color cost per sheet |

```
base = blackCostPerSheetMinor when coverage is black_white, otherwise colorCostPerSheetMinor
costPerSheetMinor = round(base * sizeMultiplier * qualityMultiplier * coverageMultiplier)
lineCostMinor = round(costPerSheetMinor * sheetCount)
perPieceMinor = round(lineCostMinor / finishedPieces)
```

Printing cost for one finished item is the sum of those per-piece costs. A product can have several printing lines (covers and inserts).

Show the three multipliers beside the line. A small info button can explain: size scales the sheet, quality scales ink use, coverage picks black or color ink and scales how heavy the print is.

### Adjustments

All of these are per finished item, after the per-piece material and printing costs are known.

```
directMinor = materialPerPieceMinor + printingPerPieceMinor
overageMinor = round(directMinor * overagePercent / 100)
afterOverage = directMinor + overageMinor
lossMinor = round(afterOverage * lossPercent / 100)
adjustedMinor = afterOverage + lossMinor + operationalFeeMinor
laborMinor = round(adjustedMinor * laborPercent / 100)
productionCostMinor = adjustedMinor + laborMinor
```

| Input | Default on a new tab | Meaning |
| --- | --- | --- |
| Overage percent | 0 | Optional extra for setup and cutting. The video has no default number. |
| Loss percent | Shop `defaultLossPercent` (3) | Misprints and damaged pieces. The crafter can set 0. |
| Operational fee | Shop default (?10 for PHP) | A typed amount for electricity, machine time, and wear. Do not calculate watts. |
| Labor percent | Shop `defaultLaborPercent` (100) | 100 means labor equals the adjusted cost, so the production cost is double the adjusted cost before markup. |

Suggested prices, from the four shop markup percents:

```
priceMinor = round(productionCostMinor * (1 + markupPercent / 100))
profitMinor = priceMinor - productionCostMinor
```

Show retail, bulk, promo, and loyal. The percents on the tab start from shop settings and can be changed for that tab without changing the shop defaults.

Packaging is another costing tab (boxes, tape, fillers, labels). The crafter can add one saved price set's production cost into this tab as an extra fixed amount, `packagingCostMinor`. Add it after labor:

```
productionCostMinor = adjustedMinor + laborMinor + packagingCostMinor
```

`packagingCostMinor` defaults to 0.

### Worked check

Use this in `src/lib/costing.test.ts`.

- Material cost per finished piece: 5000 (?50.00)
- Printing cost per finished piece: 2000 (?20.00)
- Overage 0, loss 3, operational fee 1000, labor 100, packaging 0

```
direct = 7000
overage = 0
loss = round(7000 * 0.03) = 210
adjusted = 7000 + 210 + 1000 = 8210
labor = 8210
production = 16420
```

Retail at 100% markup = 32840. Profit = 16420.

A 10% discount on a ?300.00 price (30000) is 27000. That is the video's promo example.

## Price sets, bundles, promos, digital products

### Price set

A named variation inside one costing tab. Examples from the video: "80 page matte notebook" and "80 page glitter notebook".

- name
- category (create or pick a product category)
- retail price and bulk price, typed by the crafter (minor units)
- production cost, stored when they save, recomputed when they save again
- the material lines that this variation uses
- optional image

The production cost is recomputed from those material lines plus the parent tab's printing lines, adjustments, and packaging amount. Changing matte film to glitter film and saving recalculates the stored production cost.

The physical price list groups price sets by category.

### Bundle

- name
- lines: a price set or a digital product, plus quantity
- bundle price, typed by the crafter

```
regularMinor = sum(itemSellingMinor * qty)
productionMinor = sum(itemProductionMinor * qty)
savingsMinor = regularMinor - bundlePriceMinor
profitMinor = bundlePriceMinor - productionMinor
```

`itemSellingMinor` is the price set's retail price, or the digital product's price. A digital product's production cost is 0.

Show all four numbers before saving. The video's example, for a test comment rather than a hard-coded product: items totaling 34500, production about 24400, bundle price 30000, savings 4500, profit 5600 if production is exactly 24400. The spoken profit was "around 55" because the production cost was approximate. Trust the formula.

Saving a bundle puts it on the physical price list under a category named `Bundles` if the crafter does not pick one.

### Promo calculator

A planner, not an automatic storefront.

- original price
- mode `percent` or `fixed`
- value

```
percent: saleMinor = round(originalMinor * (1 - value / 100))
fixed:   saleMinor = originalMinor - valueMinor
```

Reject a percent outside 0–100. Reject a fixed discount larger than the original price. `saleMinor` cannot go below 0.

The crafter can save a note: title, mode, value, optional code, optional note. On an order, picking a saved promo fills the order discount. It does not create a public coupon system.

### Digital product

- name
- price
- URL
- optional note

The list has a Copy button that copies the URL.

## Customers

Fields: name, phone, email, mailing address, notes. All except name are optional.

Deleting a customer does not delete their orders. Orders keep a snapshot of the name, phone, email, and address.

## Orders

Stages, in this order only:

1. `inquiry`
2. `quoted`
3. `in_production`
4. `ready`
5. `delivered`
6. `done`

The board is columns of those stages. On a viewport at least 768px wide, drag a card between columns. Below that, each card has a stage select. Both paths call the same server action.

Creating an order:

- Pick a saved customer, or type the details.
- Picking a saved customer copies name, phone, email, and address into the order.
- Add lines. A line is either one price set or one bundle.
- Pricing option for a price set: `retail` or `bulk`. The unit price fills from that price. The crafter may then type over it.
- A bundle line uses the bundle price. Quantity defaults to 1.
- Also: due date, follow-up date, discount (minor units, default 0), delivery method (`pickup`, `courier`, `meetup`, `digital`), shipping fee (default 0), payment status, stage (default `inquiry`).

Payment status: `unpaid`, `deposit`, `paid`.

```
linesTotal = sum(unitPriceMinor * qty)
orderTotal = linesTotal - discountMinor + shippingMinor
```

Reject a discount larger than `linesTotal`. Reject a negative shipping fee.

If any line's price set name or note, or a typed order note, is non-empty, that is not the personalization check. Personalization is an explicit checkbox on the order: "Item has the customer's name or photo". When that box is checked and they move the stage to `in_production` while payment status is `unpaid`, show a confirm dialog: the walkthrough recommends a 50% deposit or full payment first. If they confirm, save the move. Do not hard-block it.

### Stock and sales side effects

On create, and whenever lines change:

- Snapshot each price set's `productionCostMinor` onto the line as `unitCostMinor`. Later edits to the costing tab must not change old orders.
- For a bundle line, snapshot the bundle's production cost the same way, and deduct each included price set's materials times the bundle quantity times the order quantity.
- Deduct stock by the delta from the last saved lines. Increasing quantity deducts more. Decreasing quantity puts stock back. Removing a line puts its stock back.
- Digital products inside a bundle do not deduct stock.

When the stage changes to `delivered` and there is not already a sale for this order, create one sale:

- kind `product`
- date today
- amount `orderTotal`
- cost = sum of `unitCostMinor * qty` on the lines
- link `orderId`

If the stage moves away from `delivered` or `done` back to an earlier stage, delete that sale. Moving between `delivered` and `done` keeps the sale.

Deleting an order puts the stock back and deletes its sale. Cards in `done` stay on the board in a collapsed Done column so the crafter can open them and use Reorder.

Reorder creates a new order in `inquiry`, copies the customer snapshot and the lines, clears payment status to `unpaid`, and does not copy the sale. Stock is deducted again for the new order.

## Invoices and receipts

One document model with `type` of `invoice` or `receipt`.

- currency snapshot (the shop currency at save time)
- optional logo (default on if the shop has a logo)
- customer snapshot, from a saved customer or typed
- lines: description, quantity, unit price. Add from a price set, a bundle, or a digital product, or type a free line.
- payment status, fulfillment note, shipping fee, courier, discount, terms, notes
- optional tax label (text) and VAT percent

```
net = sum(qty * unitPrice) - discount + shipping
vat = round(net * vatPercent / 100) when vatPercent is set, else 0
total = net + vat
```

VAT is off unless the crafter turns it on. The video calls the tax label and VAT rate optional.

The payment block prints the shop's account name, bank details, and GCash number when those settings exist.

Preview page actions:

- Print, using a print stylesheet and `window.print`
- Download PNG, using a client-side render of the preview node
- Download PDF is the print dialog. Do not add a paid PDF API.

A document does not deduct stock and does not create a sale. The order does that. The crafter may build a document from an order (button on the order) which copies the customer, the lines, the discount, and the shipping fee.

## Sales and finance

Range filter: this week (Monday–Sunday in the shop's local timezone, Asia/Manila), last 7 days including today, and this month.

| Figure | Source |
| --- | --- |
| Product revenue | Sum of `product` sales in the range |
| Subscription earnings | Sum of `subscription` sales in the range |
| Cost of goods | Sum of `costMinor` on `product` sales in the range |
| Expenses | Sum of expense occurrences whose date falls in the range |
| Net profit | Product revenue + subscription earnings ? cost of goods ? expenses |

Show the profit breakdown with those five numbers, the top products, and the latest 8 expenses.

### Sales log

A sale is either `product` (created from a delivered order) or `subscription` (created when the crafter records a membership payment) or `digital` (created when they mark a digital-product order delivered; those orders are still `product` sales if they were ordered on the board). Keep digital sales inside `product` sales. The log can label a line digital when every order line is a digital product. Do not make a third kind unless the order has no production cost.

### Memberships the crafter sells

Fields: customer (optional), name, amount, interval (`weekly`, `monthly`, `yearly`), started on, ends on, note.

The dashboard and a banner on `/finance/subscriptions` list memberships whose `endsOn` is within the next 7 days, or earlier and not marked renewed.

"Record payment" creates a `subscription` sale for the amount, dated today, and moves `endsOn` forward by one interval.

This screen is not the admin plan. Label the page "Customer memberships".

### Expenses

- amount
- date
- frequency: `once`, `daily`, `weekly`, `monthly`, `yearly`
- category: `advertising`, `packaging_supplies`, `tools_equipment`, `shipping`, `subscriptions`, or a crafter-created category name
- payment method
- description
- note

Occurrences inside a range:

- `once`: include the row when its date is inside the range
- `daily`: one amount for each day from the start date through the range end, counting only days inside the range
- `weekly`: every 7 days from the start date
- `monthly`: the same day of month, or the last day when the month is shorter
- `yearly`: the same month and day each year

Cap the expansion at 366 occurrences so a daily expense cannot loop forever. The range pickers are at most one month, so this cap is only a guard.

Expenses created from restock and from Print hub supplies use this same table.

## Calendar

The calendar reads the same order rows. It is not a sync job.

- An order with a due date appears on that date. An order with no due date does not appear.
- A card is crossed out when the stage is `delivered` or `done`, or when payment status is `paid`.
- Editing the due date or stage on the calendar saves the order. The board shows the change.
- Deleting an order on the board removes it from the calendar.
- "New order" on the calendar opens the same create action, with the due date set to the clicked day.
- "New entry" creates a reminder: title, date, optional note. Reminders are not orders and do not affect stock or sales.

## Master sheet

`ShopSettings.masterSheetUrl`. The settings page and a small link under the calendar open it in a new tab. Nothing is imported or exported.

## Community

Annual crafters, while the plan is live, can open `/resources/community`.

Show:

- the Facebook group URL and the community page URL from admin settings
- a sentence telling them to use the same email as their toolkit login
- a list of template posts the admin published (title, note, URL)
- a wishlist form: title and note. The admin sees the list on `/admin/community` and can mark one done.

Quarterly crafters see: "The community is part of the annual plan." No form.

There is no Facebook API.

## Admin screens

`/admin/users` table: name, email, plan, expires at, status (`active`, `expired`, `disabled`).

Create form: name, email, plan. On success, show the temporary password in a dialog and a copy button.

Row actions: renew, change plan, disable, enable. Renew and change plan follow the rules in Plans and access.

`/admin/community`: edit the two URLs, add or remove template posts, read the wishlist.

Seed an admin from env:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

If the env is missing, the seed script uses `admin@local.test` / `admin12345` and prints that in the terminal. Tell the developer to change it. Do not use that password in a deployed site.

## Data model

Use Prisma. Names below are the models to create. Add `id` (cuid), `createdAt`, and `updatedAt` on every model unless the row is a pure join.

```prisma
model User {
  id                 String    @id @default(cuid())
  name               String
  email              String    @unique
  passwordHash       String
  role               String    // "admin" | "crafter"
  plan               String?   // "quarterly" | "annual"
  expiresAt          DateTime?
  disabledAt         DateTime?
  mustChangePassword Boolean   @default(false)
  welcomedAt         DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

model ShopSettings {
  userId                      String   @id
  currency                    String   @default("PHP")
  theme                       String   @default("pink")
  colorScheme                 String   @default("light")
  logoPath                    String?
  businessName                String   @default("")
  businessAddress             String   @default("")
  businessPhone               String   @default("")
  businessEmail               String   @default("")
  paymentAccountName          String   @default("")
  bankDetails                 String   @default("")
  gcashNumber                 String   @default("")
  defaultLossPercent          Decimal  @default(3)
  defaultOperationalFeeMinor  Int      @default(1000)
  defaultLaborPercent         Decimal  @default(100)
  markupRetailPercent         Decimal  @default(100)
  markupBulkPercent           Decimal  @default(50)
  markupPromoPercent          Decimal  @default(30)
  markupLoyalPercent          Decimal  @default(40)
  masterSheetUrl              String   @default("")
  checklistJson               String   @default("{}")
  user                        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Category {
  id        String
  userId    String
  name      String
  kind      String // "material" | "product"
  starred   Boolean @default(false)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Material {
  id               String
  userId           String
  categoryId       String
  name             String
  piecesPerPack    Decimal
  pricePerPackMinor Int
  gsm              String   @default("")
  thickness        String   @default("")
  sizeNote         String   @default("")
  finish           String   @default("matte")
  finishOther      String   @default("")
  unitLabel        String   @default("piece")
  quantityOnHand   Decimal  @default(0)
  lowStockAlert    Decimal?
  supplierUrl      String   @default("")
  imagePath        String?
}

model Printer {
  id                  String
  userId              String
  name                String
  inkType             String
  colorInkPriceMinor  Int
  colorPageYield      Decimal
  blackInkPriceMinor  Int
  blackPageYield      Decimal
}

model PrinterSupply {
  id             String
  userId         String
  name           String
  supplierUrl    String @default("")
  lastPriceMinor Int    @default(0)
}

model PrintTemplate {
  id     String
  userId String
  name   String
  url    String
  note   String @default("")
}

model CostingTab {
  id                    String
  userId                String
  name                  String
  overagePercent        Decimal @default(0)
  lossPercent           Decimal @default(3)
  operationalFeeMinor   Int     @default(1000)
  laborPercent          Decimal @default(100)
  packagingCostMinor    Int     @default(0)
  markupRetailPercent   Decimal @default(100)
  markupBulkPercent     Decimal @default(50)
  markupPromoPercent    Decimal @default(30)
  markupLoyalPercent    Decimal @default(40)
}

model CostingMaterialLine {
  id              String
  costingTabId    String
  materialId      String
  unitsUsed       Decimal
  finishedPieces  Decimal
}

model CostingPrintLine {
  id              String
  costingTabId    String
  printerId       String
  paperSize       String
  quality         String
  coverage        String
  sheetCount      Decimal
  finishedPieces  Decimal
}

model PriceSet {
  id                   String
  userId               String
  costingTabId         String
  categoryId           String
  name                 String
  retailPriceMinor     Int
  bulkPriceMinor       Int
  productionCostMinor  Int
  imagePath            String?
}

model PriceSetMaterial {
  id          String
  priceSetId  String
  materialId  String
  unitsUsed   Decimal
  finishedPieces Decimal
}

model Bundle {
  id                  String
  userId              String
  categoryId          String
  name                String
  bundlePriceMinor    Int
  regularMinor        Int
  productionMinor     Int
}

model BundleLine {
  id           String
  bundleId     String
  priceSetId   String?
  digitalProductId String?
  quantity     Decimal
}

model DigitalProduct {
  id          String
  userId      String
  name        String
  priceMinor  Int
  url         String
  note        String @default("")
}

model PromoNote {
  id          String
  userId      String
  title       String
  mode        String
  value       Decimal
  code        String @default("")
  note        String @default("")
}

model Customer {
  id       String
  userId   String
  name     String
  phone    String @default("")
  email    String @default("")
  address  String @default("")
  notes    String @default("")
}

model Order {
  id                     String
  userId                 String
  customerId             String?
  customerName           String
  customerPhone          String @default("")
  customerEmail          String @default("")
  customerAddress        String @default("")
  stage                  String @default("inquiry")
  paymentStatus          String @default("unpaid")
  dueDate                DateTime?
  followUpDate           DateTime?
  discountMinor          Int      @default(0)
  deliveryMethod         String   @default("pickup")
  shippingMinor          Int      @default(0)
  personalized           Boolean  @default(false)
  note                   String   @default("")
}

model OrderLine {
  id              String
  orderId         String
  priceSetId      String?
  bundleId        String?
  description     String
  quantity        Decimal
  unitPriceMinor  Int
  unitCostMinor   Int
}

model Sale {
  id         String
  userId     String
  orderId    String?  @unique
  kind       String   // "product" | "subscription"
  date       DateTime
  amountMinor Int
  costMinor  Int      @default(0)
  note       String   @default("")
}

model Expense {
  id            String
  userId        String
  date          DateTime
  amountMinor   Int
  frequency     String
  category      String
  paymentMethod String
  description   String
  note          String @default("")
}

model Membership {
  id           String
  userId       String
  customerId   String?
  name         String
  amountMinor  Int
  interval     String
  startedOn    DateTime
  endsOn       DateTime
  note         String @default("")
}

model Reminder {
  id     String
  userId String
  date   DateTime
  title  String
  note   String @default("")
}

model Document {
  id              String
  userId          String
  type            String
  number          String
  currency        String
  showLogo        Boolean @default(true)
  customerName    String
  customerPhone   String @default("")
  customerEmail   String @default("")
  customerAddress String @default("")
  discountMinor   Int     @default(0)
  shippingMinor   Int     @default(0)
  courier         String  @default("")
  paymentStatus   String  @default("unpaid")
  fulfillment     String  @default("")
  terms           String  @default("")
  notes           String  @default("")
  taxLabel        String  @default("")
  vatPercent      Decimal?
  orderId         String?
}

model DocumentLine {
  id             String
  documentId     String
  description    String
  quantity       Decimal
  unitPriceMinor Int
}

model CostMultiplier {
  id    String
  group String // "size" | "quality" | "coverage"
  key   String
  value Decimal
}

model CommunitySettings {
  id              String @id @default("singleton")
  facebookGroupUrl String @default("")
  communityPageUrl String @default("")
}

model CommunityPost {
  id    String
  title String
  note  String @default("")
  url   String
}

model WishlistItem {
  id        String
  userId    String
  title     String
  note      String @default("")
  done      Boolean @default(false)
}
```

Add the relations Prisma needs. Scope every query that has `userId` with the session user id.

Document numbers: `INV-0001` and `RCT-0001`, incrementing per crafter and per type.

At most five material categories may be starred per crafter. Starring a sixth asks them to unstar one, or unstars the oldest. Either behavior is fine if the cap holds.

## Project layout

```
src/app/login/page.tsx
src/app/(shop)/dashboard/page.tsx
src/app/(shop)/layout.tsx            // session, expiry redirect, theme
src/app/(admin)/admin/users/page.tsx
src/app/account-expired/page.tsx
src/lib/costing.ts
src/lib/costing.test.ts
src/lib/money.ts                     // format minor units, parse input
src/lib/auth.ts
src/lib/stock.ts                     // deduct and restore
src/lib/expenses.ts                  // expand occurrences in a range
src/actions/                         // server actions, one file per area
prisma/schema.prisma
prisma/seed.ts
```

Shop layout loads `ShopSettings` and sets `data-theme` and `data-scheme` on a wrapper. Navigation:

Dashboard, Materials, Print hub, Costing, Prices, Orders, Calendar, Documents, Finance, Guide.

Prices opens a small menu: Price list, Bundles, Digital, Promos.

Finance opens: Overview, Expenses, Customer memberships.

Put Settings on the user menu in the header, with the crafter's name. That matches the video (the name in the upper right).

## Phase order

Build these in order. Do not start a later phase by leaving the previous one as a non-working stub.

1. **App shell and auth.** Prisma schema, seed admin, login, logout, password change, role redirect. Admin can create a crafter and see the temporary password. Expired crafters land on `/account-expired`. Live crafters land on an empty dashboard.
2. **Settings and theme.** Currency, theme, dark mode, logo upload, business and payment fields, checklist step `personalize`.
3. **Materials.** Categories, star cap, search, cost per piece, image, low-stock list.
4. **Print hub.** Printers with both base sheet costs, supplies with expense logging, template links.
5. **Costing engine.** `costing.ts` and its tests, then the costing tab UI, adjustments, and suggested prices.
6. **Prices.** Price sets with recalculation, price list, bundles, promo math, digital products and copy link.
7. **Customers and orders.** Board, mobile select, stock deltas, personalized confirm, delivered sale, reorder.
8. **Documents.** Invoice and receipt, VAT off by default, print and PNG, create-from-order.
9. **Finance and dashboard.** Ranges, expense frequencies, memberships and renewal warning, dashboard cards, low stock, checklist.
10. **Calendar, sheet link, community, guide.** Shared order dates, reminders, master-sheet URL, annual gate, admin community links, wishlist.

## Done when

A reviewer can do all of this without a code change:

- Sign in as admin, create a quarterly crafter, see a temporary password, sign in as that crafter, set a new password, and see the welcome dialog once.
- Set the shop to Philippine pesos, pink, and a logo.
- Add a material with a pack price and a piece count and see the cost per piece.
- Add a printer and see a base cost per sheet for color and for black.
- Cost a product with one material line and two printing lines. Loss starts at 3%, the fee at ?10, labor at 100%. The suggested retail price matches `costing.ts`.
- Save two price sets on that tab. Change a material on the second set and see the production cost change.
- Save a bundle and see regular price, production cost, savings, and profit.
- Take 10% off ?300 and see ?270.
- Create a customer, then an order that fills their details and the retail price.
- Move that order to delivered and see a sale. See the material quantity drop.
- Restock by typing a new total, log the expense, and see that exact total on the material.
- Print an invoice that shows the logo and the GCash number.
- See net profit for this month change when the sale and the expense exist.
- On a phone-width window, change an order stage with the select.
- Set the crafter's expiry in the past and see the shop lock while the rows remain.
- Renew as admin and see the shop open again with the same stock and the same sale.
- An annual crafter can open the community page. A quarterly crafter sees the locked message.
- A second crafter cannot open the first crafter's material or order by typing the URL.

## Leave out

- A checkout or card payment for buying the toolkit
- Public self-signup
- Facebook login or the Facebook API
- Two-way sync with Google Sheets
- A watt-by-watt electricity calculator
- Stock deduction from invoices
- Automatic currency conversion
- A hard block on moving a personalized order into production
- More than one image per material or price set
