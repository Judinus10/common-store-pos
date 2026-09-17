# Counter POS — Common Single-Store System

A general retail POS with a white-first interface, green actions, and dark text. Version 1 is for **one owner, one store, and one computer**. It is adapted from the supplied Poojai Store specification. There are no cashier accounts, role controls, branches, or cloud services in this release.

## Start here

This is a **development implementation with runnable frontend and Tauri desktop source**, not a verified Windows installer. The React build and automated tests have been run. Rust compilation, Windows operation, physical printer output, scanner behavior, and cash-drawer compatibility still require validation on your Windows machine.

For a quick look, open **`Counter_POS_Demo.html`** in Edge or Chrome. Choose **Open demo workspace**. This standalone demo includes general retail sample products and saves changes in that browser. It is for evaluation, not your live store database. If local file storage is blocked by your browser, use the development server below.

To try a sale:

1. Go to **Cash sessions → Open session** and enter an opening float.
2. Go to **Point of sale** and choose products. For rice, enter a weight such as `0.512` kg.
3. Charge the bill, enter cash received, and complete the sale.
4. Find the bill under **Sales & returns**. Reprint it or process a return.
5. Check Inventory and Reports; then reconcile the cash session.

## Run the frontend on Windows

Install Node.js 22 or newer. Extract the project, then open PowerShell in its folder:

```powershell
npm ci
npm run dev
```

Open `http://127.0.0.1:1420`. This browser mode uses localStorage and sample products. No server/database service needs configuration. Dependencies require internet for the initial installation.

## Run the actual desktop application

Install the Windows development prerequisites: Microsoft C++ Build Tools with the Desktop development with C++ workload, WebView2 Runtime, and Rust with the MSVC toolchain. Follow the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

```powershell
npm ci
npm run tauri dev
```

The desktop application starts with **an empty store**, not demo stock. Create the single owner password, edit Store details, create suppliers/products, receive opening stock, and open a cash session.

Build a Windows installer on Windows:

```powershell
npm run build
npm test
npm run tauri build
```

The NSIS installer is generated beneath `src-tauri/target/release/bundle/nsis/` after a successful build. No installer is included in this delivery. Rust dependencies are specified in Cargo.toml; generate and commit Cargo.lock on the first successful native build. Native build reproducibility has not yet been verified.

## Included workflows

- General products; categories; custom units; secondary/Tamil names; quick items; active/inactive states; independent variant SKUs; multiple barcodes.
- Generated internal barcodes and Code 128 label printing with selectable quantity.
- Search/USB keyboard-scanner entry, integer or measured quantities, cart editing, item amount discounts, bill amount/percentage discounts, optional added tax.
- Cash payment/change, persistent held bills, recoverable session draft, immutable saved bills, reprinting.
- Bundle component deductions, aggregate stock availability checks, original composition retained for returns.
- Stock receipts, physical counts, reasoned adjustments, movement history, low-stock lists, stock CSV export.
- Suppliers, multi-item purchases, weighted-average cost, purchase reversal with stock/value checks, purchase expiry reminders.
- Partial returns, resellable/non-resellable treatment, full voids, and exchange through return plus new sale.
- Owner cash sessions, expenses, counted/expected cash difference, printable session summary.
- Date-filtered reports for product/category sales, purchases, refunds, discounts, expenses and stock movement. CSV opens in Excel.
- Audit history, store/receipt settings, manual backup/restore, owner password change and idle locking in desktop mode.
- Rust + SQLx SQLite persistence, atomic compare-and-swap commits, hourly automatic JSON recovery snapshots while the desktop app is open.

## Stack and source map

| Area                   | Implementation                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Desktop                | Tauri 2 + Rust commands                                                             |
| Interface              | React + TypeScript + Vite; Tailwind CSS; custom accessible HTML/dialog primitives   |
| State/forms/validation | Zustand; React Hook Form for product editing; Zod domain schema                     |
| Local storage          | SQLite through SQLx in desktop mode; localStorage only in the labelled browser demo |
| Printing               | HTML receipts and session summaries; JsBarcode Code 128 labels                      |
| Exports                | CSV reports; JSON recovery backups                                                  |

The interface uses custom styled components, not shadcn/ui. There is no external UI service or online runtime asset dependency.

- `src/domain.ts`: calculations, stock, bundles, sales, refunds, purchases, validation.
- `src/storage.ts`: persistence boundary, browser/native selection, backup/export.
- `src/Checkout.tsx`: checkout and held bill flows.
- `src/Products.tsx`: catalogue, labels, adjustments and physical counts.
- `src/Management.tsx`: purchasing, suppliers, sessions, expenses, sales and reports.
- `src/App.tsx`: owner entry, navigation, settings and audit.
- `src/print.ts`: receipt and label templates.
- `src-tauri/src/lib.rs`: SQLite, password verification, commit boundary, automatic backups.
- `tests/`: calculation and workflow verification.
- `docs/`: revised scope, data model, acceptance checks and limitations.

## Data and recovery

Desktop data is in Tauri's per-user app-data directory for `com.counter.localpos` (normally under `%APPDATA%` on Windows). It includes `counter.db`, SQLite WAL files during operation, `backups/`, and `support.log`. The app creates these automatically. Do not copy the live database without its WAL; use the app's JSON backup export instead.

The SQLite database stores a versioned business-state document in one row plus a separate owner-password hash. Sales, cash, inventory and audit changes commit together. It is intentionally a single-device aggregate design; it is **not** a normalized multi-store database. The Rust boundary checks authentication, schema envelope and revision. Detailed domain validation and business rules are in TypeScript. See `docs/ARCHITECTURE.md` before expanding the application or exposing an API.

Automatic backups keep the most recent 30 hourly snapshots and only run while the app is open. They are on the same disk, so manually export a separate off-device copy. Restore validates the file, requires confirmation, and requires a successful export of current data first. Owner credentials are not in business backups; on a replacement PC create a new owner and restore business data. Backups and the SQLite file are unencrypted. Protect the Windows account/disk.

## Important boundaries before live use

- No Rust compiler or Windows host was available here; native source is supplied but uncompiled.
- Browser visual automation could not run because a compatible browser download was unavailable. Layout still needs review on target screens.
- Printing uses the operating-system print dialog. Silent ESC/POS printing, automatic drawer pulses, printer-specific paper switching and direct scale communication are not implemented.
- Scanner support assumes a USB keyboard-wedge scanner with an Enter suffix and focus in the search field. Weight is entered manually.
- Expiry reminders are purchase dates, not FEFO batch allocation or guaranteed remaining quantities per batch.
- Units do not automatically convert: stock and sales must use the same chosen unit. Separate variants are separate SKUs; no variant-group editor.
- Gross profit is an estimate from recorded sale costs. Non-resellable refunds keep their original cost in the estimate. Stock damage/write-offs are tracked but not automatically booked as accounting expenses.
- Purchasing records stock inward, not supplier cash payments or payables. Record a separate cash expense if money leaves the drawer.
- The aggregate database rewrites full state on each commit (100 MB hard limit); large transaction histories need a normalized SQLite schema and performance tests before scaling.
- Audit is append-only through the application, not tamper-proof against someone with filesystem access. Idle locking is controlled by the application frontend.
- No recovery bypass for a forgotten owner password. Keep your password securely and maintain external business backups.

Read `docs/ACCEPTANCE.md` before recording real transactions. Multiple users, cashier roles, multiple stores and synchronization are **version 2**, never enabled silently in version 1.
