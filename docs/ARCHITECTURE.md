# Architecture and integrity

## Storage flow

React forms → domain command on a cloned state → Zod/invariant checks → persistence adapter → Rust owner check + revision check → SQLx SQLite transaction → UI updates only after commit.

Browser demo uses the same domain commands but localStorage instead of SQLite. The demo is identified in the UI and contains sample catalogue data only. The actual desktop store starts empty.

## SQLite tables

| Table          | Purpose                                                     |
| -------------- | ----------------------------------------------------------- |
| owner          | A single row, id=1, Argon2 password hash                    |
| business_state | A single row, id=1, integer revision and JSON data document |

The JSON document holds settings, products, suppliers, purchases, sales, refunds, sessions, expenses, movements, audit records, held carts and the next invoice sequence. Schema version is 1. Authentication is outside the recovery document.

SQLite uses WAL and FULL synchronous mode. A conditional update inside a transaction checks the expected revision. A second window cannot silently overwrite the first. If commit fails, the UI keeps the previous persisted state. No HTTP service is started in the desktop build.

This design keeps a single owner/device implementation simple, but rewrites all business data on each action. It is not appropriate for large data volumes or concurrent users. The native command validates the envelope and revision; business validation is in TypeScript, not independently duplicated in Rust. Do not expose these commands to untrusted remote clients. The desktop command boundary is not a replacement for OS account and file permissions.

## Exact values

- Money: integer cents. LKR 12.50 = 1250.
- Quantity: integer thousandths of the configured stock unit. 0.512 kg = 512.
- Count goods/bundles require multiples of 1000.
- Tax: integer basis points. 8.75% = 875.
- Each line's extended price rounds once to a cent.
- Bill discount allocation uses cumulative proportions, ensuring allocated cents sum to the entered discount.
- Partial refunds use cumulative rounding, so all partial refunds together equal the original total and tax.
- Each product uses one stock unit; conversions are deliberately not automatic.

## Sales and stock

Sale quote resolves products, prices, discounts, tax and component consumption. Checkout aggregates direct and bundle demand before verifying stock, preventing a direct product and bundle from overselling the same components. The complete sale, movements and stock commit together. Completed sales are preserved.

A unique request ID prevents the same payment command creating another sale. The UI also serializes mutations and disables payment during persistence. A lost native response can produce a revision conflict; lock/reopen and inspect bill history before trying another payment. This release does not retry an ambiguous native commit automatically.

Stock cost is weighted-average cost on purchase. Each sale records its historical cost; later price changes do not alter profit history. A returned sale records original cost, tax and value. Resellable returns reverse cost in gross-profit reporting; damaged returns keep original cost because the goods were not recovered. Separate stock write-offs are not automatically included as operating expenses.

Bundles store their component consumption on the sale. Later edits to bundle composition cannot change how an old sale restocks. Nested bundles are rejected.

## Corrections

Returns reference the original sale and line, quantity, original-value refund, condition, reason and the current cash session. Return quantity cannot exceed what was sold. A void is a full stock-and-cash reversal. Bills with existing returns cannot be voided a second time.

Purchase corrections retain the original invoice and mark it reversed. Reversal requires sufficient current stock/value, updates average cost, records movements and leaves already completed sales unchanged. Enter a corrected invoice afterward. Reversal is not a supplier refund or accounting journal. The purchases report excludes currently reversed invoices; it is an operational report, not an immutable period ledger.

## Backup and restore

Hourly background snapshots query committed JSON from SQLite and write a temporary file before renaming. The 30 most recent files are retained. The scheduler runs only while the application is open. Failure writes support.log; this release does not have an automatic-backup health dashboard.

Restore validates the schema and key invariants, asks the owner to export current data, then replaces the business document using the current revision and adds a restore audit entry. Cancelling the pre-restore export cancels replacement. JSON backups contain business data only, not the owner password hash. Backup files are not encrypted.

## Extension rules

Before V2, normalize entity/ledger tables, move authoritative business commands into Rust, add versioned migrations, benchmark substantial histories, and add native transaction/recovery tests. Then design store-level stock identities, authentication/permissions, and conflict resolution. Do not merely add a store selector to this implementation.
