import { useEffect, useRef, useState } from "react";
import {
  Search,
  ScanLine,
  Plus,
  Minus,
  Trash2,
  Pause,
  ArrowRight,
  ShoppingBasket,
  RotateCcw,
  Check,
  Printer,
} from "lucide-react";
import { useStore } from "./storage";
import {
  CartLine,
  Product,
  Sale,
  available,
  checkout,
  id,
  money,
  quantity,
  quote,
  toMoney,
  toQty,
  activeSession,
  audit,
  now,
} from "./domain";
import { Dialog, Empty, FormDialog, Heading, ProductArt } from "./ui";
import { printReceipt } from "./print";
export default function Checkout({
  notify,
}: {
  notify: (text: string) => void;
}) {
  const { data: s, mutate, busy } = useStore();
  const [cart, setCart] = useState<CartLine[]>(() => {
      try {
        return JSON.parse(sessionStorage.getItem("counter-draft") || "[]");
      } catch {
        return [];
      }
    }),
    [category, setCategory] = useState("All products"),
    [search, setSearch] = useState(""),
    [discount, setDiscount] = useState(
      () => sessionStorage.getItem("counter-discount") || "0",
    ),
    [discountMode, setDiscountMode] = useState(
      () => sessionStorage.getItem("counter-discount-mode") || "amount",
    ),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<Product | null>(null),
    [paid, setPaid] = useState<Sale | null>(null),
    [received, setReceived] = useState(""),
    [payError, setPayError] = useState("");
  const req = useRef(id());
  const scan = useRef<HTMLInputElement>(null);
  useEffect(() => {
    sessionStorage.setItem("counter-draft", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    sessionStorage.setItem("counter-discount", discount);
    sessionStorage.setItem("counter-discount-mode", discountMode);
  }, [discount, discountMode]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        scan.current?.focus();
      }
      if (e.key === "F4") {
        e.preventDefault();
        if (cart.length) setModal("pay");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart]);
  if (!s) return null;
  const resolvedDiscount = () => {
    if (discountMode === "amount") return toMoney(discount);
    const percent = Number(discount);
    if (!Number.isFinite(percent) || percent < 0 || percent > 100)
      throw Error("Discount percentage must be 0–100.");
    const q = quote(s, cart, 0);
    return Math.round(((q.subtotal - q.discount) * percent) / 100);
  };
  let total = 0,
    subtotal = 0,
    tax = 0,
    discountTotal = 0,
    quoteError = "";
  try {
    if (cart.length) {
      const q = quote(s, cart, resolvedDiscount());
      total = q.total;
      subtotal = q.subtotal;
      tax = q.tax;
      discountTotal = q.discount;
    }
  } catch (e) {
    quoteError = (e as Error).message;
  }
  const categories = [
    "All products",
    "Quick items",
    ...new Set(s.products.filter((p) => p.active).map((p) => p.category)),
  ];
  const filtered = s.products.filter(
    (p) =>
      p.active &&
      (category === "All products" ||
        (category === "Quick items" && p.quick) ||
        p.category === category) &&
      [p.name, p.secondary, p.sku, ...p.barcodes]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  function add(p: Product, qty = 1000) {
    setCart((old) => {
      const current = old.find((l) => l.productId === p.id);
      return current
        ? old.map((l) =>
            l.productId === p.id ? { ...l, qty: l.qty + qty } : l,
          )
        : [...old, { productId: p.id, qty, discount: 0 }];
    });
    setSearch("");
    req.current = id();
    scan.current?.focus();
  }
  function pick(p: Product) {
    if (p.kind === "measured") {
      setSelected(p);
      setModal("weight");
    } else add(p);
  }
  const change = (index: number, delta: number) => {
    setCart((old) =>
      old.map((l, i) =>
        i === index ? { ...l, qty: Math.max(1000, l.qty + delta) } : l,
      ),
    );
    req.current = id();
  };
  async function pay() {
    if (!s || busy) return;
    setPayError("");
    try {
      let sale: Sale | undefined;
      await mutate((d) => {
        sale = checkout(
          d,
          cart,
          resolvedDiscount(),
          toMoney(received),
          req.current,
        );
      });
      setCart([]);
      setDiscount("0");
      setReceived("");
      setModal("");
      setPaid(sale!);
      req.current = id();
      if (s.settings.autoPrint) {
        try {
          printReceipt(sale!);
        } catch {
          notify("Sale saved. Printing failed; reprint from sales history.");
        }
      }
    } catch (e) {
      setPayError((e as Error).message);
    }
  }
  return (
    <>
      <div className="checkout-layout">
        <section className="catalogue">
          <Heading
            eyebrow="YOUR COUNTER, SIMPLIFIED"
            title="Point of sale"
            detail="A good day starts with a smooth checkout."
            actions={
              <button className="secondary" onClick={() => setModal("held")}>
                <Pause size={16} />
                Held bills <span className="count">{s.held.length}</span>
              </button>
            }
          />
          <div className="searchbox">
            <Search size={19} />
            <input
              ref={scan}
              autoFocus
              placeholder="Search products or scan a barcode…"
              aria-label="Search products or scan barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const p = s.products.find(
                    (x) =>
                      x.active &&
                      (x.barcodes.includes(search) ||
                        x.sku.toLowerCase() === search.toLowerCase()),
                  );
                  if (p) pick(p);
                  else if (search)
                    notify(
                      "No exact barcode or SKU found. Select a search result.",
                    );
                }
              }}
            />
            <kbd>F2</kbd>
            <ScanLine size={21} />
          </div>
          <div className="category-tabs">
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="section-caption">
            <span>
              {category} <b>{filtered.length}</b>
            </span>
            <small>Prices in LKR</small>
          </div>
          <div className="product-grid">
            {filtered.map((p) => (
              <button
                className="product-card"
                key={p.id}
                onClick={() => pick(p)}
                disabled={available(s, p) <= 0}
              >
                <ProductArt category={p.category} />
                <span className="product-category">
                  {p.category}
                  {p.kind === "measured" ? " · Weighed" : ""}
                </span>
                <strong>{p.name}</strong>
                <div className="product-price">
                  <b>{money(p.price)}</b>
                  <span>/{p.unit}</span>
                </div>
                <div className="product-bottom">
                  <small
                    className={
                      available(s, p) <= p.reorder ? "warning-text" : ""
                    }
                  >
                    {quantity(available(s, p))} {p.unit} in stock
                  </small>
                  <span className="add-icon">
                    <Plus size={16} />
                  </span>
                </div>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <Empty
              title="No products found"
              detail="Try another name, SKU, or barcode."
            />
          )}
          <div className="catalogue-footer">
            <span>
              <span className="live-dot" />
              All changes saved on this device
            </span>
            <span>One store. One simple workspace.</span>
          </div>
        </section>
        <aside className="bill">
          <div className="bill-head">
            <div>
              <h2>
                Current bill <span className="count">{cart.length}</span>
              </h2>
              <p>Walk-in customer</p>
            </div>
            <ShoppingBasket size={24} />
          </div>
          <div className="bill-status">
            <span className="live-dot" />
            New sale <span>Cash payment</span>
          </div>
          <div className="cart-lines">
            {cart.length ? (
              cart.map((l, i) => {
                const p = s.products.find((x) => x.id === l.productId);
                return (
                  <div className="cart-line" key={l.productId}>
                    <div className="cart-line-top">
                      <strong>{p?.name || "Unavailable product"}</strong>
                      <button
                        className="icon-btn"
                        aria-label={`Remove ${p?.name}`}
                        onClick={() => setCart(cart.filter((_, j) => j !== i))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <small>
                      {money(p?.price || 0)} / {p?.unit}
                    </small>
                    <div className="cart-line-bottom">
                      <div className="qty-stepper">
                        {p?.kind !== "measured" && (
                          <button
                            aria-label={`Reduce ${p?.name}`}
                            onClick={() => change(i, -1000)}
                          >
                            <Minus size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelected(p || null);
                            setModal(`edit-${i}`);
                          }}
                        >
                          {quantity(l.qty)}{" "}
                          {p?.kind === "measured" ? p.unit : ""}
                        </button>
                        {p?.kind !== "measured" && (
                          <button
                            aria-label={`Increase ${p?.name}`}
                            onClick={() => change(i, 1000)}
                          >
                            <Plus size={12} />
                          </button>
                        )}
                      </div>
                      <strong>
                        {money(
                          Math.round(((p?.price || 0) * l.qty) / 1000) -
                            l.discount,
                        )}
                      </strong>
                    </div>
                    {l.discount > 0 && (
                      <small className="green-text">
                        Discount {money(l.discount)}
                      </small>
                    )}
                  </div>
                );
              })
            ) : (
              <Empty
                title="Ready for your first item"
                detail="Scan a barcode or choose a product to start a bill."
              />
            )}
          </div>
          <div className="bill-summary">
            <div>
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </div>
            <div>
              <label htmlFor="discount">
                Bill discount{" "}
                <select
                  aria-label="Discount type"
                  value={discountMode}
                  onChange={(e) => {
                    setDiscountMode(e.target.value);
                    setDiscount("0");
                  }}
                >
                  <option value="amount">LKR</option>
                  <option value="percent">%</option>
                </select>
              </label>
              <input
                id="discount"
                type="number"
                min="0"
                step="0.01"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
              />
            </div>
            {discountTotal > 0 && (
              <div>
                <span>Total discount</span>
                <b>−{money(discountTotal)}</b>
              </div>
            )}
            <div>
              <span>Tax ({s.settings.taxBps / 100}%)</span>
              <b>{money(tax)}</b>
            </div>
            <div className="grand-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            {quoteError && <p className="error">{quoteError}</p>}
            <button
              className="primary pay-button"
              disabled={!cart.length || !!quoteError}
              onClick={() => {
                setReceived((total / 100).toFixed(2));
                setPayError("");
                setModal("pay");
              }}
            >
              Charge {money(total)}
              <ArrowRight size={19} />
            </button>
            <div className="bill-actions">
              <button
                className="secondary"
                disabled={!cart.length}
                onClick={() => setModal("hold")}
              >
                <Pause size={15} />
                Hold bill
              </button>
              <button
                className="secondary"
                disabled={!cart.length}
                onClick={() => setModal("clear")}
              >
                <RotateCcw size={15} />
                Clear
              </button>
            </div>
            <p className="shortcut">
              F2 Search products <span>·</span> F4 Take payment
            </p>
          </div>
        </aside>
      </div>
      {modal === "weight" && selected && (
        <FormDialog
          title={`Weigh ${selected.name}`}
          fields={[
            {
              name: "qty",
              label: `Quantity (${selected.unit})`,
              type: "number",
              value: "0.500",
              min: 0.001,
              step: "0.001",
            },
          ]}
          close={() => setModal("")}
          submit={(v) => add(selected, toQty(v.qty))}
          button="Add to bill"
        >
          <p className="muted">
            Enter the weight shown on your scale. {money(selected.price)} per{" "}
            {selected.unit}.
          </p>
        </FormDialog>
      )}
      {modal.startsWith("edit-") && (
        <FormDialog
          title="Edit bill item"
          fields={[
            {
              name: "qty",
              label: `Quantity (${selected?.unit})`,
              type: "number",
              value: cart[Number(modal.slice(5))].qty / 1000,
              min: 0.001,
              step: selected?.kind === "measured" ? "0.001" : "1",
            },
            {
              name: "discount",
              label: "Item discount (LKR)",
              type: "number",
              value: cart[Number(modal.slice(5))].discount / 100,
              min: 0,
              step: "0.01",
            },
          ]}
          close={() => setModal("")}
          submit={(v) => {
            const qty = toQty(v.qty);
            if (selected?.kind !== "measured" && qty % 1000)
              throw Error("Enter a whole-number quantity.");
            const d = toMoney(v.discount);
            if (d > Math.round(((selected?.price || 0) * qty) / 1000))
              throw Error("Discount exceeds item total.");
            setCart(
              cart.map((l, i) =>
                i === Number(modal.slice(5)) ? { ...l, qty, discount: d } : l,
              ),
            );
          }}
        />
      )}
      {modal === "hold" && (
        <FormDialog
          title="Hold this bill"
          fields={[
            {
              name: "label",
              label: "Bill label",
              value: `Customer ${s.held.length + 1}`,
            },
          ]}
          close={() => setModal("")}
          submit={async (v) => {
            await mutate((d) => {
              d.held.push({
                id: id(),
                at: now(),
                label: v.label,
                lines: cart,
                discount: resolvedDiscount(),
              });
            });
            setCart([]);
            setDiscount("0");
          }}
          button="Hold bill"
        />
      )}
      {modal === "held" && (
        <Dialog title="Held bills" close={() => setModal("")}>
          {s.held.length ? (
            s.held.map((h) => (
              <div className="list-row" key={h.id}>
                <div>
                  <strong>{h.label}</strong>
                  <p>
                    {h.lines.length} items ·{" "}
                    {new Date(h.at).toLocaleTimeString()}
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={cart.length > 0}
                  onClick={async () => {
                    try {
                      await mutate((d) => {
                        d.held = d.held.filter((x) => x.id !== h.id);
                      });
                      setCart(h.lines);
                      setDiscountMode("amount");
                      setDiscount(String(h.discount / 100));
                      req.current = id();
                      setModal("");
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Recall
                </button>
              </div>
            ))
          ) : (
            <Empty
              title="No held bills"
              detail="Hold a bill when a customer needs more time."
            />
          )}
          {cart.length > 0 && (
            <p className="notice">
              Hold or clear the current bill before recalling another one.
            </p>
          )}
        </Dialog>
      )}
      {modal === "clear" && (
        <FormDialog
          title="Clear current bill?"
          fields={[]}
          close={() => setModal("")}
          submit={() => {
            setCart([]);
            setDiscount("0");
          }}
          button="Clear bill"
        >
          <p>Remove all items from this unfinished bill?</p>
        </FormDialog>
      )}
      {modal === "pay" && (
        <Dialog title="Take cash payment" close={() => setModal("")}>
          <div className="payment-total">
            <span>Amount due</span>
            <strong>{money(total)}</strong>
          </div>
          {!activeSession(s) && (
            <p className="notice">
              Open a session from Cash sessions before completing this sale.
            </p>
          )}
          <label>
            Cash received (LKR)
            <input
              autoFocus
              type="number"
              min="0"
              step="0.01"
              value={received}
              onChange={(e) => setReceived(e.target.value)}
            />
          </label>
          <div className="cash-shortcuts">
            {[
              total,
              Math.ceil(total / 100000) * 100000,
              Math.ceil(total / 500000) * 500000,
            ]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((v) => (
                <button
                  className="secondary"
                  key={v}
                  onClick={() => setReceived(String(v / 100))}
                >
                  {money(v)}
                </button>
              ))}
          </div>
          <div className="change-row">
            <span>Change</span>
            <strong>
              {money(
                Math.max(0, Math.round(Number(received || 0) * 100) - total),
              )}
            </strong>
          </div>
          {payError && (
            <p className="error" role="alert">
              {payError}
            </p>
          )}
          <button
            className="primary full-width"
            disabled={busy || !activeSession(s)}
            onClick={pay}
          >
            {busy ? "Saving sale…" : "Complete cash sale"}
          </button>
          <p className="muted">
            The sale is saved before receipt printing starts.
          </p>
        </Dialog>
      )}
      {paid && (
        <Dialog title="Sale completed" close={() => setPaid(null)}>
          <div className="success-icon">
            <Check />
          </div>
          <div className="payment-total">
            <span>{paid.number}</span>
            <strong>{money(paid.total)}</strong>
            <p>
              Change to give: <b>{money(paid.change)}</b>
            </p>
          </div>
          <div className="dialog-actions">
            <button
              className="secondary"
              onClick={() => printReceipt(paid, true)}
            >
              <Printer size={16} />
              Print receipt
            </button>
            <button className="primary" onClick={() => setPaid(null)}>
              Next sale
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
