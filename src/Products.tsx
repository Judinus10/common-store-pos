import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Search, Printer, Pencil, Package, Download } from "lucide-react";
import { useStore, csv, exportFile } from "./storage";
import {
  Product,
  available,
  id,
  money,
  quantity,
  saveProduct,
  toMoney,
  toQty,
  adjust,
} from "./domain";
import { Dialog, Empty, FormDialog, Heading, ProductArt, Stat } from "./ui";
import { printLabels } from "./print";
export default function Products({
  inventory = false,
  notify,
}: {
  inventory?: boolean;
  notify: (s: string) => void;
}) {
  const { data: s, mutate } = useStore();
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [edit, setEdit] = useState<Product | null | undefined>(),
    [modal, setModal] = useState(""),
    [selected, setSelected] = useState<Product | null>(null);
  if (!s) return null;
  const rows = s.products.filter(
    (p) =>
      [p.name, p.sku, p.category, ...p.barcodes]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "low" && available(s, p) <= p.reorder) ||
        (filter === "inactive" && !p.active) ||
        (filter === "bundles" && p.kind === "bundle")),
  );
  const stockValue = s.products
    .filter((p) => p.kind !== "bundle")
    .reduce((a, p) => a + Math.round((p.stock * p.cost) / 1000), 0);
  return (
    <div className="page">
      <Heading
        eyebrow="YOUR CATALOGUE"
        title={inventory ? "Inventory" : "Products"}
        detail={
          inventory
            ? "Know what is on the shelf, down to the last gram."
            : "Everything you sell, organised in one place."
        }
        actions={
          <>
            <button
              className="secondary"
              onClick={() =>
                exportFile(
                  "stock.csv",
                  csv([
                    [
                      "SKU",
                      "Product",
                      "Unit",
                      "Stock",
                      "Cost LKR",
                      "Price LKR",
                    ],
                    ...rows.map((p) => [
                      p.sku,
                      p.name,
                      p.unit,
                      available(s, p) / 1000,
                      p.cost / 100,
                      p.price / 100,
                    ]),
                  ]),
                  "text/csv",
                ).catch((e) => notify(e.message))
              }
            >
              <Download size={16} />
              Export
            </button>
            <button className="primary" onClick={() => setEdit(null)}>
              <Plus size={16} />
              Add product
            </button>
          </>
        }
      />
      <div className="stats">
        <Stat
          label="Total products"
          value={String(s.products.length)}
          detail="Every sellable variant has its own SKU"
        />
        <Stat
          label="Low stock"
          value={String(
            s.products.filter(
              (p) => p.active && p.kind !== "bundle" && p.stock <= p.reorder,
            ).length,
          )}
          detail="At or below reorder level"
        />
        <Stat
          label="Stock value"
          value={money(stockValue)}
          detail="Based on current average cost"
        />
      </div>
      <div className="panel">
        <div className="table-toolbar">
          <div className="searchbox compact">
            <Search size={18} />
            <input
              placeholder="Search products, SKU, or barcode"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Product filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All products</option>
            <option value="low">Low stock</option>
            <option value="bundles">Bundles</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU / Type</th>
                <th>Selling price</th>
                <th>Available</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="product-cell">
                      <ProductArt category={p.category} />
                      <div>
                        <strong>{p.name}</strong>
                        <small>
                          {p.category}
                          {p.secondary ? ` · ${p.secondary}` : ""}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {p.sku}
                    <small>
                      {p.kind} · {p.unit}
                    </small>
                  </td>
                  <td>
                    {money(p.price)}
                    <small>Cost {money(p.cost)}</small>
                  </td>
                  <td>
                    <strong>{quantity(available(s, p))}</strong> {p.unit}
                  </td>
                  <td>
                    <span
                      className={
                        "badge " +
                        (!p.active
                          ? "grey"
                          : available(s, p) <= p.reorder
                            ? "amber"
                            : "green")
                      }
                    >
                      {!p.active
                        ? "Inactive"
                        : available(s, p) <= p.reorder
                          ? "Low stock"
                          : "In stock"}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        title="Edit product"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEdit(p)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        title="Print labels"
                        aria-label={`Print labels ${p.name}`}
                        onClick={() => {
                          setSelected(p);
                          setModal("labels");
                        }}
                      >
                        <Printer size={16} />
                      </button>
                      {inventory && p.kind !== "bundle" && (
                        <button
                          className="text-btn"
                          onClick={() => {
                            setSelected(p);
                            setModal("adjust");
                          }}
                        >
                          Adjust / Count
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            title="No products here yet"
            detail="Add a product to start building your catalogue."
          />
        )}
      </div>
      {inventory && (
        <div className="panel spaced">
          <h2>Recent stock movements</h2>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Change</th>
                  <th>Reason</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {s.movements.slice(0, 50).map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.at).toLocaleString()}</td>
                    <td>
                      {s.products.find((p) => p.id === m.productId)?.name}
                    </td>
                    <td className={m.qty > 0 ? "green-text" : "warning-text"}>
                      {m.qty > 0 ? "+" : ""}
                      {quantity(m.qty)}
                    </td>
                    <td>{m.reason}</td>
                    <td>{m.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!s.movements.length && (
            <p className="muted">
              Purchases, sales, returns, and adjustments appear here.
            </p>
          )}
        </div>
      )}
      {edit !== undefined && (
        <ProductEditor value={edit} close={() => setEdit(undefined)} />
      )}
      {modal === "labels" && selected && (
        <FormDialog
          title={`Print labels · ${selected.name}`}
          fields={[
            {
              name: "count",
              label: "Number of labels",
              type: "number",
              min: 1,
              value: 1,
              step: "1",
            },
          ]}
          close={() => setModal("")}
          submit={(v) => printLabels(selected, Number(v.count))}
          button="Print labels"
        >
          <p className="muted">
            Code 128 labels. Select the correct label size in your printer
            driver.
          </p>
        </FormDialog>
      )}
      {modal === "adjust" && selected && (
        <FormDialog
          title={`Stock · ${selected.name}`}
          fields={[
            {
              name: "mode",
              label: "Action",
              options: [
                { value: "count", label: "Physical stock count" },
                { value: "add", label: "Increase stock" },
                { value: "remove", label: "Decrease stock" },
              ],
            },
            {
              name: "qty",
              label: `Quantity (${selected.unit})`,
              type: "number",
              min: 0,
              step: selected.kind === "measured" ? "0.001" : "1",
              value: selected.stock / 1000,
            },
            {
              name: "reason",
              label: "Reason",
              options: [
                "Counting correction",
                "Damaged",
                "Expired",
                "Missing",
                "Internal use",
                "Other",
              ].map((v) => ({ value: v, label: v })),
            },
            { name: "note", label: "Notes", required: false },
          ]}
          close={() => setModal("")}
          submit={async (v) => {
            const q = Number(v.qty) === 0 ? 0 : toQty(v.qty);
            await mutate((d) => {
              const current = d.products.find((p) => p.id === selected.id)!;
              adjust(
                d,
                selected.id,
                v.mode === "count"
                  ? q - current.stock
                  : v.mode === "remove"
                    ? -q
                    : q,
                `${v.mode === "count" ? "Physical count · " : ""}${v.reason}${v.note ? " · " + v.note : ""}`,
              );
            });
            notify("Stock updated.");
          }}
          button="Confirm stock change"
        >
          <p className="notice">
            System quantity: {quantity(selected.stock)} {selected.unit}. A
            physical count applies the difference and records it in stock
            history.
          </p>
        </FormDialog>
      )}
    </div>
  );
}
function ProductEditor({
  value,
  close,
}: {
  value: Product | null;
  close: () => void;
}) {
  const { data: s, mutate } = useStore();
  const { register, handleSubmit, setValue } = useForm<Record<string, string>>({
    defaultValues: value
      ? {
          name: value.name,
          secondary: value.secondary,
          sku: value.sku,
          category: value.category,
          unit: value.unit,
          price: String(value.price / 100),
          cost: String(value.cost / 100),
          reorder: String(value.reorder / 1000),
          barcodes: value.barcodes.join(", "),
          notes: value.notes,
        }
      : {
          category: "Grocery",
          unit: "pcs",
          price: "0",
          cost: "0",
          reorder: "5",
          sku: `PRD-${Date.now().toString().slice(-7)}`,
        },
  });
  const [kind, setKind] = useState<Product["kind"]>(value?.kind || "count"),
    [quick, setQuick] = useState(value?.quick ?? true),
    [active, setActive] = useState(value?.active ?? true),
    [components, setComponents] = useState(value?.components || []),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  if (!s) return null;
  return (
    <Dialog title={value ? "Edit product" : "Add product"} close={close}>
      <form
        onSubmit={handleSubmit(async (v) => {
          setSaving(true);
          setError("");
          try {
            await mutate((d) =>
              saveProduct(d, {
                id: value?.id || id(),
                name: v.name.trim(),
                secondary: v.secondary || "",
                sku: v.sku.trim(),
                barcodes: (v.barcodes || "")
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean),
                category: v.category.trim(),
                unit: v.unit.trim(),
                kind,
                price: toMoney(v.price),
                cost: toMoney(v.cost),
                stock: 0,
                reorder: Number(v.reorder) === 0 ? 0 : toQty(v.reorder),
                active,
                quick,
                components: kind === "bundle" ? components : [],
                notes: v.notes || "",
              }),
            );
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSaving(false);
          }
        })}
      >
        <div className="form-grid">
          <label>
            Product name
            <input required {...register("name")} />
          </label>
          <label>
            Secondary / Tamil name
            <input {...register("secondary")} />
          </label>
          <label>
            SKU / variant code
            <input required {...register("sku")} />
          </label>
          <label>
            Category
            <input required list="categories" {...register("category")} />
            <datalist id="categories">
              {[...new Set(s.products.map((p) => p.category))].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </datalist>
          </label>
          <label>
            Product type
            <select
              disabled={!!value}
              value={kind}
              onChange={(e) => setKind(e.target.value as Product["kind"])}
            >
              <option value="count">Count-based</option>
              <option value="measured">Measured goods</option>
              <option value="bundle">Bundle / kit</option>
            </select>
          </label>
          <label>
            Stock unit
            <input
              required
              readOnly={!!value}
              list="units"
              {...register("unit")}
            />
            <datalist id="units">
              {["pcs", "pack", "box", "kg", "g", "litre", "ml", "bottle"].map(
                (u) => (
                  <option key={u}>{u}</option>
                ),
              )}
            </datalist>
          </label>
          <label>
            Selling price (LKR)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              {...register("price")}
            />
          </label>
          <label>
            Cost price (LKR)
            <input
              required
              type="number"
              min="0"
              step="0.01"
              {...register("cost")}
            />
          </label>
          <label>
            Reorder level
            <input
              required
              type="number"
              min="0"
              step="0.001"
              {...register("reorder")}
            />
          </label>
          <label>
            Barcodes (comma separated)
            <input {...register("barcodes")} />
            <button
              type="button"
              className="text-btn"
              onClick={() => setValue("barcodes", "29" + Date.now().toString())}
            >
              Generate internal barcode
            </button>
          </label>
          <label className="span-2">
            Notes
            <textarea {...register("notes")} />
          </label>
        </div>
        {kind === "bundle" && (
          <div className="bundle-editor">
            <h3>Bundle components</h3>
            {components.map((c, i) => (
              <div className="inline-fields" key={i}>
                <select
                  aria-label="Component product"
                  value={c.productId}
                  onChange={(e) =>
                    setComponents(
                      components.map((x, j) =>
                        j === i ? { ...x, productId: e.target.value } : x,
                      ),
                    )
                  }
                >
                  {s.products
                    .filter((p) => p.kind !== "bundle")
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </option>
                    ))}
                </select>
                <input
                  aria-label="Component quantity"
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={c.qty / 1000}
                  onChange={(e) =>
                    setComponents(
                      components.map((x, j) =>
                        j === i
                          ? {
                              ...x,
                              qty: Math.round(Number(e.target.value) * 1000),
                            }
                          : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={() =>
                    setComponents(components.filter((_, j) => j !== i))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              className="secondary"
              disabled={!s.products.some((p) => p.kind !== "bundle")}
              onClick={() =>
                setComponents([
                  ...components,
                  {
                    productId: s.products.find((p) => p.kind !== "bundle")!.id,
                    qty: 1000,
                  },
                ])
              }
            >
              <Plus size={15} />
              Add component
            </button>
          </div>
        )}
        <div className="check-options">
          <label>
            <input
              type="checkbox"
              checked={quick}
              onChange={(e) => setQuick(e.target.checked)}
            />
            Show in Quick items
          </label>
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
        </div>
        <p className="muted">
          Receive starting stock through Purchases or Inventory. Each size or
          colour variant is a separate product with its own SKU.
        </p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button disabled={saving} className="primary">
            {saving ? "Saving…" : "Save product"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
