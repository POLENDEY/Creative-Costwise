# Business rules

Rules below are either taken from the client walkthrough and already coded, or marked provisional. Clarification ids refer to section 26 of the implementation guide.

## Approved enough to run

- Pack unit cost is pack price divided by pieces per pack, rounded half up to minor units. Zero or negative pack size is rejected.
- Material cost on a finished item is units used times unit cost, divided by finished quantity.
- Restock replaces the on-hand quantity with the number the user types. It records the previous quantity, the new quantity, and one expense. Repeating the same request key does not create a second expense.
- A printer-supply purchase updates that supply’s last price and creates one expense. The same request key does not create a second expense.
- A crafter can star at most five material categories.
- A bundle price is chosen by the user. The regular price is the sum of retail prices times quantities. Savings are regular price minus bundle price. Profit is bundle price minus production cost. For the walkthrough numbers, ₱300 minus ₱244 is ₱56. A bundle price below cost is allowed and labeled.
- An order line stores the unit price and production cost from the moment it is saved. Editing the price list, bundle, or digital product later does not change that line. Changing the line on an open order uses the current price.
- The first move to Delivered writes one sale for that order. A later move to Delivered does not write another.
- A reorder starts a new order. The original order stays as it was.
- Money is integer minor units. Display uses `formatMoney`.

## Provisional (do not treat as confirmed)

- Paper size, quality, and coverage multipliers in `src/lib/costing.ts` (C-08).
- Overage, setup and cutting allowance, production loss, labor at 100 percent, and whether the operational fee is per item (C-04–C-07). The costing screen still calculates with the current code so existing projects keep working.
- Membership expiry currently locks the crafter out of the shop. Whether that remains the policy is C-02.
- Sales recognition on Delivered, tax, bundle prices below cost, and recurring expenses are not implemented (C-13, C-14, C-16, C-18, C-21).

## Not implemented on purpose

- Deducting material stock from a customer order, including cancellation reversal (C-09–C-11). No order board exists yet, and the guide forbids guessing the trigger.
