# Acceptance and test record

## Verified here

- TypeScript type checking and Vite production build.
- 13 automated tests pass: 12 domain tests and one DOM-level sale/refund workflow.
- Standalone browser demo bundle generated from the same application source.
- Automated domain tests in `tests/domain.test.ts`: measured stock; original bundle restoration; aggregated stock demand; payment idempotency; partial refund rounding; price history safety; void cash/stock effects; input rejection; weighted purchase cost; duplicate barcode/schema checks; clone-before-mutate rollback; purchase reversal.
- `tests/ui.test.ts` verifies opening a session, a measured sale, saved bill values and resellable refund stock restoration in a simulated DOM. It does not verify physical browser rendering.

## Not verified here

- Rust compilation or native SQLx execution: no Rust compiler is installed in the creation environment.
- Windows installer generation, signing, installation or upgrade.
- Visual rendering in a real browser: compatible browser installation was unavailable.
- Real scanner, receipt printer, label printer, cash drawer, scale or UPS tests.

## Required Windows acceptance run

Use a test store and test money first.

1. Compile and run the Tauri app; create the single owner account. Restart and verify unlock, incorrect-password attempts, password change and idle lock.
2. Add products with count/measured units, two barcodes, separate variant SKUs and a bundle. Duplicate SKUs/barcodes must fail.
3. Receive a multi-line purchase, restart and confirm stock. Correct an eligible purchase and verify the original record remains.
4. Open a cash session. Sell 0.512 kg and several count goods. Confirm amounts, change and exact stock. Combine a bundle and direct component near stock exhaustion; overselling must fail.
5. Apply item and bill discounts with/without tax. Check receipt totals independently.
6. Hold and recall a bill; navigate away with a draft and return. Restart with a held bill and verify it remains.
7. Repeat payment clicks; exactly one bill must exist. Simulate a crash after save and before printing; reprint the original invoice without another sale.
8. Complete partial resellable and damaged returns. Confirm no over-return and that cash, stock, reports and original bill history agree.
9. Void a fresh sale and check full reversal. Attempt a second void; it must fail.
10. Count stock to zero, adjust damaged goods, and verify the reason and quantity difference are recorded.
11. Record expenses, close the cash session with a known discrepancy, print the session summary, and verify expected cash = opening + cash sales − cash refunds − expenses.
12. Export reports with a custom date range and compare totals to sample receipts/refunds. Open CSV in Excel and check names/units.
13. Export a backup. Add a transaction. Restore the previous backup and check the intended rollback. Cancel the pre-restore export and verify no replacement occurred. Try invalid/corrupted JSON.
14. Leave the app open for over an hour and check the backup folder. Restore an automatic snapshot on a separate test installation.
15. Verify database and audit persistence after closing/reopening and after a controlled power interruption with a recoverable test dataset.
16. Verify 80 mm receipts, 50 × 30 mm labels, Tamil names, print reprints and printer-disconnected behavior using the final hardware/driver. Confirm the print dialog reports cancellation as cancellation, not failed sale.
17. Test the scanner Enter suffix, focus, fast repeated scans and unknown barcodes. Scale entry is manual. Add and test a native cash-drawer command if the deployment requires one; it is not implemented.
18. Check the layout at 1440 × 900, 1366 × 768, and your actual POS display. Check keyboard navigation and modal focus.
19. Test realistic transaction volumes before using the aggregate storage design for a busy store. Measure save times and backup size.

Production acceptance is not established until these checks pass on the target computer and hardware.
