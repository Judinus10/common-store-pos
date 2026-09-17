import { z } from "zod";
const integer = z.number().int().safe();
const nonnegative = integer.nonnegative();
const component = z.object({ productId: z.string(), qty: integer.positive() });
export const productSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  secondary: z.string(),
  sku: z.string().min(1),
  barcodes: z.array(z.string()),
  category: z.string().min(1),
  unit: z.string().min(1),
  kind: z.enum(["count", "measured", "bundle"]),
  cost: nonnegative,
  price: nonnegative,
  stock: nonnegative,
  reorder: nonnegative,
  active: z.boolean(),
  quick: z.boolean(),
  components: z.array(component),
  notes: z.string(),
});
export type Product = z.infer<typeof productSchema>;
const cartLine = z.object({
  productId: z.string(),
  qty: integer.positive(),
  discount: nonnegative,
});
export type CartLine = z.infer<typeof cartLine>;
const saleLine = z.object({
  productId: z.string(),
  name: z.string(),
  unit: z.string(),
  qty: integer.positive(),
  price: nonnegative,
  cost: nonnegative,
  discount: nonnegative,
  net: nonnegative,
  tax: nonnegative,
  total: nonnegative,
  consumption: z.array(component),
});
const saleSchema = z.object({
  id: z.string(),
  number: z.string(),
  at: z.string(),
  sessionId: z.string(),
  requestId: z.string(),
  lines: z.array(saleLine),
  subtotal: nonnegative,
  discount: nonnegative,
  tax: nonnegative,
  total: nonnegative,
  received: nonnegative,
  change: nonnegative,
  shop: z.object({ name: z.string(), address: z.string(), phone: z.string() }),
  voided: z.boolean(),
});
export type Sale = z.infer<typeof saleSchema>;
const refundSchema = z.object({
  id: z.string(),
  saleId: z.string(),
  lineIndex: nonnegative,
  qty: integer.positive(),
  amount: nonnegative,
  cost: nonnegative,
  tax: nonnegative,
  restock: z.boolean(),
  reason: z.string(),
  at: z.string(),
  sessionId: z.string(),
  void: z.boolean(),
});
const sessionSchema = z.object({
  id: z.string(),
  opened: z.string(),
  opening: nonnegative,
  closed: z.string().nullable(),
  counted: nonnegative.nullable(),
  expected: integer.nullable(),
});
export const stateSchema = z.object({
  schemaVersion: z.literal(1),
  revision: nonnegative,
  settings: z.object({
    name: z.string().min(1),
    address: z.string(),
    phone: z.string(),
    taxBps: nonnegative.max(10000),
    autoPrint: z.boolean(),
  }),
  products: z.array(productSchema),
  suppliers: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1),
      phone: z.string(),
      email: z.string(),
      address: z.string(),
    }),
  ),
  sales: z.array(saleSchema),
  refunds: z.array(refundSchema),
  sessions: z.array(sessionSchema),
  expenses: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      sessionId: z.string(),
      amount: integer.positive(),
      category: z.string(),
      reason: z.string(),
    }),
  ),
  purchases: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      supplierId: z.string(),
      reference: z.string(),
      lines: z.array(
        z.object({
          productId: z.string(),
          qty: integer.positive(),
          cost: nonnegative,
          expiry: z.string(),
        }),
      ),
      total: nonnegative,
      reversed: z.boolean(),
    }),
  ),
  movements: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      productId: z.string(),
      qty: integer,
      reason: z.string(),
      reference: z.string(),
    }),
  ),
  audit: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      action: z.string(),
      detail: z.string(),
    }),
  ),
  held: z.array(
    z.object({
      id: z.string(),
      at: z.string(),
      label: z.string(),
      lines: z.array(cartLine),
      discount: nonnegative,
    }),
  ),
  nextInvoice: integer.positive(),
});
export type State = z.infer<typeof stateSchema>;
export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const money = (c: number) =>
  new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(
    c / 100,
  );
export const quantity = (q: number) => Number((q / 1000).toFixed(3)).toString();
export function toMoney(v: string | number) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 1e10)
    throw Error("Enter a valid amount.");
  return Math.round(n * 100);
}
export function toQty(v: string | number) {
  const n = Number(v);
  if (
    !Number.isFinite(n) ||
    n <= 0 ||
    n > 1e9 ||
    Math.abs(n * 1000 - Math.round(n * 1000)) > 0.0001
  )
    throw Error("Enter a positive quantity with up to 3 decimal places.");
  return Math.round(n * 1000);
}
export function audit(s: State, action: string, detail: string) {
  s.audit.unshift({ id: id(), at: now(), action, detail });
}
export function blank(): State {
  return {
    schemaVersion: 1,
    revision: 0,
    settings: {
      name: "My Store",
      address: "",
      phone: "",
      taxBps: 0,
      autoPrint: true,
    },
    products: [],
    suppliers: [],
    sales: [],
    refunds: [],
    sessions: [],
    expenses: [],
    purchases: [],
    movements: [],
    audit: [],
    held: [],
    nextInvoice: 1,
  };
}
export function demo(): State {
  const s = blank();
  s.settings.name = "Everyday Store";
  s.settings.address = "42 Main Street, Jaffna";
  s.settings.phone = "021 222 0123";
  s.settings.autoPrint = false;
  const rows: [string, string, string, number, number, number, string][] = [
    ["White rice", "Grocery", "kg", 240, 190, 52, "measured"],
    ["Fresh milk · 1 L", "Dairy", "pack", 480, 390, 24, "count"],
    ["Brown bread", "Bakery", "pcs", 220, 165, 18, "count"],
    ["Red lentils", "Grocery", "kg", 360, 285, 38.5, "measured"],
    ["Sunflower oil · 1 L", "Grocery", "bottle", 890, 720, 16, "count"],
    ["Ceylon tea · 200 g", "Beverages", "pack", 650, 510, 28, "count"],
    ["Laundry soap", "Household", "pcs", 180, 125, 7, "count"],
    ["Mineral water · 1 L", "Beverages", "bottle", 160, 105, 32, "count"],
    ["Cream crackers", "Snacks", "pack", 280, 215, 21, "count"],
    ["Notebook · A5", "Stationery", "pcs", 240, 160, 8, "count"],
    ["White sugar", "Grocery", "kg", 290, 230, 42, "measured"],
    ["Shampoo · 180 ml", "Personal care", "bottle", 720, 570, 12, "count"],
  ];
  s.products = rows.map((r, i) => ({
    id: `p${i}`,
    name: r[0],
    secondary: "",
    sku: `PRD-${String(i + 1).padStart(3, "0")}`,
    barcodes: [`200000000${String(i + 1).padStart(3, "0")}`],
    category: r[1],
    unit: r[2],
    price: r[3] * 100,
    cost: r[4] * 100,
    stock: r[5] * 1000,
    reorder: 10000,
    kind: r[6] as Product["kind"],
    active: true,
    quick: i < 8,
    components: [],
    notes: "",
  }));
  s.products.push({
    id: "bundle1",
    name: "Everyday essentials pack",
    secondary: "",
    sku: "KIT-001",
    barcodes: ["200000000099"],
    category: "Bundles",
    unit: "pack",
    price: 65000,
    cost: 0,
    stock: 0,
    reorder: 0,
    kind: "bundle",
    active: true,
    quick: true,
    components: [
      { productId: "p0", qty: 1000 },
      { productId: "p3", qty: 1000 },
      { productId: "p6", qty: 1000 },
    ],
    notes: "",
  });
  s.suppliers = [
    {
      id: "supplier1",
      name: "Northern Wholesale",
      phone: "021 222 0300",
      email: "",
      address: "Jaffna",
    },
  ];
  audit(s, "Demo loaded", "Sample catalogue only. No fabricated sales.");
  return s;
}
export function product(s: State, pid: string) {
  const p = s.products.find((p) => p.id === pid);
  if (!p) throw Error("Product no longer exists.");
  return p;
}
export function available(s: State, p: Product): number {
  return p.kind === "bundle"
    ? p.components.length
      ? Math.min(
          ...p.components.map((c) =>
            Math.floor(product(s, c.productId).stock / c.qty),
          ),
        ) * 1000
      : 0
    : p.stock;
}
function validQty(p: Product, q: number) {
  if (
    !Number.isSafeInteger(q) ||
    q <= 0 ||
    (p.kind !== "measured" && q % 1000 !== 0)
  )
    throw Error(
      `${p.name}: enter ${p.kind === "measured" ? "a positive quantity" : "a whole number"}.`,
    );
}
function move(s: State, pid: string, qty: number, reason: string, ref: string) {
  const p = product(s, pid);
  if (!Number.isSafeInteger(p.stock + qty) || p.stock + qty < 0)
    throw Error(`Not enough stock: ${p.name}.`);
  p.stock += qty;
  s.movements.unshift({
    id: id(),
    at: now(),
    productId: pid,
    qty,
    reason,
    reference: ref,
  });
}
export function quote(s: State, cart: CartLine[], billDiscount = 0) {
  if (!cart.length) throw Error("Add at least one item.");
  let lines = cart.map((l) => {
    const p = product(s, l.productId);
    if (!p.active) throw Error(`${p.name} is inactive.`);
    validQty(p, l.qty);
    const gross = Math.round((p.price * l.qty) / 1000);
    if (
      !Number.isSafeInteger(l.discount) ||
      l.discount < 0 ||
      l.discount > gross
    )
      throw Error("Line discount exceeds the line total.");
    if (p.kind === "bundle" && !p.components.length)
      throw Error("Bundle has no components.");
    const consumption =
      p.kind === "bundle"
        ? p.components.map((c) => {
            const cp = product(s, c.productId);
            if (!cp.active)
              throw Error(`Bundle component ${cp.name} is inactive.`);
            return { productId: c.productId, qty: (c.qty * l.qty) / 1000 };
          })
        : [{ productId: p.id, qty: l.qty }];
    const cost = consumption.reduce(
      (a, c) => a + Math.round((product(s, c.productId).cost * c.qty) / 1000),
      0,
    );
    return {
      productId: p.id,
      name: p.name,
      unit: p.unit,
      qty: l.qty,
      price: p.price,
      cost,
      discount: l.discount,
      net: gross - l.discount,
      tax: 0,
      total: 0,
      consumption,
    };
  });
  const subtotal = lines.reduce(
    (a, l) => a + Math.round((l.price * l.qty) / 1000),
    0,
  );
  const afterLines = lines.reduce((a, l) => a + l.net, 0);
  if (
    !Number.isSafeInteger(billDiscount) ||
    billDiscount < 0 ||
    billDiscount > afterLines
  )
    throw Error("Bill discount exceeds the subtotal.");
  let allocated = 0;
  let cumulative = 0;
  lines = lines.map((l) => {
    cumulative += l.net;
    const upto = afterLines
      ? Math.round((billDiscount * cumulative) / afterLines)
      : 0;
    const extra = upto - allocated;
    allocated = upto;
    l.discount += extra;
    l.net -= extra;
    l.tax = Math.round((l.net * s.settings.taxBps) / 10000);
    l.total = l.net + l.tax;
    return l;
  });
  const discount = lines.reduce((a, l) => a + l.discount, 0),
    tax = lines.reduce((a, l) => a + l.tax, 0),
    total = lines.reduce((a, l) => a + l.total, 0);
  return { lines, subtotal, discount, tax, total };
}
export function activeSession(s: State) {
  return s.sessions.find((x) => !x.closed);
}
export function expectedCash(s: State, sid: string) {
  const session = s.sessions.find((x) => x.id === sid);
  return (
    (session?.opening ?? 0) +
    s.sales
      .filter((x) => x.sessionId === sid)
      .reduce((a, x) => a + x.total, 0) -
    s.refunds
      .filter((x) => x.sessionId === sid)
      .reduce((a, x) => a + x.amount, 0) -
    s.expenses
      .filter((x) => x.sessionId === sid)
      .reduce((a, x) => a + x.amount, 0)
  );
}
export function checkout(
  s: State,
  cart: CartLine[],
  discount: number,
  received: number,
  requestId: string,
): Sale {
  const existing = s.sales.find((x) => x.requestId === requestId);
  if (existing) return existing;
  const session = activeSession(s);
  if (!session) throw Error("Open a cash session before taking payment.");
  const q = quote(s, cart, discount);
  if (!Number.isSafeInteger(received) || received < q.total)
    throw Error("Amount received is below the bill total.");
  const need = new Map<string, number>();
  q.lines.forEach((l) =>
    l.consumption.forEach((c) =>
      need.set(c.productId, (need.get(c.productId) || 0) + c.qty),
    ),
  );
  for (const [pid, qty] of need)
    if (product(s, pid).stock < qty)
      throw Error(`Not enough stock: ${product(s, pid).name}.`);
  const sale: Sale = {
    ...q,
    id: id(),
    number: `INV-${String(s.nextInvoice++).padStart(6, "0")}`,
    at: now(),
    sessionId: session.id,
    requestId,
    received,
    change: received - q.total,
    shop: {
      name: s.settings.name,
      address: s.settings.address,
      phone: s.settings.phone,
    },
    voided: false,
  };
  for (const [pid, qty] of need) move(s, pid, -qty, "Sale", sale.number);
  s.sales.unshift(sale);
  audit(s, "Sale completed", `${sale.number} · ${money(sale.total)}`);
  return sale;
}
export function returnedQty(s: State, sid: string, index: number) {
  return s.refunds
    .filter((r) => r.saleId === sid && r.lineIndex === index)
    .reduce((a, r) => a + r.qty, 0);
}
export function refund(
  s: State,
  saleId: string,
  index: number,
  qty: number,
  restock: boolean,
  reason: string,
  isVoid = false,
) {
  const session = activeSession(s);
  if (!session) throw Error("Open a cash session first.");
  if (!reason.trim()) throw Error("A reason is required.");
  const sale = s.sales.find((x) => x.id === saleId);
  if (!sale || sale.voided) throw Error("This bill cannot be refunded.");
  const line = sale.lines[index];
  if (!line) throw Error("Select a bill item.");
  validQty(product(s, line.productId), qty);
  const prior = returnedQty(s, saleId, index);
  if (qty + prior > line.qty)
    throw Error("Return quantity exceeds the quantity remaining.");
  const portion = (value: number) =>
    Math.round((value * (prior + qty)) / line.qty) -
    Math.round((value * prior) / line.qty);
  const amount = portion(line.total);
  s.refunds.unshift({
    id: id(),
    saleId,
    lineIndex: index,
    qty,
    amount,
    cost: portion(line.cost),
    tax: portion(line.tax),
    restock,
    reason: reason.trim(),
    at: now(),
    sessionId: session.id,
    void: isVoid,
  });
  if (restock)
    line.consumption.forEach((c) =>
      move(
        s,
        c.productId,
        Math.round((c.qty * qty) / line.qty),
        isVoid ? "Void" : "Return",
        sale.number,
      ),
    );
  audit(
    s,
    isVoid ? "Bill void refund" : "Refund",
    `${sale.number} · ${money(amount)} · ${reason}`,
  );
}
export function voidSale(s: State, saleId: string, reason: string) {
  const sale = s.sales.find((x) => x.id === saleId);
  if (!sale || sale.voided) throw Error("Bill already voided.");
  if (s.refunds.some((r) => r.saleId === saleId))
    throw Error(
      "Partially refunded bills cannot be voided. Return remaining items instead.",
    );
  sale.lines.forEach((l, i) => refund(s, saleId, i, l.qty, true, reason, true));
  sale.voided = true;
  audit(s, "Bill voided", `${sale.number} · ${reason}`);
}
export function saveProduct(s: State, p: Product) {
  productSchema.parse(p);
  if (
    s.products.some(
      (x) => x.id !== p.id && x.sku.toLowerCase() === p.sku.toLowerCase(),
    )
  )
    throw Error("SKU already exists.");
  if (
    new Set(p.barcodes).size !== p.barcodes.length ||
    s.products.some(
      (x) => x.id !== p.id && x.barcodes.some((b) => p.barcodes.includes(b)),
    )
  )
    throw Error("Barcode already belongs to a product.");
  if (p.kind === "bundle") {
    if (!p.components.length) throw Error("Add at least one bundle component.");
    if (
      new Set(p.components.map((c) => c.productId)).size !== p.components.length
    )
      throw Error("Bundle components must be unique.");
    p.components.forEach((c) => {
      const cp = product(s, c.productId);
      if (cp.id === p.id || cp.kind === "bundle")
        throw Error("Nested bundles are not supported.");
      validQty(cp, c.qty);
    });
  }
  const old = s.products.find((x) => x.id === p.id);
  if (old) {
    if (old.kind !== p.kind || old.unit !== p.unit)
      throw Error("Create a new SKU to change product type or stock unit.");
    p.stock = old.stock;
    if (old.price !== p.price || old.cost !== p.cost)
      audit(
        s,
        "Price changed",
        `${p.sku}: selling ${money(old.price)} → ${money(p.price)}; cost ${money(old.cost)} → ${money(p.cost)}`,
      );
    Object.assign(old, p);
  } else {
    p.stock = 0;
    s.products.push(p);
  }
  audit(s, "Product saved", p.sku);
}
export function adjust(s: State, pid: string, delta: number, reason: string) {
  const p = product(s, pid);
  if (p.kind === "bundle") throw Error("Adjust bundle components instead.");
  if (
    !reason.trim() ||
    !Number.isSafeInteger(delta) ||
    delta === 0 ||
    (p.kind === "count" && delta % 1000 !== 0)
  )
    throw Error("Enter a valid stock change and reason.");
  move(s, pid, delta, reason, "ADJ");
  audit(s, "Stock adjustment", `${p.name}: ${quantity(delta)} · ${reason}`);
}
export function purchase(
  s: State,
  supplierId: string,
  reference: string,
  lines: State["purchases"][number]["lines"],
) {
  if (!s.suppliers.some((x) => x.id === supplierId))
    throw Error("Select a supplier.");
  if (!reference.trim() || !lines.length)
    throw Error("Enter a reference and at least one item.");
  if (
    s.purchases.some(
      (p) =>
        p.supplierId === supplierId && p.reference === reference && !p.reversed,
    )
  )
    throw Error("Supplier reference already recorded.");
  const ref = id();
  let total = 0;
  lines.forEach((l) => {
    const p = product(s, l.productId);
    if (p.kind === "bundle")
      throw Error("Receive component stock, not bundles.");
    validQty(p, l.qty);
    if (!Number.isSafeInteger(l.cost) || l.cost < 0)
      throw Error("Invalid purchase cost.");
    total += Math.round((l.cost * l.qty) / 1000);
    const old = p.cost;
    p.cost = Math.round(
      (p.stock * p.cost + l.qty * l.cost) / (p.stock + l.qty),
    );
    if (old !== p.cost)
      audit(
        s,
        "Average cost updated",
        `${p.sku}: ${money(old)} → ${money(p.cost)}`,
      );
    move(s, p.id, l.qty, "Purchase", reference);
  });
  s.purchases.unshift({
    id: ref,
    at: now(),
    supplierId,
    reference,
    lines,
    total,
    reversed: false,
  });
  audit(s, "Purchase received", reference);
}
export function validateState(input: unknown): State {
  const s = stateSchema.parse(input);
  for (const key of [
    "products",
    "suppliers",
    "sales",
    "refunds",
    "sessions",
    "expenses",
    "purchases",
    "movements",
    "audit",
    "held",
  ] as const) {
    const ids = s[key].map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      throw Error(`Duplicate IDs in ${key}.`);
  }
  if (s.sessions.filter((x) => !x.closed).length > 1)
    throw Error("Only one cash session is supported.");
  if (new Set(s.products.map((x) => x.sku)).size !== s.products.length)
    throw Error("Duplicate SKU.");
  const bs = s.products.flatMap((x) => x.barcodes);
  if (new Set(bs).size !== bs.length) throw Error("Duplicate barcode.");
  s.products.forEach((p) => {
    if (p.kind !== "measured" && p.stock % 1000)
      throw Error("Invalid count stock.");
    p.components.forEach((c) => {
      const cp = product(s, c.productId);
      if (cp.kind === "bundle" || cp.id === p.id)
        throw Error("Invalid bundle.");
      validQty(cp, c.qty);
    });
  });
  s.sales.forEach((x) => {
    if (
      x.lines.reduce((a, l) => a + l.total, 0) !== x.total ||
      x.received - x.total !== x.change
    )
      throw Error("Invalid sale totals.");
    x.lines.forEach((l) => {
      product(s, l.productId);
      if (l.net + l.tax !== l.total) throw Error("Invalid line total.");
      l.consumption.forEach((c) => product(s, c.productId));
    });
    if (!s.sessions.some((t) => t.id === x.sessionId))
      throw Error("Missing sale session.");
  });
  s.refunds.forEach((r) => {
    const sale = s.sales.find((x) => x.id === r.saleId);
    if (
      !sale?.lines[r.lineIndex] ||
      returnedQty(s, r.saleId, r.lineIndex) > sale.lines[r.lineIndex].qty
    )
      throw Error("Invalid return.");
  });
  if (
    new Set(s.sales.map((x) => x.number)).size !== s.sales.length ||
    new Set(s.sales.map((x) => x.requestId)).size !== s.sales.length
  )
    throw Error("Duplicate invoice or payment request.");
  const highest = s.sales.reduce(
    (a, x) => Math.max(a, Number(x.number.replace("INV-", "")) || 0),
    0,
  );
  if (s.nextInvoice <= highest) throw Error("Invalid invoice sequence.");
  for (const row of [...s.expenses, ...s.refunds])
    if (!s.sessions.some((x) => x.id === row.sessionId))
      throw Error("Missing cash session reference.");
  s.purchases.forEach((p) => {
    if (!s.suppliers.some((x) => x.id === p.supplierId))
      throw Error("Missing supplier reference.");
    p.lines.forEach((l) => validQty(product(s, l.productId), l.qty));
    if (
      p.lines.reduce((a, l) => a + Math.round((l.cost * l.qty) / 1000), 0) !==
      p.total
    )
      throw Error("Invalid purchase total.");
  });
  s.movements.forEach((m) => product(s, m.productId));
  s.held.forEach((h) =>
    h.lines.forEach((l) => validQty(product(s, l.productId), l.qty)),
  );
  s.sales.forEach((x) =>
    x.lines.forEach((l, i) => {
      const returned = s.refunds.filter(
        (r) => r.saleId === x.id && r.lineIndex === i,
      );
      if (returned.reduce((a, r) => a + r.amount, 0) > l.total)
        throw Error("Refund value exceeds original sale.");
    }),
  );
  return s;
}
export function reversePurchase(s: State, purchaseId: string, reason: string) {
  if (!reason.trim()) throw Error("A correction reason is required.");
  const entry = s.purchases.find((p) => p.id === purchaseId);
  if (!entry || entry.reversed) throw Error("Purchase already reversed.");
  const grouped = new Map<string, { qty: number; value: number }>();
  entry.lines.forEach((l) => {
    const current = grouped.get(l.productId) || { qty: 0, value: 0 };
    current.qty += l.qty;
    current.value += l.qty * l.cost;
    grouped.set(l.productId, current);
  });
  for (const [pid, l] of grouped) {
    const p = product(s, pid);
    if (p.stock < l.qty || (p.stock > l.qty && p.stock * p.cost < l.value))
      throw Error(
        "This purchase cannot be fully reversed against current stock value. Record a reviewed stock correction instead.",
      );
  }
  for (const [pid, l] of grouped) {
    const p = product(s, pid);
    const old = p.cost;
    if (p.stock > l.qty)
      p.cost = Math.round((p.stock * p.cost - l.value) / (p.stock - l.qty));
    move(s, pid, -l.qty, "Purchase reversal", entry.reference);
    audit(
      s,
      "Purchase cost correction",
      `${p.sku}: ${money(old)} → ${money(p.cost)}`,
    );
  }
  entry.reversed = true;
  audit(s, "Purchase reversed", `${entry.reference} · ${reason}`);
}
