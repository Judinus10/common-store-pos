import test from "node:test";
import assert from "node:assert/strict";
import {
  demo,
  checkout,
  refund,
  voidSale,
  quote,
  expectedCash,
  product,
  saveProduct,
  purchase,
  validateState,
  toQty,
  id,
  State,
} from "../src/domain";
function setup() {
  const s = demo();
  s.sessions.push({
    id: "session",
    opened: new Date().toISOString(),
    opening: 100000,
    closed: null,
    counted: null,
    expected: null,
  });
  return s;
}
function sale(s: State, pid = "p0", qty = 1000) {
  return checkout(s, [{ productId: pid, qty, discount: 0 }], 0, 1000000, id());
}
test("measured quantity preserves exact thousandths and cents", () => {
  const s = setup();
  const before = product(s, "p0").stock;
  const x = sale(s, "p0", 512);
  assert.equal(x.total, 12288);
  assert.equal(product(s, "p0").stock, before - 512);
  assert.equal(x.lines[0].qty, 512);
});
test("bundles deduct components; original composition is preserved for refunds", () => {
  const s = setup();
  const before = s.products.map((p) => p.stock);
  const x = sale(s, "bundle1");
  assert.equal(product(s, "p0").stock, before[0] - 1000);
  assert.equal(product(s, "p3").stock, before[3] - 1000);
  product(s, "bundle1").components = [];
  refund(s, x.id, 0, 1000, true, "Customer return");
  assert.equal(product(s, "p0").stock, before[0]);
  assert.equal(product(s, "p3").stock, before[3]);
});
test("aggregate bundle and direct demand cannot oversell the same stock", () => {
  const s = setup();
  product(s, "p0").stock = 1000;
  assert.throws(
    () =>
      checkout(
        s,
        [
          { productId: "p0", qty: 1000, discount: 0 },
          { productId: "bundle1", qty: 1000, discount: 0 },
        ],
        0,
        1000000,
        id(),
      ),
    /Not enough stock/,
  );
  assert.equal(s.sales.length, 0);
  assert.equal(product(s, "p0").stock, 1000);
});
test("payment retry with same request ID creates exactly one bill", () => {
  const s = setup();
  const request = id();
  const cart = [{ productId: "p1", qty: 1000, discount: 0 }];
  const first = checkout(s, cart, 0, 100000, request);
  const stock = product(s, "p1").stock;
  const second = checkout(s, cart, 0, 100000, request);
  assert.equal(first.id, second.id);
  assert.equal(s.sales.length, 1);
  assert.equal(product(s, "p1").stock, stock);
});
test("partial refunds exactly sum to original total including rounded tax and discounts", () => {
  const s = setup();
  s.settings.taxBps = 875;
  const x = checkout(
    s,
    [{ productId: "p0", qty: 3000, discount: 127 }],
    119,
    1000000,
    id(),
  );
  refund(s, x.id, 0, 1000, true, "Part one");
  refund(s, x.id, 0, 1000, true, "Part two");
  refund(s, x.id, 0, 1000, true, "Part three");
  assert.equal(
    s.refunds.reduce((a, r) => a + r.amount, 0),
    x.total,
  );
  assert.equal(
    s.refunds.reduce((a, r) => a + r.tax, 0),
    x.tax,
  );
  assert.equal(expectedCash(s, "session"), 100000);
  assert.throws(() => refund(s, x.id, 0, 1000, true, "Extra"), /exceeds/);
});
test("refunds use original price and cost after prices change", () => {
  const s = setup();
  const x = sale(s);
  product(s, "p0").price = 999999;
  product(s, "p0").cost = 888888;
  refund(s, x.id, 0, 1000, false, "Damaged");
  assert.equal(s.refunds[0].amount, x.total);
  assert.equal(s.refunds[0].cost, x.lines[0].cost);
  assert.equal(product(s, "p0").stock, 51000);
});
test("void retains sale and balances cash and component stock", () => {
  const s = setup();
  const before = product(s, "p0").stock;
  const x = sale(s);
  voidSale(s, x.id, "Duplicate paper bill");
  assert.equal(s.sales.length, 1);
  assert.equal(s.sales[0].voided, true);
  assert.equal(product(s, "p0").stock, before);
  assert.equal(expectedCash(s, "session"), 100000);
  assert.throws(() => voidSale(s, x.id, "Again"), /already/);
});
test("invalid quantities, discounts, underpayment, and closed session are rejected", () => {
  const s = setup();
  assert.throws(() => sale(s, "p1", 500), /whole/);
  assert.throws(() => toQty("0.1234"), /3 decimal/);
  assert.throws(
    () => quote(s, [{ productId: "p0", qty: 1000, discount: 999999 }]),
    /discount/,
  );
  assert.throws(
    () =>
      checkout(s, [{ productId: "p0", qty: 1000, discount: 0 }], 0, 0, id()),
    /below/,
  );
  s.sessions = [];
  assert.throws(() => sale(s), /session/);
});
test("purchases update weighted average cost and preserve invoice", () => {
  const s = setup();
  const before = product(s, "p0").stock;
  purchase(s, "supplier1", "SUP-001", [
    { productId: "p0", qty: 10000, cost: 20000, expiry: "2027-01-01" },
  ]);
  assert.equal(product(s, "p0").stock, before + 10000);
  assert.equal(
    product(s, "p0").cost,
    Math.round((before * 19000 + 10000 * 20000) / (before + 10000)),
  );
  assert.equal(s.purchases[0].total, 200000);
  assert.throws(
    () =>
      purchase(s, "supplier1", "SUP-001", [
        { productId: "p0", qty: 1000, cost: 20000, expiry: "" },
      ]),
    /already/,
  );
});
test("duplicate barcodes and schema corruption rejected", () => {
  const s = setup();
  const p = structuredClone(product(s, "p1"));
  p.barcodes = product(s, "p0").barcodes;
  assert.throws(() => saveProduct(s, p), /Barcode/);
  assert.throws(() => validateState({ ...s, schemaVersion: 2 }));
  assert.throws(
    () => validateState({ ...s, products: [...s.products, s.products[0]] }),
    /Duplicate/,
  );
});
test("all mutations operate on a clone so rejected operations preserve saved data", () => {
  const saved = setup();
  const original = JSON.stringify(saved);
  const draft = structuredClone(saved);
  assert.throws(() =>
    purchase(draft, "supplier1", "BAD", [
      { productId: "p0", qty: 1000, cost: 20000, expiry: "" },
      { productId: "bundle1", qty: 1000, cost: 10000, expiry: "" },
    ]),
  );
  assert.equal(JSON.stringify(saved), original);
});
import { reversePurchase } from "../src/domain";
test("purchase correction preserves original and reverses stock", () => {
  const s = setup();
  const before = product(s, "p0").stock;
  purchase(s, "supplier1", "CORRECT", [
    { productId: "p0", qty: 1000, cost: 20000, expiry: "" },
  ]);
  const p = s.purchases[0];
  reversePurchase(s, p.id, "Wrong invoice");
  assert.equal(product(s, "p0").stock, before);
  assert.equal(p.reversed, true);
  assert.throws(() => reversePurchase(s, p.id, "Again"), /already/);
});
