# Revised specification — Common Single-Store POS

Source: the supplied `Poojai_Store_POS_System_Full_Specification(2).pdf`, eight pages. This file records the user's scope changes and the actual implementation boundaries.

## Mandatory scope changes

| Original wording                                 | Version 1 replacement                         |
| ------------------------------------------------ | --------------------------------------------- |
| Poojai Store / pooja-specific business           | Common retail store; owner can set store name |
| Admin / Owner and Cashier                        | One owner account with all operational access |
| Multiple logins, cashier PINs, role restrictions | Removed from V1                               |
| Cashier shifts                                   | Owner cash sessions                           |
| Reports by cashier                               | Store reports and owner session summaries     |
| Admin approval of cashier actions                | Owner confirmation with required reasons      |
| Pooja kits                                       | General product bundles with component stock  |
| Additional users / branches                      | Version 2 only                                |

White is the primary surface colour. Green supports actions, selection and positive status. Black/dark neutral text supports readability. There are no staff-management or store-switching features. The store-name button opens settings for the single store.

## Functional coverage

| PDF sections                  | Implementation                                                                                                   |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1 Objectives                  | General retail, single-device offline operation in desktop source                                                |
| 2 Security                    | Single owner password, lock, change password; roles/PINs removed                                                 |
| 3 Products                    | Product master, categories, free-form units, individual variant SKUs, multiple barcodes, quick items             |
| 4 Barcodes                    | Scan/search, generate internal code, Code 128 print labels                                                       |
| 5–6 POS / measured goods      | Cart, measured quantities, discounts, tax, cash, change, held bills and history                                  |
| 7 Bundles                     | General bundles; component checks/deductions and historical composition                                          |
| 8 Inventory                   | Stock movements, adjustments, per-product physical count, low stock, purchase expiry reminders                   |
| 9 Purchasing                  | Suppliers, multi-line receipts, average cost, controlled full reversal                                           |
| 10 Pricing                    | Cost/selling price, price audit, fixed item discount, fixed/percentage bill discount                             |
| 11 Returns / voids            | Partial returns, condition-based restock, full void, exchange via return plus new sale                           |
| 12–14 Cash                    | Owner cash sessions, expenses, cash-only payment, reconciliation                                                 |
| 15 Printing                   | Print dialog receipts and reprints; hardware-specific commands await integration                                 |
| 16 Reports                    | Date ranges, product/category net sales, purchases, expenses, refunds, discounts, movement CSV; session printing |
| 17 Storage / backup           | SQLite aggregate commit source, manual JSON backup/restore, hourly local snapshots                               |
| 18 Reliability                | Clone-before-mutate, integer quantities/money, validation, idempotency key, revision conflict detection          |
| 19–20 Workflows               | Replaced with the single-owner workflow in README                                                                |
| 21 Hardware                   | Keyboard-wedge scanner and manual weights; printer/drawer acceptance still required                              |
| 22–25 Boundaries / acceptance | Refer to README and ACCEPTANCE.md; no claim of production acceptance                                             |

## Version 2

- Multiple users, staff logins, cashier PINs, roles and approval permissions.
- Multiple stores/counters, store-specific stock, transfers and synchronization.
- Card, QR/bank, split payments and terminal integration.
- Remote dashboards, cloud backup, customer loyalty, advanced accounting integrations.

The V1 aggregate schema must be migrated before introducing shared multi-user state. Adding a user table alone is insufficient for V2 concurrency and synchronization.
