# Implementation plan

Sequence follows section 24 of the implementation guide.

| Phase | State | Notes |
| --- | --- | --- |
| 0 Audit | Done | This file plus the audit, traceability, architecture, and business-rule notes |
| 1 Foundation | Done before this pass | Settings, checklist, session isolation, currency helpers |
| 2 Materials | Done in this pass | Starred categories, restock-to-new-total, movement history, one linked expense |
| 3 Print hub | Done in this pass | Existing printers kept. Supplies, one expense per purchase, template links added. Print multipliers stay provisional |
| 4 Costing | Already present | Formula confirmation still open |
| 5 Catalog | Partial | Bundles, promotions, and digital products are in. Per-variation material assignment for stock deduction is still open |
| 6 Customers and orders | Partial | Customers, board, snapshots, reorder, and one sale on Delivered are in. Stock deduction waits on C-09 |
| 7 Documents | Partial | Invoices and receipts copy order or manual lines, print, and download PDF/PNG text. They do not create sales. VAT rate math stays unset |
| 8 Finance | Not started | Expense rows exist. Ledger UI, sales log, and dashboard totals do not |
| 9 Calendar and resources | Not started | Depends on orders. Community links need C-23 |
| 10 Release checks | Not started | Tenant-isolation and reconciliation tests are still required |

Next recommended phase: sales and finance screens that read the same sale and expense records.
