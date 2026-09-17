import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  LayoutDashboard,
  ScanLine,
  Package,
  Boxes,
  Truck,
  UsersRound,
  ReceiptText,
  Wallet,
  ArrowDownToLine,
  ChartNoAxesCombined,
  Settings,
  ShieldCheck,
  LogOut,
  Store,
  ChevronRight,
  CheckCircle2,
  Download,
  Upload,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  useStore,
  desktop,
  status,
  unlock,
  lock,
  manualBackup,
  restoreBackup,
} from "./storage";
import { audit, money } from "./domain";
import Checkout from "./Checkout";
import Products from "./Products";
import { Purchases, Suppliers, Sessions, Sales, Reports } from "./Management";
import { FormDialog, Heading } from "./ui";
const navigation = [
  {
    label: "WORKSPACE",
    items: [
      ["Overview", LayoutDashboard],
      ["Point of sale", ScanLine],
      ["Sales & returns", ReceiptText],
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      ["Products", Package],
      ["Inventory", Boxes],
      ["Purchases", Truck],
      ["Suppliers", UsersRound],
    ],
  },
  {
    label: "BUSINESS",
    items: [
      ["Cash sessions", Wallet],
      ["Expenses", ArrowDownToLine],
      ["Reports", ChartNoAxesCombined],
      ["Audit trail", ShieldCheck],
      ["Settings", Settings],
    ],
  },
] as const;
export default function App() {
  const { data: s, setData } = useStore();
  const [page, setPage] = useState("Point of sale"),
    [toast, setToast] = useState(""),
    [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!s || !desktop()) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          lock().then(() => setData(null));
        },
        15 * 60 * 1000,
      );
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [!!s]);
  if (!s) return <Login />;
  return (
    <div className={"app " + (collapsed ? "collapsed" : "")}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">
            <Store size={25} />
          </span>
          <div>
            counter<span>STORE POS</span>
          </div>
        </div>
        <button className="store-switch" onClick={() => setPage("Settings")}>
          <span className="store-avatar">{s.settings.name[0]}</span>
          <span>
            <strong>{s.settings.name}</strong>
            <small>Single store · Local</small>
          </span>
          <ChevronRight size={16} />
        </button>
        <nav>
          {navigation.map((group) => (
            <div className="nav-group" key={group.label}>
              <p>{group.label}</p>
              {group.items.map(([label, Icon]) => (
                <button
                  title={label}
                  key={label}
                  className={page === label ? "active" : ""}
                  onClick={() => setPage(label)}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {label === "Point of sale" && <kbd>F2</kbd>}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="offline-label">
            <span className="live-dot" />
            <span>{desktop() ? "Works offline" : "Browser demo"}</span>
          </div>
          <div className="owner">
            <span className="owner-avatar">O</span>
            <div>
              <strong>Owner</strong>
              <small>Single-user workspace</small>
            </div>
            <button
              className="icon-btn"
              title="Lock workspace"
              aria-label="Lock workspace"
              onClick={async () => {
                try {
                  await lock();
                  setData(null);
                } catch (e) {
                  setToast(String(e));
                }
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <button
              className="icon-btn"
              aria-label="Toggle sidebar"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <PanelLeftOpen size={19} />
              ) : (
                <PanelLeftClose size={19} />
              )}
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{page}</strong>
          </div>
          <div>
            <span className="date-label">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="badge green">
              <span className="live-dot" />
              {desktop() ? "Offline ready" : "Demo mode"}
            </span>
          </div>
        </header>
        {!desktop() && (
          <div className="demo-banner">
            Browser demo · Sample products, locally saved data. Use the desktop
            build for your store’s working database.
          </div>
        )}
        <main>
          {page === "Point of sale" ? (
            <Checkout notify={setToast} />
          ) : page === "Overview" ? (
            <Reports dashboard navigate={setPage} notify={setToast} />
          ) : page === "Products" || page === "Inventory" ? (
            <Products inventory={page === "Inventory"} notify={setToast} />
          ) : page === "Purchases" ? (
            <Purchases notify={setToast} />
          ) : page === "Suppliers" ? (
            <Suppliers />
          ) : page === "Cash sessions" || page === "Expenses" ? (
            <Sessions expenses={page === "Expenses"} />
          ) : page === "Sales & returns" ? (
            <Sales />
          ) : page === "Reports" ? (
            <Reports notify={setToast} />
          ) : page === "Audit trail" ? (
            <Audit />
          ) : (
            <SettingsPage notify={setToast} />
          )}
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          {toast}
          <button onClick={() => setToast("")}>×</button>
        </div>
      )}
    </div>
  );
}
function Login() {
  const { setData } = useStore();
  const [hasOwner, setHasOwner] = useState<boolean | null>(null),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    status()
      .then(setHasOwner)
      .catch((e) => setError(String(e)));
  }, []);
  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand">
          <span className="brand-icon">
            <Store />
          </span>
          <div>
            counter<span>STORE POS</span>
          </div>
        </div>
        <h1>
          {desktop()
            ? hasOwner
              ? "Welcome back."
              : "Make this store yours."
            : "Your counter. Under control."}
        </h1>
        <p>
          {desktop()
            ? hasOwner
              ? "Unlock your store to get back to business."
              : "Create the one owner password for this device."
            : "Explore the single-store POS with a general retail sample catalogue."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              if (desktop() && !hasOwner && password !== confirm)
                throw Error("Passwords do not match.");
              const data = await unlock(password, !hasOwner);
              setData(data);
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {desktop() && (
            <>
              <label>
                Owner password
                <input
                  autoFocus
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={hasOwner ? "current-password" : "new-password"}
                />
              </label>
              {!hasOwner && (
                <label>
                  Confirm password
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                  />
                </label>
              )}
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary full-width"
            disabled={busy || hasOwner === null}
          >
            {busy
              ? "Opening…"
              : desktop()
                ? hasOwner
                  ? "Unlock store"
                  : "Create owner & start"
                : "Open demo workspace"}
            <ChevronRight size={17} />
          </button>
        </form>
        <div className="login-foot">
          <ShieldCheck size={17} />
          One user · One store · Offline first
        </div>
      </div>
    </div>
  );
}
function Audit() {
  const { data: s } = useStore();
  const [search, setSearch] = useState("");
  return (
    <div className="page">
      <Heading
        title="Audit trail"
        eyebrow="A CLEAR RECORD"
        detail="Important changes, recorded automatically for the owner."
      />
      <div className="panel">
        <input
          placeholder="Filter activity"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date & time</th>
                <th>Operator</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {s?.audit
                .filter((x) =>
                  (x.action + x.detail)
                    .toLowerCase()
                    .includes(search.toLowerCase()),
                )
                .map((x) => (
                  <tr key={x.id}>
                    <td>{new Date(x.at).toLocaleString()}</td>
                    <td>Owner</td>
                    <td>
                      <strong>{x.action}</strong>
                    </td>
                    <td>{x.detail}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function SettingsPage({ notify }: { notify: (s: string) => void }) {
  const { data: s, mutate } = useStore();
  const [modal, setModal] = useState(""),
    [file, setFile] = useState<File | null>(null);
  if (!s) return null;
  return (
    <div className="page">
      <Heading
        eyebrow="SET UP YOUR WORKSPACE"
        title="Settings"
        detail="Your store details, receipt preferences, and data controls."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="settings-icon">
            <Store />
          </div>
          <h2>Store details</h2>
          <p className="muted">Printed on every new receipt.</p>
          <dl>
            <dt>Store name</dt>
            <dd>{s.settings.name}</dd>
            <dt>Address</dt>
            <dd>{s.settings.address || "Not set"}</dd>
            <dt>Phone</dt>
            <dd>{s.settings.phone || "Not set"}</dd>
            <dt>Currency</dt>
            <dd>LKR · Sri Lankan rupee</dd>
          </dl>
          <button className="secondary" onClick={() => setModal("store")}>
            Edit store details
          </button>
        </section>
        <section className="panel">
          <div className="settings-icon">
            <ReceiptText />
          </div>
          <h2>Billing & receipts</h2>
          <p className="muted">Simple cash billing for version 1.</p>
          <dl>
            <dt>Tax</dt>
            <dd>{s.settings.taxBps / 100}% added after discounts</dd>
            <dt>Receipt printing</dt>
            <dd>
              {s.settings.autoPrint ? "Automatic print dialog" : "Manual print"}
            </dd>
            <dt>Payment</dt>
            <dd>Cash</dd>
            <dt>Quantity precision</dt>
            <dd>Up to 3 decimal places</dd>
          </dl>
          <button className="secondary" onClick={() => setModal("billing")}>
            Edit billing settings
          </button>
        </section>
        <section className="panel">
          <div className="settings-icon">
            <Download />
          </div>
          <h2>Backup & restore</h2>
          <p className="muted">
            Keep a separate copy outside the POS computer.
          </p>
          <p>
            {desktop()
              ? "Desktop backups run hourly while the app is open. The 30 most recent automatic backups are retained in the app data backups folder."
              : "Manual export is available in the demo. Automatic backups run in the desktop app."}
          </p>
          <div className="actions">
            <button
              className="secondary"
              onClick={() => manualBackup(s).catch((e) => notify(String(e)))}
            >
              <Download size={16} />
              Export backup
            </button>
            <label className="secondary upload-label">
              <Upload size={16} />
              Restore backup
              <input
                type="file"
                accept=".json"
                hidden
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setModal("restore");
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <div className="settings-icon">
            <LockKeyhole />
          </div>
          <h2>Owner & security</h2>
          <p className="muted">One owner has access to all features.</p>
          <p>
            {desktop()
              ? "The workspace locks after 15 minutes of inactivity. Your password is verified locally."
              : "Password protection is available in the desktop build. The browser demo has no authentication."}
          </p>
          <button
            className="secondary"
            disabled={!desktop()}
            onClick={() => setModal("password")}
          >
            Change owner password
          </button>
        </section>
      </div>
      {modal === "store" && (
        <FormDialog
          title="Store details"
          fields={[
            { name: "name", label: "Store name", value: s.settings.name },
            {
              name: "address",
              label: "Address",
              value: s.settings.address,
              required: false,
            },
            {
              name: "phone",
              label: "Phone",
              value: s.settings.phone,
              required: false,
            },
          ]}
          close={() => setModal("")}
          submit={async (v) =>
            mutate((d) => {
              Object.assign(d.settings, v);
              audit(d, "Store settings changed", v.name);
            })
          }
        />
      )}
      {modal === "billing" && (
        <FormDialog
          title="Billing settings"
          fields={[
            {
              name: "tax",
              label: "Tax percentage",
              type: "number",
              min: 0,
              step: "0.01",
              value: s.settings.taxBps / 100,
            },
            {
              name: "print",
              label: "Receipt printing",
              value: s.settings.autoPrint ? "yes" : "no",
              options: [
                { value: "yes", label: "Open print dialog after sale" },
                { value: "no", label: "Print manually" },
              ],
            },
          ]}
          close={() => setModal("")}
          submit={async (v) =>
            mutate((d) => {
              const bps = Math.round(Number(v.tax) * 100);
              if (bps < 0 || bps > 10000)
                throw Error("Tax must be between 0 and 100%.");
              d.settings.taxBps = bps;
              d.settings.autoPrint = v.print === "yes";
              audit(d, "Billing settings changed", `Tax ${v.tax}%`);
            })
          }
        />
      )}
      {modal === "password" && (
        <FormDialog
          title="Change owner password"
          fields={[
            { name: "current", label: "Current password", type: "password" },
            {
              name: "password",
              label: "New password (8+ characters)",
              type: "password",
            },
            {
              name: "confirm",
              label: "Confirm new password",
              type: "password",
            },
          ]}
          close={() => setModal("")}
          submit={async (v) => {
            if (v.password !== v.confirm)
              throw Error("Passwords do not match.");
            await invoke("change_password", {
              current: v.current,
              password: v.password,
            });
            notify("Owner password changed.");
          }}
        />
      )}
      {modal === "restore" && file && (
        <FormDialog
          title="Replace data from backup?"
          fields={[{ name: "confirm", label: "Type RESTORE to continue" }]}
          close={() => setModal("")}
          submit={async (v) => {
            if (v.confirm !== "RESTORE") throw Error("Type RESTORE exactly.");
            await restoreBackup(file);
            sessionStorage.removeItem("counter-draft");
            sessionStorage.removeItem("counter-discount");
            sessionStorage.removeItem("counter-discount-mode");
            notify("Backup restored.");
          }}
          button="Restore backup"
        >
          <p className="notice">
            This replaces current products, stock, transactions, and settings
            with {file.name}. You will first be asked to save a backup of the
            current data. Your owner password stays unchanged.
          </p>
        </FormDialog>
      )}
    </div>
  );
}
