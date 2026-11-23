# Requirements traceability

Status values: implemented, partial, missing, blocked.

| Requirement | Status | Code |
| --- | --- | --- |
| Provider-created accounts, no public signup | implemented | Auth.js credentials, admin user management |
| One shop per user, server-side isolation | implemented | Queries filter `userId` from the session |
| Business settings and checklist | implemented | `ShopSettings`, `src/lib/checklist.ts` |
| Currency display in PHP or USD | implemented | `src/lib/money.ts` |
| Material unit cost from pack price | implemented | `calculateMaterialCostPerPiece` |
| Material search, filter, low stock | implemented | `MaterialLibrary` |
| Up to five starred categories | implemented | `MaterialCategory`, `setMaterialCategoryStar` |
| Restock sets a new total and records it | implemented | `restockToNewTotal`, `InventoryMovement` |
| Restock creates one linked expense | implemented | `Expense.sourceKey` |
| Printer records and base ink cost | implemented | `Printer`, `calculatePrinterBaseCosts` |
| Print size, quality, and coverage math | partial | `src/lib/costing.ts`. Multipliers are provisional (C-04–C-08) |
| Printer supply purchase creates one expense | implemented | `recordPrinterSupplyPurchase` |
| External print template links | implemented | `PrintTemplate` |
| Costing projects, several print lines, suggested prices | partial | Costing pages. Labor, loss, overage, and the operational fee still need client formulas |
| Final price sets | partial | `PriceSet` stores a price. Per-variation material composition is not separate from the costing project |
| Bundles, promotions, digital products | implemented | Bundle totals, promotion calculator, digital links. Orders can select all three and keep the saved price |
| Customers and order board | partial | Customers, six-stage board, product/bundle/digital lines, price snapshots, one sale when delivered. Stock is not deducted (C-09) |
| Invoices and receipts | partial | Documents copy lines from an order or from typed details. Print, PDF, and PNG use those saved figures. They do not create sales. VAT is an amount you type |
| Sales log, expense ledger UI, finance dashboard | partial | Finance and the overview use the same totals for delivered sales and recorded expenses. Subscriptions and cost of goods are not in the profit figure |
| Calendar and community | missing | Phase 9. Community URLs are C-23 |
| Tenant isolation tests | missing | Phase 10 |
