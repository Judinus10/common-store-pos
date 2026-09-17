import JsBarcode from "jsbarcode";
import { Sale, money, quantity, Product } from "./domain";
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function printDocument(html: string) {
  const old = document.getElementById("print-content");
  old?.remove();
  const el = document.createElement("div");
  el.id = "print-content";
  el.innerHTML = html;
  document.body.append(el);
  window.print();
}
export function printReceipt(s: Sale, reprint = false) {
  printDocument(
    `<div class="receipt"><h2>${escape(s.shop.name)}</h2><p>${escape(s.shop.address)}<br>${escape(s.shop.phone)}</p><hr><strong>${escape(s.number)} ${reprint ? "— REPRINT" : ""}</strong><p>${new Date(s.at).toLocaleString()}<br>Operator: Owner</p><hr>${s.lines.map((l) => `<p>${escape(l.name)}<br>${quantity(l.qty)} ${escape(l.unit)} × ${money(l.price)} <b>${money(l.total)}</b></p>`).join("")}<hr><p>Subtotal <b>${money(s.subtotal)}</b></p><p>Discount <b>${money(s.discount)}</b></p><p>Tax <b>${money(s.tax)}</b></p><h3>Total <b>${money(s.total)}</b></h3><p>Cash received <b>${money(s.received)}</b></p><p>Change <b>${money(s.change)}</b></p><hr><p>Thank you for shopping with us.</p>${s.voided ? "<h2>VOIDED</h2>" : ""}</div>`,
  );
}
export function printLabels(p: Product, count: number) {
  if (!p.barcodes[0]) throw Error("Save a barcode first.");
  if (!Number.isInteger(count) || count < 1 || count > 200)
    throw Error("Choose 1–200 labels.");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  JsBarcode(svg, p.barcodes[0], {
    format: "CODE128",
    height: 40,
    width: 1.4,
    fontSize: 12,
    margin: 4,
  });
  printDocument(
    Array.from(
      { length: count },
      () =>
        `<div class="label"><strong>${escape(p.name)}</strong><div>${svg.outerHTML}</div>${money(p.price)}</div>`,
    ).join(""),
  );
}
