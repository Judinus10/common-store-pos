import { useState } from "react";
import {
  Plus,
  Download,
  Printer,
  Search,
  ArrowUpRight,
  Wallet,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useStore, exportFile, csv } from "./storage";
import {
  State,
  Sale,
  id,
  now,
  money,
  quantity,
  toMoney,
  toQty,
  purchase,
  reversePurchase,
  activeSession,
  expectedCash,
  audit,
  returnedQty,
  refund,
  voidSale,
  available,
} from "./domain";
import { Dialog, Empty, FormDialog, Heading, Stat } from "./ui";
import { printReceipt, printDocument } from "./print";
export function Purchases({ notify }: { notify: (s: string) => void }) {
  const { data: s, mutate } = useStore();
  const [modal, setModal] = useState(""),
    [reversing, setReversing] = useState(""),
    [error, setError] = useState(""),
    [lines, setLines] = useState<
      { productId: string; qty: string; cost: string; expiry: string }[]
    >([]);
  if (!s) return null;
  const products = s.products.filter((p) => p.kind !== "bundle" && p.active);
  return (
    <div className="page">
      <Heading
        eyebrow="STOCK INWARD"
        title="Purchases"
        detail="Receive stock and keep your purchase costs up to date."
        actions={
          <button
            className="primary"
            disabled={!products.length || !s.suppliers.length}
            onClick={() => {
              setLines([
                {
                  productId: products[0].id,
                  qty: "1",
                  cost: String(products[0].cost / 100),
                  expiry: "",
                },
              ]);
              setError("");
              setModal("new");
            }}
          >
            <Plus size={16} />
            Receive stock
          </button>
        }
      />
      {(!products.length || !s.suppliers.length) && (
        <p className="notice">
          Add a product and a supplier before recording a purchase.
        </p>
      )}
      <div className="stats">
        <Stat
          label="Purchase entries"
          value={String(s.purchases.filter((x) => !x.reversed).length)}
          detail="Confirmed stock inward"
        />
        <Stat
          label="Purchased value"
          value={money(
            s.purchases
              .filter((x) => !x.reversed)
              .reduce((a, x) => a + x.total, 0),
          )}
          detail="All recorded purchases"
        />
        <Stat
          label="Suppliers"
          value={String(s.suppliers.length)}
          detail="Your supply network"
        />
      </div>
      <div className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Supplier</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {s.purchases.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.reference}</strong>
                    {p.reversed && <small>Reversed</small>}
                  </td>
                  <td>
                    {s.suppliers.find((x) => x.id === p.supplierId)?.name}
                  </td>
                  <td>{new Date(p.at).toLocaleDateString()}</td>
                  <td>{p.lines.length}</td>
                  <td>{money(p.total)}</td>
                  <td>
                    <button className="text-btn" onClick={() => setModal(p.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!s.purchases.length && (
          <Empty
            title="Your purchases will appear here"
            detail="Record supplier invoices as stock arrives."
          />
        )}
      </div>
      <div className="panel spaced">
        <h2>Expiry dates recorded on purchases</h2>
        <p className="muted">
          Purchase-batch dates are reminders. Check physical stock before
          disposal; this view does not allocate sales to batches.
        </p>
        {s.purchases.flatMap((p) =>
          p.lines
            .filter((l) => l.expiry)
            .map((l, i) => (
              <div className="list-row" key={p.id + i}>
                <span>
                  {s.products.find((x) => x.id === l.productId)?.name} ·{" "}
                  {p.reference}
                </span>
                <span
                  className={
                    "badge " +
                    (l.expiry < new Date().toLocaleDateString("en-CA")
                      ? "amber"
                      : "green")
                  }
                >
                  {l.expiry}
                </span>
              </div>
            )),
        )}
      </div>
      {modal === "new" && (
        <Dialog title="Receive stock" close={() => setModal("")}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const v = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              setError("");
              try {
                await mutate((d) =>
                  purchase(
                    d,
                    v.supplier,
                    v.reference,
                    lines.map((l) => ({
                      productId: l.productId,
                      qty: toQty(l.qty),
                      cost: toMoney(l.cost),
                      expiry: l.expiry,
                    })),
                  ),
                );
                setModal("");
                notify("Purchase saved and stock received.");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <div className="form-grid">
              <label>
                Supplier
                <select name="supplier">
                  {s.suppliers.map((v) => (
                    <option value={v.id} key={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Supplier invoice / reference
                <input name="reference" required />
              </label>
            </div>
            {lines.map((l, i) => (
              <div className="purchase-line" key={i}>
                <label>
                  Product
                  <select
                    value={l.productId}
                    onChange={(e) =>
                      setLines(
                        lines.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                productId: e.target.value,
                                cost: String(
                                  products.find((p) => p.id === e.target.value)!
                                    .cost / 100,
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.unit}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-grid">
                  {(["qty", "cost", "expiry"] as const).map((key) => (
                    <label key={key}>
                      {key === "qty"
                        ? "Quantity"
                        : key === "cost"
                          ? "Unit cost (LKR)"
                          : "Expiry (optional)"}
                      <input
                        required={key !== "expiry"}
                        type={key === "expiry" ? "date" : "number"}
                        min={key === "qty" ? "0.001" : "0"}
                        step={key === "qty" ? "0.001" : "0.01"}
                        value={l[key]}
                        onChange={(e) =>
                          setLines(
                            lines.map((x, j) =>
                              j === i ? { ...x, [key]: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  className="text-btn danger-text"
                  onClick={() => setLines(lines.filter((_, j) => j !== i))}
                >
                  Remove line
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              onClick={() =>
                setLines([
                  ...lines,
                  {
                    productId: products[0].id,
                    qty: "1",
                    cost: String(products[0].cost / 100),
                    expiry: "",
                  },
                ])
              }
            >
              <Plus size={16} />
              Add item
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <button className="primary" disabled={useStore.getState().busy}>
                Confirm purchase
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {!reversing &&
        modal &&
        modal !== "new" &&
        s.purchases.find((p) => p.id === modal) && (
          <Dialog title="Purchase details" close={() => setModal("")}>
            {s.purchases
              .find((p) => p.id === modal)!
              .lines.map((l, i) => (
                <div className="list-row" key={i}>
                  <div>
                    <strong>
                      {s.products.find((p) => p.id === l.productId)?.name}
                    </strong>
                    <p>
                      {quantity(l.qty)} × {money(l.cost)}{" "}
                      {l.expiry ? ` · Expires ${l.expiry}` : ""}
                    </p>
                  </div>
                  <strong>{money(Math.round((l.qty * l.cost) / 1000))}</strong>
                </div>
              ))}
            <p className="muted">
              Corrections preserve this invoice. Reverse the purchase, then
              enter the correct invoice if needed.
            </p>
            {!s.purchases.find((p) => p.id === modal)!.reversed && (
              <button
                className="secondary danger-text"
                onClick={() => setReversing(modal)}
              >
                Reverse purchase
              </button>
            )}
          </Dialog>
        )}
      {reversing && (
        <FormDialog
          title="Reverse purchase"
          fields={[{ name: "reason", label: "Reason for correction" }]}
          close={() => setReversing("")}
          submit={async (v) => {
            await mutate((d) => reversePurchase(d, reversing, v.reason));
            setModal("");
          }}
          button="Confirm reversal"
        >
          <p className="notice">
            This removes the received quantity and corrects the current stock
            cost. Original sales keep their recorded costs. Reversal requires
            enough stock and stock value.
          </p>
        </FormDialog>
      )}
    </div>
  );
}
export function Suppliers() {
  const { data: s, mutate } = useStore();
  const [edit, setEdit] = useState<
    State["suppliers"][number] | null | undefined
  >();
  if (!s) return null;
  return (
    <div className="page">
      <Heading
        eyebrow="YOUR SUPPLY NETWORK"
        title="Suppliers"
        detail="Keep supplier details close to your purchasing workflow."
        actions={
          <button className="primary" onClick={() => setEdit(null)}>
            <Plus size={16} />
            Add supplier
          </button>
        }
      />
      <div className="panel">
        <table>
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Address</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {s.suppliers.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                </td>
                <td>{p.phone || "—"}</td>
                <td>{p.email || "—"}</td>
                <td>{p.address || "—"}</td>
                <td>
                  <button className="text-btn" onClick={() => setEdit(p)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!s.suppliers.length && (
          <Empty
            title="Add your first supplier"
            detail="Keep contact details and purchase history together."
          />
        )}
      </div>
      {edit !== undefined && (
        <FormDialog
          title={edit ? "Edit supplier" : "Add supplier"}
          fields={[
            { name: "name", label: "Supplier name", value: edit?.name },
            {
              name: "phone",
              label: "Phone",
              value: edit?.phone,
              required: false,
            },
            {
              name: "email",
              label: "Email",
              value: edit?.email,
              type: "email",
              required: false,
            },
            {
              name: "address",
              label: "Address",
              value: edit?.address,
              required: false,
            },
          ]}
          close={() => setEdit(undefined)}
          submit={async (v) =>
            mutate((d) => {
              const p = {
                id: edit?.id || id(),
                name: v.name,
                phone: v.phone,
                email: v.email,
                address: v.address,
              };
              const existing = d.suppliers.find((x) => x.id === p.id);
              if (existing) Object.assign(existing, p);
              else d.suppliers.push(p);
              audit(d, "Supplier saved", p.name);
            })
          }
        />
      )}
    </div>
  );
}
export function Sessions({ expenses = false }: { expenses?: boolean }) {
  const { data: s, mutate } = useStore();
  const [modal, setModal] = useState("");
  if (!s) return null;
  const session = activeSession(s),
    expected = session ? expectedCash(s, session.id) : 0;
  return (
    <div className="page">
      <Heading
        eyebrow="CASH CONTROL"
        title={expenses ? "Expenses" : "Cash sessions"}
        detail={
          expenses
            ? "Every cash-out recorded. Every rupee accounted for."
            : "Open the drawer, trade, and reconcile at the end of the day."
        }
        actions={
          <>
            {session ? (
              <>
                <button
                  className="secondary"
                  onClick={() => setModal("expense")}
                >
                  <Plus size={16} />
                  Record expense
                </button>
                <button className="primary" onClick={() => setModal("close")}>
                  Close session
                </button>
              </>
            ) : (
              <button className="primary" onClick={() => setModal("open")}>
                <Wallet size={16} />
                Open session
              </button>
            )}
          </>
        }
      />
      <div className="stats">
        <Stat
          label="Session status"
          value={session ? "Open" : "Closed"}
          detail={
            session
              ? `Opened ${new Date(session.opened).toLocaleString()}`
              : "Open a session before taking cash"
          }
        />
        <Stat
          label="Opening float"
          value={money(session?.opening || 0)}
          detail="Cash in drawer at opening"
        />
        <Stat
          label="Expected drawer"
          value={money(expected)}
          detail="Opening + sales − refunds − expenses"
        />
      </div>
      <div className="panel">
        <h2>{expenses ? "Expense history" : "Session history"}</h2>
        <div className="table-scroll">
          {expenses ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {s.expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{new Date(e.at).toLocaleString()}</td>
                    <td>{e.category}</td>
                    <td>{e.reason}</td>
                    <td>{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Opening</th>
                  <th>Expected</th>
                  <th>Counted</th>
                  <th>Difference</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {s.sessions.map((x) => (
                  <tr key={x.id}>
                    <td>{new Date(x.opened).toLocaleString()}</td>
                    <td>
                      {x.closed ? (
                        new Date(x.closed).toLocaleString()
                      ) : (
                        <span className="badge green">Open</span>
                      )}
                    </td>
                    <td>{money(x.opening)}</td>
                    <td>{money(x.expected ?? expectedCash(s, x.id))}</td>
                    <td>{x.counted === null ? "—" : money(x.counted)}</td>
                    <td>
                      {x.counted === null
                        ? "—"
                        : money(x.counted - (x.expected ?? 0))}
                    </td>
                    <td>
                      <button
                        className="text-btn"
                        onClick={() =>
                          printDocument(
                            `<div class="receipt"><h2>Cash session summary</h2><p>${new Date(x.opened).toLocaleString()}</p><p>Opening: ${money(x.opening)}</p><p>Cash sales: ${money(s.sales.filter((v) => v.sessionId === x.id).reduce((a, v) => a + v.total, 0))}</p><p>Refunds: ${money(s.refunds.filter((v) => v.sessionId === x.id).reduce((a, v) => a + v.amount, 0))}</p><p>Expenses: ${money(s.expenses.filter((v) => v.sessionId === x.id).reduce((a, v) => a + v.amount, 0))}</p><p>Expected: ${money(x.expected ?? expectedCash(s, x.id))}</p><p>Counted: ${x.counted === null ? "Open session" : money(x.counted)}</p><p>Difference: ${x.counted === null ? "—" : money(x.counted - (x.expected ?? 0))}</p></div>`,
                          )
                        }
                      >
                        Print
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {modal === "open" && (
        <FormDialog
          title="Open cash session"
          fields={[
            {
              name: "opening",
              label: "Opening drawer cash (LKR)",
              type: "number",
              min: 0,
              step: "0.01",
              value: 0,
            },
          ]}
          close={() => setModal("")}
          submit={async (v) =>
            mutate((d) => {
              if (activeSession(d)) throw Error("A session is already open.");
              d.sessions.unshift({
                id: id(),
                opened: now(),
                opening: toMoney(v.opening),
                closed: null,
                counted: null,
                expected: null,
              });
              audit(d, "Session opened", money(toMoney(v.opening)));
            })
          }
          button="Open session"
        />
      )}
      {modal === "close" && (
        <FormDialog
          title="Close cash session"
          fields={[
            {
              name: "counted",
              label: "Physically counted cash (LKR)",
              type: "number",
              min: 0,
              step: "0.01",
            },
          ]}
          close={() => setModal("")}
          submit={async (v) =>
            mutate((d) => {
              const current = activeSession(d);
              if (!current) throw Error("No open session.");
              current.counted = toMoney(v.counted);
              current.expected = expectedCash(d, current.id);
              current.closed = now();
              audit(
                d,
                "Session closed",
                `Expected ${money(current.expected)}; counted ${money(current.counted)}; difference ${money(current.counted - current.expected)}`,
              );
            })
          }
          button="Confirm closing count"
        >
          <p className="notice">
            Expected drawer cash: <strong>{money(expected)}</strong>. A shortage
            or excess will be retained in the session record.
          </p>
        </FormDialog>
      )}
      {modal === "expense" && (
        <FormDialog
          title="Record cash expense"
          fields={[
            {
              name: "amount",
              label: "Amount (LKR)",
              type: "number",
              min: 0.01,
              step: "0.01",
            },
            {
              name: "category",
              label: "Category",
              value: "Transport",
              hint: "Enter an existing or new category.",
            },
            { name: "reason", label: "Description / reference" },
          ]}
          close={() => setModal("")}
          submit={async (v) =>
            mutate((d) => {
              const current = activeSession(d);
              if (!current) throw Error("Open a cash session first.");
              const amount = toMoney(v.amount);
              if (amount <= 0 || amount > expectedCash(d, current.id))
                throw Error(
                  "Expense must be positive and within expected drawer cash.",
                );
              d.expenses.unshift({
                id: id(),
                at: now(),
                sessionId: current.id,
                amount,
                category: v.category,
                reason: v.reason,
              });
              audit(
                d,
                "Expense recorded",
                `${v.category} · ${money(amount)} · ${v.reason}`,
              );
            })
          }
        />
      )}
    </div>
  );
}
export function Sales() {
  const { data: s, mutate } = useStore();
  const [search, setSearch] = useState(""),
    [date, setDate] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [action, setAction] = useState("");
  if (!s) return null;
  const sale = s.sales.find((x) => x.id === selected);
  const rows = s.sales.filter(
    (x) =>
      x.number.toLowerCase().includes(search.toLowerCase()) &&
      (!date || localDate(x.at) === date),
  );
  return (
    <div className="page">
      <Heading
        eyebrow="TRANSACTION HISTORY"
        title="Sales & returns"
        detail="Every bill preserved, with a clear trail for every correction."
      />
      <div className="panel">
        <div className="table-toolbar">
          <div className="searchbox compact">
            <Search size={18} />
            <input
              aria-label="Find invoice"
              placeholder="Search invoice number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            aria-label="Sale date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.id}>
                  <td>
                    <strong>{x.number}</strong>
                  </td>
                  <td>{new Date(x.at).toLocaleString()}</td>
                  <td>{x.lines.length}</td>
                  <td>{money(x.total)}</td>
                  <td>
                    <span className={"badge " + (x.voided ? "grey" : "green")}>
                      {x.voided
                        ? "Voided"
                        : s.refunds.some((r) => r.saleId === x.id)
                          ? "Refund recorded"
                          : "Paid · Cash"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-btn"
                      onClick={() => setSelected(x.id)}
                    >
                      View bill
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            title="No sales to show"
            detail="Completed cash sales appear here automatically."
          />
        )}
      </div>
      {sale && !action && (
        <Dialog title={sale.number} close={() => setSelected(null)}>
          <div className="list-row">
            <span>{new Date(sale.at).toLocaleString()}</span>
            <span className="badge green">
              {sale.voided ? "Voided" : "Cash"}
            </span>
          </div>
          {sale.lines.map((l, i) => (
            <div className="list-row" key={i}>
              <div>
                <strong>{l.name}</strong>
                <p>
                  {quantity(l.qty)} {l.unit} × {money(l.price)}
                </p>
                {returnedQty(s, sale.id, i) > 0 && (
                  <small>
                    Returned: {quantity(returnedQty(s, sale.id, i))}
                  </small>
                )}
              </div>
              <strong>{money(l.total)}</strong>
            </div>
          ))}
          <div className="list-row">
            <strong>Total {money(sale.total)}</strong>
            <span>Change {money(sale.change)}</span>
          </div>
          <div className="dialog-actions">
            <button
              className="secondary"
              onClick={() => printReceipt(sale, true)}
            >
              <Printer size={16} />
              Reprint
            </button>
            {!sale.voided && (
              <>
                <button
                  className="secondary"
                  onClick={() => setAction("refund")}
                >
                  Return item
                </button>
                <button
                  className="secondary danger-text"
                  onClick={() => setAction("void")}
                >
                  Void bill
                </button>
              </>
            )}
          </div>
          <p className="muted">
            For an exchange, return the original item, then create a new sale.
          </p>
          {s.refunds
            .filter((r) => r.saleId === sale.id)
            .map((r) => (
              <p key={r.id} className="notice">
                {new Date(r.at).toLocaleString()} · Refund {money(r.amount)} ·{" "}
                {r.reason} · {r.restock ? "Restocked" : "Not restocked"}
              </p>
            ))}
        </Dialog>
      )}
      {sale && action === "refund" && (
        <FormDialog
          title={`Return · ${sale.number}`}
          fields={[
            {
              name: "line",
              label: "Original bill item",
              options: sale.lines.map((l, i) => ({
                value: String(i),
                label: `${l.name} · ${quantity(l.qty - returnedQty(s, sale.id, i))} ${l.unit} remaining`,
              })),
            },
            {
              name: "qty",
              label: "Return quantity",
              type: "number",
              min: 0.001,
              step: "0.001",
              value: 1,
            },
            {
              name: "restock",
              label: "Condition",
              options: [
                { value: "yes", label: "Resellable — return to stock" },
                { value: "no", label: "Damaged — do not restock" },
              ],
            },
            { name: "reason", label: "Reason for return" },
          ]}
          close={() => setAction("")}
          submit={async (v) =>
            mutate((d) =>
              refund(
                d,
                sale.id,
                Number(v.line),
                toQty(v.qty),
                v.restock === "yes",
                v.reason,
              ),
            )
          }
          button="Confirm cash refund"
        >
          <p className="notice">
            Refund uses the original price, discounts, and tax. An open cash
            session is required.
          </p>
        </FormDialog>
      )}
      {sale && action === "void" && (
        <FormDialog
          title={`Void ${sale.number}?`}
          fields={[{ name: "reason", label: "Reason for void" }]}
          close={() => setAction("")}
          submit={async (v) => mutate((d) => voidSale(d, sale.id, v.reason))}
          button="Void and reverse sale"
        >
          <p className="notice">
            This reverses the full cash sale and restores its stock. Confirm
            that goods are present and cash is returned. The bill remains in
            history.
          </p>
        </FormDialog>
      )}
    </div>
  );
}
export function localDate(at: string) {
  const d = new Date(at);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function Reports({
  dashboard = false,
  navigate,
  notify,
}: {
  dashboard?: boolean;
  navigate?: (v: string) => void;
  notify: (s: string) => void;
}) {
  const { data: s } = useStore();
  const [from, setFrom] = useState(localDate(now())),
    [to, setTo] = useState(localDate(now())),
    [tab, setTab] = useState("Products");
  if (!s) return null;
  const within = (at: string) => localDate(at) >= from && localDate(at) <= to;
  const sales = s.sales.filter((x) => within(x.at)),
    refunds = s.refunds.filter((x) => within(x.at)),
    expenses = s.expenses.filter((x) => within(x.at));
  const revenue =
      sales.reduce((a, x) => a + x.total, 0) -
      refunds.reduce((a, x) => a + x.amount, 0),
    tax =
      sales.reduce((a, x) => a + x.tax, 0) -
      refunds.reduce((a, x) => a + x.tax, 0),
    cost =
      sales.flatMap((x) => x.lines).reduce((a, x) => a + x.cost, 0) -
      refunds.filter((x) => x.restock).reduce((a, x) => a + x.cost, 0),
    spent = expenses.reduce((a, x) => a + x.amount, 0);
  const stats = s.products
    .map((p) => {
      const lines = sales
        .flatMap((x) => x.lines)
        .filter((l) => l.productId === p.id);
      const returns = refunds.filter(
        (r) =>
          s.sales.find((x) => x.id === r.saleId)?.lines[r.lineIndex]
            ?.productId === p.id,
      );
      return {
        p,
        qty:
          lines.reduce((a, x) => a + x.qty, 0) -
          returns.reduce((a, x) => a + x.qty, 0),
        revenue:
          lines.reduce((a, x) => a + x.total, 0) -
          returns.reduce((a, x) => a + x.amount, 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
  const low = s.products.filter(
    (p) => p.active && p.kind !== "bundle" && p.stock <= p.reorder,
  );
  const headers = [
    "Product",
    "Category",
    "Unit",
    "Net quantity",
    "Net sales LKR",
  ];
  let rows: (string | number)[][] = stats.map((x) => [
    x.p.name,
    x.p.category,
    x.p.unit,
    x.qty / 1000,
    x.revenue / 100,
  ]);
  let columns = headers;
  if (tab === "Categories") {
    columns = ["Category", "Net sales LKR"];
    rows = [...new Set(stats.map((x) => x.p.category))].map((c) => [
      c,
      stats
        .filter((x) => x.p.category === c)
        .reduce((a, x) => a + x.revenue, 0) / 100,
    ]);
  }
  if (tab === "Purchases") {
    columns = ["Reference", "Supplier", "Date", "Total LKR"];
    rows = s.purchases
      .filter((x) => !x.reversed && within(x.at))
      .map((x) => [
        x.reference,
        s.suppliers.find((p) => p.id === x.supplierId)?.name || "",
        localDate(x.at),
        x.total / 100,
      ]);
  }
  if (tab === "Refunds") {
    columns = ["Invoice", "Date", "Quantity", "Reason", "Refund LKR"];
    rows = refunds.map((x) => [
      s.sales.find((p) => p.id === x.saleId)?.number || "",
      localDate(x.at),
      x.qty / 1000,
      x.reason,
      x.amount / 100,
    ]);
  }
  if (tab === "Expenses") {
    columns = ["Date", "Category", "Description", "Amount LKR"];
    rows = expenses.map((x) => [
      localDate(x.at),
      x.category,
      x.reason,
      x.amount / 100,
    ]);
  }
  if (tab === "Discounts") {
    columns = ["Invoice", "Date", "Discount LKR"];
    rows = sales
      .filter((x) => x.discount > 0)
      .map((x) => [x.number, localDate(x.at), x.discount / 100]);
  }
  if (tab === "Stock movements") {
    columns = ["Date", "Product", "Quantity change", "Reason", "Reference"];
    rows = s.movements
      .filter((x) => within(x.at))
      .map((x) => [
        localDate(x.at),
        s.products.find((p) => p.id === x.productId)?.name || "",
        x.qty / 1000,
        x.reason,
        x.reference,
      ]);
  }
  return (
    <div className="page">
      <Heading
        eyebrow={
          dashboard ? "YOUR STORE AT A GLANCE" : "MAKE INFORMED DECISIONS"
        }
        title={dashboard ? "Store overview" : "Reports"}
        detail={
          dashboard
            ? "A clear view of your business, without the noise."
            : "Sales, costs, stock, and cash — in one place."
        }
        actions={
          dashboard ? (
            <button
              className="primary"
              onClick={() => navigate?.("Point of sale")}
            >
              New sale
              <ArrowUpRight size={16} />
            </button>
          ) : (
            <button
              className="secondary"
              onClick={() =>
                exportFile(
                  `${tab.toLowerCase().replaceAll(" ", "-")}-${from}-${to}.csv`,
                  csv([columns, ...rows]),
                  "text/csv",
                ).catch((e) => notify(e.message))
              }
            >
              <Download size={16} />
              Export CSV
            </button>
          )
        }
      />
      <div className="date-range">
        <button
          className="secondary"
          onClick={() => {
            setFrom(localDate(now()));
            setTo(localDate(now()));
          }}
        >
          Today
        </button>
        <button
          className="secondary"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() - 6);
            setFrom(localDate(d.toISOString()));
            setTo(localDate(now()));
          }}
        >
          Last 7 days
        </button>
        <button
          className="secondary"
          onClick={() => {
            setFrom(localDate(now()).slice(0, 8) + "01");
            setTo(localDate(now()));
          }}
        >
          This month
        </button>
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            min={from}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
      <div className="stats four">
        <Stat
          label="Net sales"
          value={money(revenue)}
          detail={`${sales.length} bills · refunds deducted`}
        />
        <Stat
          label="Gross profit estimate"
          value={money(revenue - tax - cost)}
          detail="Net sales less tax and recorded cost"
        />
        <Stat
          label="Expenses"
          value={money(spent)}
          detail="Recorded operational cash-outs"
        />
        <Stat
          label="Net after expenses"
          value={money(revenue - tax - cost - spent)}
          detail="Estimate; not full accounting"
        />
      </div>
      {dashboard ? (
        <div className="overview-grid">
          <div className="panel">
            <h2>Top products</h2>
            <p className="muted">By net sales in the selected period</p>
            {stats
              .filter((x) => x.revenue > 0)
              .slice(0, 5)
              .map((x, i) => (
                <div className="rank-row" key={x.p.id}>
                  <span className="rank">{i + 1}</span>
                  <div>
                    <strong>{x.p.name}</strong>
                    <div className="bar-track">
                      <span
                        style={{
                          width: `${(x.revenue / (stats[0]?.revenue || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <b>{money(x.revenue)}</b>
                </div>
              ))}
            {!sales.length && (
              <Empty
                title="Your next sale starts the story"
                detail="Complete a sale to see your best-selling products here."
              />
            )}
          </div>
          <div className="panel">
            <div className="section-caption">
              <h2>Time to restock</h2>
              <span className="badge amber">{low.length} items</span>
            </div>
            {low.slice(0, 6).map((p) => (
              <div className="list-row" key={p.id}>
                <div>
                  <strong>{p.name}</strong>
                  <p>
                    Reorder at {quantity(p.reorder)} {p.unit}
                  </p>
                </div>
                <b className="warning-text">
                  {quantity(p.stock)} {p.unit}
                </b>
              </div>
            ))}
            {!low.length && (
              <Empty
                title="Stock levels look good"
                detail="Low-stock products will be listed here."
              />
            )}
            <button
              className="text-btn"
              onClick={() => navigate?.("Inventory")}
            >
              View inventory →
            </button>
          </div>
        </div>
      ) : (
        <div className="panel">
          <div className="category-tabs">
            {[
              "Products",
              "Categories",
              "Purchases",
              "Refunds",
              "Expenses",
              "Discounts",
              "Stock movements",
            ].map((t) => (
              <button
                key={t}
                className={tab === t ? "selected" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {columns.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j}>{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && (
            <Empty
              title="No records in this period"
              detail="Change the date range to see other records."
            />
          )}
        </div>
      )}
      <p className="muted spaced">
        Returns appear on the date the refund was processed. Product reports
        include zero-sale items to help identify slow movers. CSV files open in
        Excel.
      </p>
    </div>
  );
}
