# Creative Costwise --- Product Requirements & Implementation Guide

**Document purpose:** Give Cursor AI IDE a clear,
implementation-oriented specification for evolving the existing Creative
Costwise Next.js project.

**Source basis:** Client walkthrough video and its transcript previously
reviewed. This document organizes the requirements expressed in that
walkthrough into modules, workflows, business rules, dependencies, data
concepts, acceptance criteria, and unresolved questions.

**Important project constraint:** The existing repository source code
has not yet been audited as part of preparing this document. Therefore,
this is a requirements and implementation guide, **not permission to
replace the current application or assume a particular stack/database
schema**. Cursor must inspect the repository first, report what already
exists, and implement incrementally while preserving working
functionality.

------------------------------------------------------------------------

## 1. Instructions to Cursor AI

Act as a senior full-stack engineer, software architect, and
product-minded technical lead.

Your job is to implement the Creative Costwise requirements in the
**existing** project. Do not start by scaffolding a new application.

### 1.1 Mandatory first steps --- repository audit

Before changing code:

1.  Inspect the complete project structure and identify:
    -   Next.js version and whether the project uses App Router or Pages
        Router.
    -   TypeScript/JavaScript configuration.
    -   Existing UI framework, styling system, component library, icons,
        and form libraries.
    -   Authentication and authorization implementation.
    -   Database provider, ORM/query layer, schema, migrations, and seed
        strategy.
    -   API routes, server actions, service/repository layers, and
        validation approach.
    -   Existing modules, pages, layouts, reusable components, and
        navigation.
    -   File upload/storage handling.
    -   Existing tests, linting, formatting, and build scripts.
    -   Environment variables and deployment assumptions. Never expose
        secret values.
2.  Read `package.json`, README and other project documentation,
    configuration files, database schema/migrations, and relevant source
    files.
3.  Run available checks where safe: install status, type check, lint,
    tests, and build. Do not modify dependencies simply to make the
    audit pass.
4.  Create a concise **Repository Audit** report in the project (for
    example `docs/REPOSITORY_AUDIT.md`) containing:
    -   Current architecture and stack, backed by actual files.
    -   Existing feature inventory.
    -   Existing data model and important relationships.
    -   Working functionality that must be preserved.
    -   Known bugs, incomplete areas, and technical risks.
    -   Conflicts between the current implementation and this
        specification.
5.  Map every requirement in this document to one of:
    -   Already implemented and verified.
    -   Partially implemented.
    -   Not implemented.
    -   Blocked / needs clarification.
6.  Do not duplicate an existing feature just because its implementation
    differs from the terminology in this document. Reuse or carefully
    extend it.
7.  Do not delete, rename, or rewrite existing files wholesale unless
    necessary and justified. Preserve existing design conventions and
    user-facing UI unless a requirement needs a change.
8.  Do not claim a feature works unless you have verified its complete
    flow, including persistence and relevant side effects.

**After the audit:** propose an incremental implementation plan. Then
implement in small, testable phases. If the user has asked you to
proceed with implementation, do not stop after writing a plan; work
through the phases in order, reporting what is completed and what
remains.

### 1.2 Non-negotiable engineering rules

-   Preserve the current Next.js architecture and established
    conventions unless the audit proves a change is necessary.
-   Use the project's actual database and ORM. Do not switch databases
    or introduce a second database.
-   Do not invent environment values, API keys, credentials, or external
    service configuration.
-   Never commit `.env` files, passwords, access tokens, private
    customer data, or production database backups.
-   Enforce server-side authorization and user/tenant data isolation.
    Hiding a button in the UI is not authorization.
-   Validate all user input on the server as well as in the UI.
-   Use decimal-safe arithmetic for money. Avoid floating-point rounding
    errors in persisted financial calculations.
-   Store timestamps consistently and display them in the
    user's/business's intended timezone.
-   Use database transactions for workflows that must update multiple
    records together.
-   Prevent duplicate side effects when an action is retried (inventory
    deductions, sale creation, expense creation).
-   Preserve historical order prices and relevant cost snapshots even if
    the product's current price or costing changes later.
-   Add database migrations using the project's existing migration
    mechanism.
-   Provide loading, empty, error, validation, and success states for
    user-facing workflows.
-   Make forms usable on desktop and mobile; use responsive layouts.
-   Maintain accessibility: labels, keyboard operation, readable
    contrast, and clear status indicators.
-   Add or update tests for business rules and critical workflows.
-   Do not add fake/sample data to production behavior. Seed data only
    through the project's existing safe development/seed process.
-   Do not implement Google Sheets automatic two-way synchronization.
    The walkthrough describes a manually maintained backup/master-sheet
    link.

------------------------------------------------------------------------

## 2. Product overview

Creative Costwise is a business-management toolkit for a small
creative/crafting business. It helps the business owner:

1.  Set up their business workspace.
2.  Maintain a library of materials and inventory.
3.  Configure printers and printing supplies.
4.  Calculate the cost of making products.
5.  Create product price variations, bundles, promotions, and
    digital-product listings.
6.  Manage customers and orders.
7.  Create invoices and receipts.
8.  Track sales, subscriptions, expenses, and profit.
9.  Coordinate orders and reminders through a calendar.
10. Access guides, templates, community resources, and an optional
    spreadsheet master sheet.

The Product Costing workflow is a central capability. Inventory,
pricing, order processing, and financial reporting depend on consistent
data from it.

### 2.1 Core terminology

Use these concepts consistently. Map them to existing project
terminology where practical.

-   **Material:** A raw material or supply purchased by the business,
    such as paper, chipboard, binding wire, or laminating film.
-   **Inventory quantity:** Current available quantity of a material,
    measured in its configured unit.
-   **Costing project:** A reusable calculation/workspace for
    determining the cost of making a product.
-   **Final price set / product variation:** A sellable version of a
    costing project, potentially with different material assignments,
    specifications, and price options.
-   **Physical product:** A tangible product offered for sale.
-   **Digital product:** A downloadable or linked digital item/template
    offered for sale.
-   **Bundle:** A sellable combination of products and quantities.
-   **Order:** A customer's purchase/request that moves through
    fulfillment stages.
-   **Expense:** A business cost, including manual expenses and
    purchases recorded from restocking or printer-supply workflows.
-   **Sale:** A recognized sales record. The walkthrough says delivered
    orders appear in the sales report; the exact recognition policy
    needs confirmation for other cases.
-   **Subscription:** A membership or recurring offering tracked by the
    business. Whether payments are automatically processed is not
    specified.

------------------------------------------------------------------------

## 3. Roles, accounts, and access

### 3.1 Business user account onboarding

The walkthrough describes this account flow:

1.  A customer purchases access to the toolkit.
2.  The provider creates the customer's account.
3.  The provider sends an email containing login details and a temporary
    password.
4.  The customer logs in.
5.  A welcome message is displayed.
6.  The user proceeds to the dashboard and setup checklist.

The walkthrough does not establish whether self-registration should also
be available. Do not assume it should.

### 3.2 Membership and access

-   There are quarterly and annual plans.
-   The setup checklist has 11 steps for the quarterly plan.
-   Annual members receive an additional community-related step/access.
-   Annual members can access the Crafters Community resources described
    later.
-   The community flow expects the member to use the same email as their
    toolkit account so membership can be recognized.

Membership expiry, renewal, grace periods, and enforcement behavior are
not specified. Implement membership fields and access rules only after
inspecting existing code and resolving the policy.

### 3.3 Authorization

At minimum, keep each business user's private data isolated. A user must
not be able to read or modify another user's materials, customers,
orders, documents, expenses, or settings.

Provider/platform administrator capabilities are not fully described. Do
not invent a broad admin console. First identify existing roles and ask
for clarification where needed.

------------------------------------------------------------------------

## 4. Workspace settings and onboarding

### 4.1 Business settings

Provide settings for:

-   Preferred currency (the walkthrough mentions PHP and USD, plus other
    currencies).
-   Theme/accent color. Mentioned choices: pink, purple, green, blue,
    red, beige, orange, gray, and black.
-   Dark mode.
-   Business logo and/or personal logo.
-   Business information used by invoices and receipts.
-   Payment details used on customer documents.

The walkthrough does not define whether multiple businesses/workspaces
can exist under one account. Do not design the data model around
multiple businesses unless the existing project already supports it or
the client confirms it.

### 4.2 Setup checklist and help

-   Show a setup checklist on the dashboard.
-   The quarterly plan has 11 checklist steps.
-   Annual plan has an additional community step.
-   Include a welcome guide and FAQs.
-   Persist checklist completion so progress remains after logging out
    and back in.
-   Do not mark steps complete merely because a page was opened; use
    meaningful completion conditions where those can be determined.

The exact names and completion criteria of all checklist steps should be
taken from the walkthrough/UI assets if available. If not available,
make checklist content configurable rather than inventing definitive
client-approved wording.

------------------------------------------------------------------------

## 5. Dashboard

The dashboard is a summary of business activity. The walkthrough
mentions:

-   Product revenue.
-   Subscription earnings.
-   Expenses.
-   Net profit.
-   Current orders.
-   Upcoming items for the week.
-   Pending orders.
-   Top-performing products.
-   Inventory summary.
-   Low-stock materials.
-   Setup checklist progress.

### 5.1 Dashboard rules

-   Dashboard values must be calculated from persisted source records,
    not hardcoded values.
-   Apply the user's currency setting to displayed monetary values.
-   Define the date range and revenue-recognition policy consistently
    with the Sales & Finance module.
-   Pending orders and upcoming items should link to the relevant
    order/calendar records.
-   Low-stock materials should use each material's configured threshold.
-   Empty states should explain how to add the first product, material,
    or order.

------------------------------------------------------------------------

## 6. Material Library and inventory

### 6.1 Material categories

The walkthrough gives examples including:

-   Plain paper.
-   Photo paper.
-   Chipboard.
-   Binding wires.
-   Laminating films.

The user can select up to five favorite/default categories for quick
access. The system should also support searching and filtering by
category.

Do not restrict the entire material library to five categories; the
five-category limit applies to the user's selected favorites/default
shortcuts as described.

### 6.2 Material fields

A material record should support the following information where
applicable:

-   Material name.
-   Category.
-   Pieces per pack / pack quantity.
-   Price per pack.
-   Automatically calculated cost per piece or configured base unit.
-   Specifications such as GSM, thickness, and size.
-   Finish, such as matte, glossy, or satin.
-   Unit of measure.
-   Current quantity on hand.
-   Low-stock alert threshold.
-   Supplier name and/or reorder link.

Not every material necessarily uses pieces. Support an appropriate unit
of measure rather than assuming all stock is counted as individual
pieces.

### 6.3 Cost calculation

For a pack-based material:

`cost_per_unit = pack_price / units_per_pack`

Validate that pack quantity is greater than zero. Define the base unit
clearly and use it consistently in costing and inventory deductions.

Money calculations must use decimal-safe arithmetic and a documented
rounding policy.

### 6.4 Inventory views and alerts

-   Provide an inventory view with current quantities.
-   Show low-stock materials when quantity is at or below the configured
    threshold.
-   Allow search and category filtering.
-   Display material cost and supplier/reorder information where
    available.

### 6.5 Restocking workflow

The walkthrough specifically describes entering the **new total quantity
on hand** after a restock, rather than simply adding the purchased
amount to the previous quantity.

Expected workflow:

1.  User opens a material and chooses restock/update stock.
2.  User enters the new total quantity currently on hand.
3.  System records the inventory adjustment with the entered quantity as
    the resulting stock baseline.
4.  User records the purchase as an expense.
5.  The inventory and expense history reflect the action.

Do not silently interpret the entered quantity as "quantity purchased."
Make the UI label explicit, for example **New total quantity on hand**.

The walkthrough also says purchases from restocking should appear in
Expenses. Avoid creating duplicate expenses if the same restock action
is retried.

### 6.6 Inventory deductions

When an order uses a physical product, the system must deduct the
relevant materials assigned to that sellable product variation.

Important requirements:

-   The material composition used for an order must come from the
    selected final price set/product variation.
-   The deduction should be based on ordered quantity and the saved
    material quantity per finished product.
-   Multiple order items must deduct the correct total for each
    material.
-   Deduction must be transactional and idempotent.
-   Maintain an inventory movement/transaction history (for example:
    restock, adjustment, order consumption, reversal).
-   Do not rely only on overwriting a single quantity field; retain an
    auditable movement history.

**Unresolved policy:** The exact moment of deduction is unclear. The
walkthrough associates production with payment confirmation and In
Production, but does not conclusively specify whether stock is deducted
on order creation, payment, or when production begins. Do not hard-code
a destructive policy without confirmation.

Also clarify whether negative inventory is allowed and how cancelled
orders restore stock.

------------------------------------------------------------------------

## 7. Print Hub

The Print Hub contains printer configuration, printer supplies, and
reusable printing templates.

### 7.1 Printer database

Each printer should support:

-   Printer name/model.
-   Ink type: dye, sublimation, pigment, or other supported type.
-   Color ink price.
-   Color ink page yield.
-   Black-and-white ink price.
-   Black-and-white ink page yield.
-   Calculated base ink cost per sheet.

The walkthrough says final printing cost also depends on paper size,
print quality, and ink coverage.

### 7.2 Printing cost calculation

The base cost should be derived from the configured ink price and yield.
However, the walkthrough does not provide the exact multipliers/formula
for paper size, quality, and coverage.

Therefore:

-   Keep base ink cost and any additional multiplier components
    distinguishable.
-   Do not invent supposedly client-approved multiplier values.
-   If the current project already has a formula, audit and document it
    before changing it.
-   Make multiplier values configurable if the client approves that
    approach.
-   Explain the applied values in the UI, including information/help
    text where the walkthrough describes multiplier explanations.

### 7.3 Ink and printer supplies

Support supplies such as:

-   Ink.
-   Maintenance boxes.
-   Printhead-cleaning supplies.
-   Other printer supplies.

A supply record may include supplier/reorder link and relevant
price/quantity details.

The user can trigger a reorder/purchase workflow. The walkthrough
expects the purchase to be recorded as an expense with fields
auto-filled where possible:

-   Date.
-   Expense category.
-   Description.
-   Amount.
-   User-selected payment method, e.g. GCash.

Avoid duplicate expenses on retry.

### 7.4 Printing templates

Allow the user to save reusable external template links, including Canva
and Google Drive links. Provide a clear action to open the saved link.

Do not claim to import or synchronize the contents of those external
documents unless a separate integration is explicitly requested.

------------------------------------------------------------------------

## 8. Product Costing --- core module

The costing calculator is a central feature and must produce
understandable cost breakdowns.

### 8.1 Costing projects/tabs

-   User can create multiple costing tabs/projects.
-   User can rename a tab, e.g. "A5 Notebook".
-   Each project stores its costing inputs and calculated breakdown.
-   A costing project is not necessarily the same thing as a sellable
    product or product variation.

### 8.2 Materials costing

For each material line, support:

-   Material category.
-   Selected material.
-   Remaining inventory (display information).
-   Unit cost.
-   Quantity used to make the batch.
-   Number of finished products produced.

Formula described in the walkthrough:

`material_cost_per_finished_product = quantity_used * cost_per_unit / finished_product_quantity`

Validate that finished product quantity is greater than zero. Ensure the
unit used in quantity and unit cost matches.

The UI should show the calculation clearly enough for a business owner
to understand it.

### 8.3 Printing entries

A costing project can contain multiple printing entries. Each entry may
include:

-   Printer.
-   Paper size.
-   Print quality.
-   Ink coverage/type.
-   Number of sheets.
-   Applicable printing-cost multipliers.

Example use case from the walkthrough:

-   A photo-heavy color cover.
-   Standard black-and-white inner pages.

These should be represented as separate entries so each can use its own
printer/quality/coverage assumptions.

Display the multiplier values and provide explanatory information/help
text. Do not hide important assumptions inside an opaque total.

### 8.4 Overage and setup/cutting allowance

The walkthrough mentions optional overage and setup/cutting allowance.
The exact formula and whether these are percentages or fixed quantities
are not fully specified.

Implement them only in a way that is consistent with any existing
verified formula, or make the inputs configurable and label the
calculation transparently. Do not silently choose a formula and present
it as client-approved.

### 8.5 Production loss

-   Default production loss: **3%**.
-   The user can adjust it.
-   The client mentions a typical range of approximately 3--5%.
-   It accounts for misprints, rejected output, damaged materials, and
    unusable production.

The exact mathematical application of the loss percentage is not
specified. For example, applying loss as a cost uplift versus adjusting
required material quantity can produce different results. Keep the
calculation explicit and seek client confirmation before finalizing the
formula.

### 8.6 Operational fee

-   Default operational fee: **₱10**.
-   User can adjust it.
-   It represents electricity, machine usage, wear, and maintenance.

The walkthrough does not clearly state whether this fee is per finished
item, per batch, or per production run. Do not assume without checking
existing code or asking the client. The UI must clearly label the
selected basis.

### 8.7 Labor

-   Default labor setting: **100%**.
-   User can adjust it.

The meaning of 100% is ambiguous: it could be a markup/multiplier or a
percentage of another cost component. Do not implement a guessed formula
as definitive. Document the current formula if one exists and request
confirmation.

### 8.8 Packaging

A separate costing tab/section for packaging is suggested. Examples
include:

-   Boxes.
-   Tape.
-   Fillers.
-   Labels.

Treat this as a requested costing capability, while allowing the
implementation to fit the existing costing UI. Packaging costs should be
included in the final production cost when selected.

### 8.9 Cost breakdown and suggested prices

Show a clear breakdown of:

-   Materials.
-   Printing.
-   Overage/setup/cutting, where configured.
-   Production loss.
-   Operational fee.
-   Labor.
-   Packaging.
-   Total production cost per finished item.

Provide suggested selling prices using configurable pricing strategies
such as:

-   Retail.
-   Bulk.
-   Promotion.
-   Loyal customer.

The exact markup percentages are not specified. Do not invent fixed
client-approved percentages. Make rates configurable and show the
calculation used.

### 8.10 Costing validation and acceptance criteria

-   User can create, rename, edit, and reopen costing projects.
-   Material costs update from the selected material's unit cost,
    subject to the chosen snapshot/live-update policy.
-   Multiple printing entries are supported.
-   The system displays a comprehensible cost breakdown.
-   Invalid quantities and division by zero are rejected.
-   Currency formatting follows workspace settings.
-   Reopening a project preserves its inputs and calculated values.
-   Tests cover material cost per unit, material cost per finished
    product, and approved loss/labor/operational formulas once
    clarified.

------------------------------------------------------------------------

## 9. Final Prices and physical product price list

### 9.1 Separate costing project from sellable variation

One costing project may produce multiple final price sets/product
variations.

Example from the walkthrough: an 80-page notebook with a matte finish
and an 80-page notebook with a glitter finish. They may have different
material compositions and production costs.

Model these as separate sellable variations/price sets, even if they
reference the same underlying costing project.

### 9.2 Final price set

Each final price set should support:

-   Name/variation label.
-   Link to its costing project.
-   Product specifications such as page count/finish where applicable.
-   Production cost pulled from the costing calculation.
-   Retail price.
-   Bulk price.
-   Relevant pricing options.
-   Assigned material composition used for inventory deduction.

Allow the user to verify and assign the correct materials for each price
set. The material assignment used for order deductions must be explicit.

### 9.3 Physical product list

-   Display physical products organized by category.
-   Allow the user to create product categories.
-   Allow products/variations to be saved into the physical product
    price list.
-   Product list entries should be selectable in orders and documents.

### 9.4 Historical price snapshots

When an order is placed, preserve the actual unit price and relevant
cost snapshot used at that time. A later price or costing update must
not retroactively change old orders or past profit reports.

------------------------------------------------------------------------

## 10. Bundle Pricing

Allow a user to create a bundle from existing sellable products and
quantities.

Bundle information:

-   Bundle name.
-   Included products.
-   Quantity of each product.
-   Combined regular selling price.
-   Combined production cost.
-   Bundle selling price.
-   Customer savings.
-   Estimated profit.
-   Save the bundle to the physical price list so it can be selected in
    an order.

Example from the walkthrough:

-   Combined regular price: ₱345.
-   Combined production cost: ₱244.
-   Bundle price: ₱300.
-   Customer savings: ₱45.
-   Estimated profit: ₱55.

The example implies the bundle price is between production cost and the
regular combined price. Clarify whether this should be a hard validation
rule or a warning/recommendation. At minimum, clearly display if the
bundle price is below its production cost.

Bundle totals must be calculated from the selected product variations
and quantities. Preserve a price/cost snapshot when the bundle is used
in an order.

------------------------------------------------------------------------

## 11. Discount and Promotion Calculator

Provide a calculator that supports:

-   Original price.
-   Percentage discount.
-   Fixed-amount discount.
-   Calculated sale price.
-   Notes.
-   Promotion code.
-   Upcoming promotion details.

Example from the walkthrough: ₱300 with a 10% discount results in ₱270.

Validation:

-   Prevent negative prices and invalid discount values.
-   A percentage discount should be within a valid range.
-   A fixed discount should not exceed the original price unless the
    business explicitly allows a zero-price result.
-   Show the original price, discount amount, and final price.
-   Save promotion details where requested.

------------------------------------------------------------------------

## 12. Digital Products Price List

A digital product record should support:

-   Template/product name.
-   Price.
-   Canva, Google Drive, or other external link.
-   Save/edit functionality.
-   Display in a digital product list.
-   Copy-link action.
-   Selection in orders and business documents.

The walkthrough describes links to external products/templates. Do not
assume the application hosts or delivers digital files itself.

------------------------------------------------------------------------

## 13. Customers

Customer records should support:

-   Name.
-   Phone number.
-   Email.
-   Mailing/shipping address.
-   Notes.

Expected behavior:

-   Create, view, edit, and search customers.
-   Select an existing customer in an order, invoice, or receipt.
-   Autofill available customer information.
-   Permit manual customer details when the user does not want to save a
    customer record.
-   Avoid accidental creation of duplicate customer records where
    possible.

Do not expose one user's customer list to another user.

------------------------------------------------------------------------

## 14. Order Board and fulfillment

### 14.1 Order stages

The walkthrough gives these stages, in order:

1.  Inquiry
2.  Quoted
3.  In Production
4.  Ready
5.  Delivered
6.  Done

The Order Board should make current stage and next action clear.

### 14.2 Board interaction

-   Desktop: drag and drop orders between stages.
-   Mobile: use a dropdown or another touch-friendly stage selector.
-   Persist every stage change.
-   Record status history where practical.
-   Ensure drag/drop and dropdown actions call the same server-side
    transition logic.

### 14.3 Order form

Support:

-   Saved customer or manual customer details.
-   Address, phone, and email.
-   Physical product or bundle selection.
-   Product variation/price option.
-   Quantity.
-   Unit price auto-filled from the selected price option.
-   Due date.
-   Follow-up date.
-   Discount.
-   Delivery method.
-   Shipping fee.
-   Payment status.
-   Order status.

The walkthrough recommends a 50% deposit or full payment before
production for personalized products. It is not clear whether this is a
hard system rule or business advice. Do not block production by default
unless the client confirms it.

### 14.4 Payment and production flow

The walkthrough describes payment confirmation before moving an order
into production. Preserve this as the intended workflow in the UI, but
make the exact enforcement rule configurable or leave it for client
confirmation.

### 14.5 Inventory and sales effects

-   Orders must use the material composition assigned to the selected
    final price set.
-   Inventory deductions must happen according to the confirmed
    deduction trigger.
-   When an order reaches Delivered, the walkthrough says it is
    automatically recorded in the sales report.
-   Ensure recording a delivered order multiple times cannot create
    duplicate sales.
-   A Done order remains viewable.
-   A reorder action should create a new order based on the previous
    order's details; it must not reopen or overwrite the original order.
-   The user can edit the new order before saving.

### 14.6 Order lifecycle edge cases requiring policy

Do not silently invent behavior for:

-   Cancellation before production.
-   Cancellation after inventory has been deducted.
-   Partial fulfillment.
-   Partial payment/refund.
-   Editing an order after it has been delivered.
-   Reopening a Done order.
-   Whether Done means customer confirmation, administrative closure, or
    something else.
-   Whether a digital product sale should be recorded immediately rather
    than waiting for physical delivery.

------------------------------------------------------------------------

## 15. Invoice and Receipt Creator

Allow the user to create customer-facing invoices and receipts.

### 15.1 Business information

Allow the user to save/edit:

-   Business name and contact details.
-   Business logo.
-   Currency.
-   Payment details.

### 15.2 Customer and line items

-   Select a saved customer or enter a customer manually.
-   Select physical products, bundles, and digital products.
-   Set quantity and price.
-   Apply discounts.
-   Include delivery/shipping details and courier where applicable.
-   Show payment status.

### 15.3 Additional document information

Support:

-   Fulfillment/delivery details.
-   Shipping fee.
-   Courier.
-   Discounts.
-   Terms and conditions.
-   Notes.
-   Optional tax label and VAT rate.
-   Payment details such as account name, bank, and GCash.

The walkthrough does not specify whether VAT is included in the entered
price or added on top. Do not assume; make the tax presentation
configurable only after clarifying the expected calculation.

### 15.4 Output

The walkthrough requests:

-   Print.
-   Export as PNG.
-   Export as PDF.

Use a reliable rendering/export approach compatible with the current
project. Ensure exported documents match the preview and use the
configured logo, currency, customer, and line items.

Clarify whether invoices/receipts are independent documents or generated
from an existing order. If generated from an order, avoid creating
duplicate sales or expenses merely by exporting a document.

------------------------------------------------------------------------

## 16. Sales & Finance

### 16.1 Financial summary

The walkthrough expects a summary containing:

-   Product revenue.
-   Subscription earnings.
-   Cost of goods.
-   Expenses.
-   Profit breakdown.
-   Top-performing products.
-   Recent expenses.

Date filters mentioned:

-   This week.
-   Last 7 days.
-   This month.

A custom date range was not explicitly specified. It may be added if
consistent with the existing project, but do not describe it as a
client-stated requirement.

### 16.2 Sales log

Track sales for:

-   Physical products.
-   Digital products.

The walkthrough explicitly says delivered orders are automatically
recorded in the sales report. Define the sales-recognition policy for
digital products and other order types with the client.

Prevent duplicate sale records. A sale should link to its source order
or transaction where applicable.

### 16.3 Subscriptions

Track offerings such as:

-   Monthly memberships.
-   Recurring digital releases.
-   Coaching packages.
-   Other subscriptions.

Provide expiration tracking and a notification/reminder before an item
expires so the business can follow up about renewal.

The walkthrough does not confirm automatic recurring billing or
payment-gateway integration. Do not implement automatic charges or
assume subscription revenue is received merely because a subscription
record exists.

### 16.4 Expenses

Support:

-   One-time expense.
-   Daily frequency.
-   Weekly frequency.
-   Monthly frequency.
-   Yearly frequency.
-   Category, including examples:
    -   Advertising/marketing.
    -   Packaging/supplies.
    -   Tools/equipment.
    -   Shipping.
    -   Subscriptions.
-   Amount.
-   Payment method.
-   Description.
-   Notes.

Restocking and Print Hub supply purchases should be able to create
expense records with relevant fields prefilled.

Clarify how recurring expenses generate future expense records, whether
they are scheduled automatically, and how edits/cancellations affect
future occurrences. Do not create duplicate expense occurrences when a
scheduled process is retried.

### 16.5 Financial correctness

-   Define revenue, cost of goods, and profit calculations consistently.
-   Do not count an invoice export as a sale.
-   Do not count a restock purchase twice.
-   Keep source links between sales/expenses and the
    order/restock/purchase that created them.
-   Preserve historical prices/costs.
-   Use a consistent date range and timezone policy.
-   Clearly distinguish revenue from profit.
-   Do not count an unpaid quote as realized revenue unless the client
    defines that policy.

------------------------------------------------------------------------

## 17. Calendar

The calendar and Order Board should use the same underlying order
records.

### 17.1 Order synchronization

-   Orders created in the Order Board appear in the calendar.
-   New Order from the calendar creates an order that also appears on
    the Order Board.
-   Changes to an order are reflected in both views.
-   Deleting an order from the board removes it from the calendar view.
-   Completed/delivered/paid orders are visually crossed out according
    to the walkthrough's described behavior.

Do not create duplicate order records for the two interfaces.

### 17.2 Calendar entries and reminders

-   Provide a New Entry action for reminders/client follow-ups.
-   Provide a New Order action for order creation.
-   Store reminders separately from orders where they are not actual
    orders.
-   Allow relevant reminder details and dates.

The walkthrough does not specify whether reminders should trigger
push/email notifications. Do not claim notifications exist unless
implemented and configured.

------------------------------------------------------------------------

## 18. Master Sheet

The walkthrough describes an optional spreadsheet backup/master list.

Expected capabilities:

-   Open/view a sample template.
-   Explain how the user can make their own copy.
-   Allow the user to save their own spreadsheet link.
-   Provide setup instructions.

**Explicit constraint:** The walkthrough says there is no automatic
two-way synchronization. Do not implement Google Sheets API
synchronization, background syncing, or automatic imports/exports unless
separately requested.

------------------------------------------------------------------------

## 19. Resources

The walkthrough presents Resources as a collection of separate destinations and helpful materials. Keep these areas distinct in the navigation and page organization. Do not reduce the entire section to a single generic links page.

### 19.1 Welcome Guide and FAQs

Provide a help area where users can access:

- Welcome guide / getting-started instructions.
- Frequently asked questions (FAQs).

The purpose is to help users understand how to use the toolkit and its main workflows. Content should be editable/configurable by the provider or sourced from existing project content. Do not invent official policy answers where the client has not supplied them.

### 19.2 Master Sheet

The walkthrough demonstrates a Master Sheet page with:

- An important notice telling the user that they must make a copy first.
- An **Open Master List Template** action.
- A **How to set it up** guide/action.
- A section called **Your Master Sheet Link**.
- A Google Sheets URL field where the user pastes the URL of their own copied spreadsheet.
- A **Save Link** action.
- A tip explaining that Google Sheets can be used as a long-term product database for SKUs, costs, prices, and notes, while the toolkit's calculator helps compute pricing and the sheet keeps the user's history.

Expected behavior:
1. Show the provider's sample/master-list template link.
2. Explain that the user should make their own copy before using it.
3. Let the user open the setup instructions.
4. Let the user paste and save their own Google Sheets URL.
5. Persist the saved URL for that user and provide a convenient way to open it later.
6. Validate that the supplied value is a valid, permitted Google Sheets URL before saving.

**Important:** The walkthrough does not describe automatic synchronization. The Master Sheet is a manually maintained companion/backup. Do not implement automatic two-way sync, background syncing, or Google Sheets API integration unless the client separately requests it.

### 19.3 Crafters Community

The walkthrough shows a separate **Crafters Community** login page. It includes:

- Community branding.
- Email field.
- Password field.
- Sign-in action.
- Forgot-password option.
- Account/access information explaining that account details are provided after purchase.
- A note that accounts are created by the provider after purchase.
- Terms and conditions and privacy policy links.

The walkthrough indicates that the community is for annual members. It also says the user should use the same email address as their toolkit account so membership can be recognized.

Expected behavior and constraints:
- Present the community as a distinct destination from the main toolkit.
- Restrict access to eligible annual members according to the confirmed membership entitlement.
- Use the same-email membership matching rule described in the walkthrough.
- Do not assume the community uses the same authentication backend as the main toolkit; inspect the existing project and confirm whether it is an external service or a separate application.
- If it is an external community platform, provide a configured link or integration rather than recreating its authentication screen without approval.
- Do not invent the community URL, login credentials, or password-reset implementation.
- Do not expose passwords or send credentials through insecure channels.

### 19.4 Template Library

The walkthrough shows a visual template gallery with individual template cards. The visible examples include planner/calendar-style and other printable/product templates. Each card has a preview and a **Grab it here** action.

Expected behavior:
- Display templates in a browsable gallery/grid.
- Each template card should support a title/name, preview image, and destination link where those assets are supplied.
- The **Grab it here** action opens the configured template/download destination.
- Organize or filter templates by category only if categories are supplied or supported by the existing content.
- Make it clear when a template opens an external destination.
- Do not invent template names, previews, download files, or external URLs.
- Allow the provider/admin to manage template entries if the existing product supports content management; otherwise, use a maintainable configuration/content source and document how entries are updated.

### 19.5 Template Wish List

Provide a wish-list/request area where users can submit template ideas or requests.

At minimum, capture:
- Requested template name or description.
- Optional details explaining what the user needs.
- Submission date.
- Requesting user.

If the walkthrough or existing UI shows additional fields, preserve them. Do not add voting, public sharing, status workflows, or promises of fulfillment unless the client confirms those features.

### 19.6 Access and content management

- Annual-member-only access is explicitly associated with the Crafters Community in the walkthrough. Do not automatically gate every resource unless the client confirms that policy.
- Welcome Guide, FAQs, Master Sheet, Template Library, and Wish List access rules should follow the walkthrough and existing project behavior; ask for clarification if a specific restriction is not shown.
- Store provider-supplied links and content in a maintainable way.
- Never hardcode guessed URLs or credentials.
- Show useful empty states if a resource has not yet been configured.
- External resources should open safely and clearly indicate that the user is leaving the toolkit.

## 20. Cross-module workflows and dependencies

These relationships are important. Keep a single source of truth for
each business record.

### 20.1 Costing to product catalog

`Material Library → Product Costing → Final Price Sets → Physical Product Price List`

-   Materials provide unit costs and inventory data.
-   Costing projects calculate production costs.
-   Final price sets define sellable variations and material
    composition.
-   The physical product list exposes those sellable variations to
    orders and documents.

### 20.2 Print Hub to costing

`Printer Database + Ink/Supply Settings → Printing Cost Entries → Product Costing`

-   Printer settings supply base printing-cost information.
-   Each costing project can have multiple printing entries.
-   The formula and multipliers must be transparent and verified.

### 20.3 Product catalog to orders

`Physical Products / Bundles / Digital Products + Customers → Order Board`

-   Order items preserve price and cost snapshots.
-   Customer details can be selected or entered manually.
-   Order status changes are persisted and reflected in the calendar.

### 20.4 Orders to inventory and sales

`Order → Inventory Consumption (at confirmed trigger) → Delivered → Sales Log`

-   Inventory deductions use the selected product variation's assigned
    material composition.
-   Sales creation must be idempotent.
-   Cancellation/reversal policy must be defined.

### 20.5 Purchases to expenses

`Material Restock / Printer Supply Purchase → Expense`

-   Purchase workflows prefill expense details.
-   The resulting expense must link to its source purchase/restock.
-   Retried actions must not duplicate expense records.

### 20.6 Finance to dashboard

`Sales + Subscription Earnings + Expenses + Cost of Goods → Finance Summary → Dashboard`

-   Shared calculation services should power both finance and dashboard
    totals.
-   Avoid separate, inconsistent formulas in separate pages.

### 20.7 Orders and calendar

`Order Board ↔ Calendar`

-   Both are views of the same order record.
-   Calendar reminders can be separate records.
-   No duplicate order entities for each interface.

------------------------------------------------------------------------

## 21. Suggested logical data concepts

These are **conceptual entities**, not a mandate to create identically
named database tables. First inspect the existing schema and
reuse/extend it.

  -----------------------------------------------------------------------
  Concept                             Purpose / key relationships
  ----------------------------------- -----------------------------------
  User                                Login identity and ownership

  Membership                          Plan, status, start/end dates,
                                      access entitlement

  BusinessSettings                    Currency, theme, dark mode,
                                      business details, logo

  SetupChecklistProgress              Per-user checklist completion

  MaterialCategory                    Material grouping

  Material                            Unit, pack cost, specifications,
                                      stock threshold

  InventoryTransaction                Restock, adjustment, consumption,
                                      reversal, source reference

  Printer                             Printer and ink configuration

  PrinterSupply                       Ink and other printer-related
                                      supplies

  PrintingTemplate                    External reusable template link

  CostingProject                      Named costing workspace

  CostingMaterial                     Material usage in a costing project

  PrintingCostEntry                   Printer, paper size, quality,
                                      coverage, sheets

  FinalPriceSet                       Sellable variation derived from a
                                      costing project

  PriceSetMaterial                    Material composition for a sellable
                                      variation

  ProductCategory                     Physical product category

  Bundle                              Bundle header and price

  BundleItem                          Product variation and quantity
                                      within bundle

  Promotion                           Discount/promo code and notes

  DigitalProduct                      Name, price, external link

  Customer                            Contact and address details

  Order                               Customer, dates, status,
                                      payment/delivery details

  OrderItem                           Product/bundle/digital item,
                                      quantity, price/cost snapshot

  OrderStatusHistory                  Status transition audit

  Sale                                Recognized sale linked to source
                                      order/transaction

  ExpenseCategory                     Expense classification

  Expense                             Amount, date, payment method,
                                      recurrence/source

  Subscription                        Customer, offering, start/end,
                                      status, renewal follow-up

  CalendarEntry                       Reminder/follow-up distinct from
                                      order dates

  BusinessDocument                    Invoice/receipt metadata and
                                      snapshots

  DocumentItem                        Document line items

  PaymentDetails                      Bank/GCash/account details

  MasterSheetLink                     User's optional external
                                      spreadsheet URL
  -----------------------------------------------------------------------

### 21.1 Data integrity recommendations

-   Add ownership/tenant identifiers to user-owned records according to
    the current project's tenancy model.
-   Use foreign keys and appropriate indexes.
-   Use unique constraints or idempotency keys where they prevent
    duplicate side effects.
-   Use soft deletion only where it fits existing behavior and audit
    needs; do not silently erase financial history.
-   Store source references for generated sales/expenses/inventory
    transactions.
-   Keep order/document snapshots so historical records do not change
    when catalog data changes.
-   Use database transactions for multi-record operations.
-   Avoid storing derived totals as independent truth unless they are
    deliberately snapshotted or reliably recalculated.

------------------------------------------------------------------------

## 22. Security, privacy, and reliability

-   Enforce authorization in every server action/API route.
-   Verify record ownership before reading or mutating a record.
-   Validate URLs for external links and avoid unsafe rendering.
-   Sanitize user-provided text where it enters HTML/PDF output.
-   Restrict file types and sizes for uploaded logos if uploads are
    supported.
-   Do not expose internal storage paths or secrets.
-   Do not log passwords, tokens, or sensitive customer information.
-   Protect against cross-user ID guessing/IDOR.
-   Use CSRF protections appropriate to the existing framework/auth
    approach.
-   Rate-limit sensitive endpoints where appropriate.
-   Ensure errors do not reveal database credentials or stack traces to
    end users.
-   Audit important financial and inventory changes.

------------------------------------------------------------------------

## 23. UI/UX expectations

Follow the existing application's visual language unless the audit
identifies a clear reason to improve it.

Across modules:

-   Use consistent page titles, actions, form layouts, tables/cards,
    filters, and status indicators.
-   Support desktop and mobile.
-   Make complex costing calculations understandable through grouped
    sections and visible formulas.
-   Use confirmation dialogs for destructive or financially significant
    actions.
-   Use clear labels for quantity units, currency, tax, payment status,
    and inventory adjustments.
-   Provide search/filter/sort/pagination when lists become large.
-   Provide helpful empty states and validation messages.
-   Preserve user-entered form data after recoverable validation errors.
-   Avoid unnecessary duplicate navigation or parallel pages for the
    same data.

------------------------------------------------------------------------

## 24. Implementation phases

Cursor should implement in this order unless the repository audit
identifies dependencies that require a different sequence. If the
sequence changes, explain why.

### Phase 0 --- Audit and baseline

-   Inspect repository and existing behavior.
-   Run baseline checks.
-   Produce `docs/REPOSITORY_AUDIT.md`.
-   Produce a requirement-to-code gap matrix.
-   Identify any database/documentation conflicts.
-   Do not begin a rewrite.

**Exit criteria:** Current architecture and existing functionality are
understood and documented.

### Phase 1 --- Foundation and workspace settings

-   Confirm data ownership/tenant isolation.
-   Implement or complete business settings.
-   Implement membership/access model only to the extent confirmed.
-   Implement setup checklist persistence and welcome/help content.
-   Establish shared currency/formatting and validation utilities.

**Exit criteria:** User settings persist, users cannot access other
users' data, and onboarding progress persists.

### Phase 2 --- Materials and inventory

-   Material categories and favorites.
-   Material CRUD/search/filter.
-   Pack/unit cost calculations.
-   Inventory overview and low-stock alerts.
-   Restock/update-to-new-total workflow.
-   Inventory transaction history.
-   Expense linkage for restocking.

**Exit criteria:** Material costs and stock updates are accurate,
traceable, and tested.

### Phase 3 --- Print Hub

-   Printer database.
-   Ink-cost configuration.
-   Printing cost calculation using verified formulas.
-   Printer supplies and purchase-to-expense flow.
-   External printing template links.

**Exit criteria:** Printer and supply data persist; printing assumptions
are visible; purchases do not create duplicate expenses.

### Phase 4 --- Product Costing

-   Costing projects/tabs.
-   Material costing lines.
-   Multiple printing entries.
-   Overage/setup/cutting inputs.
-   Production loss.
-   Operational fee.
-   Labor.
-   Packaging.
-   Cost breakdown and suggested price options.

**Exit criteria:** Costing calculations are tested and formulas are
approved/documented. Any unresolved formulas remain clearly marked as
provisional and must not be presented as confirmed business rules.

### Phase 5 --- Final price sets and catalog

-   Final price sets/product variations.
-   Per-variation material composition.
-   Physical product categories and catalog.
-   Bundle builder and bundle price calculations.
-   Promotion/discount calculator.
-   Digital product price list.

**Exit criteria:** Sellable catalog items are selectable by
orders/documents and retain correct material composition and price
snapshots.

### Phase 6 --- Customers and orders

-   Customer CRUD/search.
-   Order creation and editing.
-   Board stages and status history.
-   Desktop drag/drop and mobile status selector.
-   Payment/delivery details.
-   Reorder-as-new-order workflow.
-   Inventory deduction at the client-approved trigger.
-   Idempotent delivered-order sales creation.

**Exit criteria:** Complete order lifecycle works without duplicate
inventory deductions or sales.

### Phase 7 --- Invoices and receipts

-   Business/customer/document details.
-   Product/bundle/digital line items.
-   Discounts, shipping, payment details, optional tax.
-   Preview, print, PDF, PNG export.

**Exit criteria:** Generated documents match their persisted snapshots
and do not create duplicate financial transactions.

### Phase 8 --- Sales and finance

-   Sales log.
-   Expense categories and expense CRUD.
-   Recurring expense policy and scheduling if confirmed.
-   Subscription tracking and expiry follow-up.
-   Finance summaries and filters.
-   Dashboard metrics using shared financial services.

**Exit criteria:** Financial figures reconcile to their source records
and have tested date/filter behavior.

### Phase 9 --- Calendar and resources

-   Calendar view of shared order records.
-   New Order and New Entry flows.
-   Reminder/follow-up records.
-   Master Sheet instructions/link.
-   Welcome guide, FAQs, template library, community links, and annual
    access gating.

**Exit criteria:** Calendar and board stay synchronized; resource access
follows confirmed membership policy.

### Phase 10 --- Quality assurance and release readiness

-   End-to-end critical workflow tests.
-   Responsive checks.
-   Authorization and tenant-isolation tests.
-   Financial and inventory reconciliation tests.
-   Error/loading/empty-state checks.
-   Lint, type check, unit tests, integration tests, and production
    build.
-   Update README and technical documentation.
-   Provide deployment/migration notes and a list of required
    environment variables (names only; never values).

------------------------------------------------------------------------

## 25. Critical acceptance scenarios

Use these as end-to-end test cases. Adapt setup to the existing test
framework.

### Scenario A --- Material unit cost

Given a material pack with a known pack price and units per pack, when
the material is saved, the system calculates the correct unit cost. A
zero or negative pack quantity is rejected.

### Scenario B --- Material cost per finished item

Given a material quantity used, unit cost, and finished-product
quantity, the system calculates:

`quantity_used × cost_per_unit ÷ finished_product_quantity`

The result is displayed with an understandable breakdown.

### Scenario C --- Multiple printing entries

Given one costing project with a color cover entry and a black-and-white
insert entry, both entries are stored and included in the project's
printing total using their respective configured assumptions.

### Scenario D --- Multiple final price variations

Given one costing project, the user can create two sellable variations
with different material compositions. Each variation retains its own
assigned materials and prices.

### Scenario E --- Bundle calculation

Given products with known regular prices and costs, the bundle shows
combined regular price, combined cost, bundle price, customer savings,
and estimated profit correctly.

### Scenario F --- Discount

Given an original price of ₱300 and a 10% discount, the calculator
returns ₱270 and displays the ₱30 discount.

### Scenario G --- Order snapshot

Given a product price of X when an order is created, changing the
catalog price later must not change the historical order line price.

### Scenario H --- Inventory consumption

Given an order for a product variation with assigned material
quantities, the approved production trigger deducts the correct
quantities exactly once. Retrying the same transition must not deduct
again.

### Scenario I --- Cancellation/reversal

Once cancellation policy is approved, cancelling an order after stock
deduction creates the appropriate reversal exactly once. Do not
implement this policy based on guesswork.

### Scenario J --- Delivered sale

When an order reaches Delivered, the configured sales-recognition flow
records the sale exactly once. Repeating the transition or retrying the
request does not create a second sale.

### Scenario K --- Restock

Given a current stock quantity and a user-entered new total quantity,
the system sets the resulting stock to the entered total and records an
adjustment. It must not add that number to the previous quantity.

### Scenario L --- Purchase expense

A restock or printer-supply purchase can create a linked expense with
prefilled details. Repeating the request does not create a duplicate
expense.

### Scenario M --- Calendar consistency

An order created from the calendar appears on the Order Board. An order
created from the board appears on the calendar. Updating the order
updates both views without creating duplicate orders.

### Scenario N --- Tenant isolation

A user cannot retrieve, edit, delete, or infer another user's private
business records by changing an ID in a URL or request.

### Scenario O --- Financial reconciliation

Finance and dashboard totals are calculated from the same source records
and agree for the same date range and recognition rules.

------------------------------------------------------------------------

## 26. Client clarification register

These questions are not answered definitively by the walkthrough. Cursor
must not silently turn assumptions into permanent business rules.

  ------------------------------------------------------------------------
  ID                      Question                 Why it matters
  ----------------------- ------------------------ -----------------------
  C-01                    Are accounts exclusively Authentication and
                          created by the provider  onboarding
                          after purchase, or is    
                          self-registration        
                          allowed?                 

  C-02                    What happens when a      Access control and
                          quarterly/annual         renewal
                          membership expires?      

  C-03                    Can one account manage   Data model and settings
                          multiple                 
                          businesses/workspaces?   

  C-04                    What are the exact       Costing accuracy
                          formulas for overage and 
                          setup/cutting allowance? 

  C-05                    How is production loss   Costing accuracy
                          applied mathematically?  

  C-06                    What does labor = 100%   Costing accuracy
                          mean and which cost base 
                          is used?                 

  C-07                    Is the ₱10 operational   Costing accuracy
                          fee per item, batch, or  
                          production run?          

  C-08                    What are the exact       Printing cost
                          paper-size,              
                          print-quality, and       
                          ink-coverage             
                          multipliers? Are they    
                          configurable?            

  C-09                    When exactly is          Inventory integrity
                          inventory deducted:      
                          order creation, payment, 
                          or start of production?  

  C-10                    Can stock go below zero? Inventory validation

  C-11                    What happens to deducted Inventory reversal
                          stock when an order is   
                          cancelled?               

  C-12                    Is the 50% deposit/full  Order/payment workflow
                          payment requirement a    
                          hard rule or             
                          recommendation?          

  C-13                    Can Delivered orders be  Order lifecycle
                          edited or cancelled?     
                          What does Done mean?     

  C-14                    Are sales recorded only  Financial reporting
                          on Delivered for         
                          physical products? When  
                          are digital sales        
                          recognized?              

  C-15                    Are subscriptions actual Finance and
                          recurring payments or    integrations
                          manually tracked         
                          memberships?             

  C-16                    How should recurring     Expense scheduling
                          expenses create future   
                          records?                 

  C-17                    Are invoices/receipts    Data relationships
                          independent documents or 
                          generated from orders?   

  C-18                    Is VAT included in       Document and finance
                          prices or added on top?  calculations

  C-19                    Should calendar          Notification scope
                          reminders trigger        
                          email/push               
                          notifications?           

  C-20                    What exact permissions   Authorization
                          should provider/platform 
                          administrators have?     

  C-21                    Is the bundle price      Bundle validation
                          below production cost    
                          prohibited, or should it 
                          only show a warning?     

  C-22                    What is the exact        Onboarding accuracy
                          checklist wording and    
                          which action completes   
                          each of its 11 steps?    

  C-23                    Which external           Resources
                          community, Facebook, and 
                          template-library URLs    
                          should be configured?    

  C-24                    What is the required     Financial consistency
                          currency                 
                          rounding/display policy  
                          for each supported       
                          currency?                
  ------------------------------------------------------------------------

When a clarification blocks a feature, implement the safe surrounding
structure but leave the unresolved policy configurable or clearly
documented. Do not invent a definitive answer.

------------------------------------------------------------------------

## 27. Technical implementation deliverables

As work progresses, maintain these project documents:

1.  `docs/REPOSITORY_AUDIT.md` --- actual current architecture and
    existing feature inventory.
2.  `docs/REQUIREMENTS_TRACEABILITY.md` ---
    requirement-to-module-to-code mapping and status.
3.  `docs/ARCHITECTURE.md` --- actual architecture and important data
    flows.
4.  `docs/BUSINESS_RULES.md` --- approved formulas, statuses, financial
    rules, and unresolved assumptions.
5.  `docs/IMPLEMENTATION_PLAN.md` --- phased tasks and completion
    status.
6.  Update README/setup documentation when project behavior or setup
    changes.

Do not create duplicate documentation if equivalent files already exist;
update the existing ones.

For each implementation phase, report:

-   What was already present.
-   What was changed/added.
-   Files changed.
-   Database migration impact.
-   Tests run and results.
-   Known limitations.
-   Client decisions still needed.
-   Next recommended phase.

------------------------------------------------------------------------

## 28. Final instruction to Cursor

Start with **Phase 0 --- Repository Audit**. Read the existing code
before editing it.

Then create the repository audit and requirement traceability matrix.
Compare the actual project against this specification and identify the
smallest safe set of changes that moves the application toward the
requested behavior.

Do not rebuild the application from scratch. Do not replace the
database, authentication system, UI framework, or architecture without a
specific evidence-based reason and an explicit explanation.

Implement incrementally, preserve existing working features, test
critical calculations and workflows, and clearly distinguish: -
Requirements directly supported by the client walkthrough. - Engineering
recommendations made to protect data integrity/security. - Business
rules that still require client confirmation.

The goal is a reliable extension of the existing Creative Costwise
application, not an unrelated new application.
