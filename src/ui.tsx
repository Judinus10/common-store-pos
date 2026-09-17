import React, { useEffect, useRef } from "react";
import {
  X,
  Package,
  ShoppingBag,
  Coffee,
  Droplets,
  Wheat,
  BookOpen,
  Milk,
  Leaf,
} from "lucide-react";
export type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  options?: { value: string; label: string }[];
  required?: boolean;
  min?: number;
  step?: string;
  hint?: string;
};
export function Dialog({
  title,
  children,
  close,
}: {
  title: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <div className="dialog-head">
        <h2>{title}</h2>
        <button className="icon-btn" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Fields({ fields }: { fields: Field[] }) {
  return (
    <div className="form-grid">
      {fields.map((f) => (
        <label key={f.name} className={f.type === "textarea" ? "span-2" : ""}>
          {f.label}
          {f.options ? (
            <select
              name={f.name}
              defaultValue={f.value}
              required={f.required !== false}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type === "textarea" ? (
            <textarea
              name={f.name}
              defaultValue={f.value}
              required={f.required !== false}
            />
          ) : (
            <input
              name={f.name}
              type={f.type || "text"}
              defaultValue={f.value}
              min={f.min}
              step={f.step}
              required={f.required !== false}
            />
          )}
          <small>{f.hint}</small>
        </label>
      ))}
    </div>
  );
}
export function FormDialog({
  title,
  fields,
  close,
  submit,
  button = "Save",
  children,
}: {
  title: string;
  fields: Field[];
  close: () => void;
  submit: (values: Record<string, string>) => Promise<void> | void;
  button?: string;
  children?: React.ReactNode;
}) {
  const [error, setError] = React.useState(""),
    [busy, setBusy] = React.useState(false);
  return (
    <Dialog title={title} close={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          try {
            await submit(
              Object.fromEntries(new FormData(e.currentTarget)) as Record<
                string,
                string
              >,
            );
            close();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to save.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Fields fields={fields} />
        {children}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            {busy ? "Saving…" : button}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <ShoppingBag size={32} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
export function ProductArt({ category }: { category: string }) {
  const Icon =
    (
      {
        Grocery: Wheat,
        Dairy: Milk,
        Bakery: Wheat,
        Beverages: Coffee,
        Household: Droplets,
        Stationery: BookOpen,
        "Personal care": Leaf,
        Bundles: ShoppingBag,
      } as Record<string, typeof Package>
    )[category] || Package;
  return (
    <div
      className={
        "product-art cat-" + category.toLowerCase().replaceAll(" ", "-")
      }
    >
      <Icon strokeWidth={1.15} />
    </div>
  );
}
export function Heading({
  eyebrow,
  title,
  detail,
  actions,
}: {
  eyebrow?: string;
  title: string;
  detail: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      <div className="actions">{actions}</div>
    </div>
  );
}
export function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
