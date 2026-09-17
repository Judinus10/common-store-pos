import { invoke } from "@tauri-apps/api/core";
import { create } from "zustand";
import { blank, demo, State, validateState, audit } from "./domain";
export const desktop = () =>
  Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown })
      .__TAURI_INTERNALS__,
  );
const KEY = "counter-pos-demo-v1";
export async function status(): Promise<boolean> {
  return desktop() ? invoke("has_owner") : false;
}
export async function unlock(password: string, setup = false): Promise<State> {
  if (desktop()) {
    await invoke(setup ? "create_owner" : "unlock", { password });
    const raw = await invoke<string>("load_state");
    return raw ? validateState(JSON.parse(raw)) : blank();
  }
  const raw = localStorage.getItem(KEY);
  return raw ? validateState(JSON.parse(raw)) : demo();
}
export async function lock() {
  if (desktop()) await invoke("lock");
}
async function persist(next: State, expected: number) {
  if (desktop())
    await invoke("save_state", { data: JSON.stringify(next), expected });
  else {
    const old = localStorage.getItem(KEY);
    if (old && JSON.parse(old).revision !== expected)
      throw Error("Data changed in another window. Reload before continuing.");
    localStorage.setItem(KEY, JSON.stringify(next));
  }
}
let inFlight = false;
export const useStore = create<{
  data: State | null;
  busy: boolean;
  setData: (s: State | null) => void;
  mutate: (fn: (s: State) => void) => Promise<void>;
}>((set, get) => ({
  data: null,
  busy: false,
  setData: (data) => set({ data }),
  mutate: async (fn) => {
    if (inFlight) throw Error("Please wait for the current action to finish.");
    const previous = get().data;
    if (!previous) throw Error("Unlock the store first.");
    inFlight = true;
    set({ busy: true });
    try {
      const next = structuredClone(previous);
      fn(next);
      next.revision = previous.revision + 1;
      validateState(next);
      await persist(next, previous.revision);
      set({ data: next });
    } finally {
      inFlight = false;
      set({ busy: false });
    }
  },
}));
export async function exportFile(
  name: string,
  text: string,
  type = "application/json",
) {
  if (desktop()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeTextFile } = await import("@tauri-apps/plugin-fs");
    const path = await save({ defaultPath: name });
    if (!path) return false;
    await writeTextFile(path, text);
  } else {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return true;
}
export async function manualBackup(s: State) {
  return await exportFile(
    `counter-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify(s, null, 2),
  );
}
export async function restoreBackup(file: File) {
  const restored = validateState(JSON.parse(await file.text()));
  const current = useStore.getState().data;
  if (!current) throw Error("Unlock first.");
  if (!(await manualBackup(current)))
    throw Error(
      "Restore cancelled: save the current backup before replacing data.",
    );
  await useStore.getState().mutate((s) => {
    const revision = s.revision;
    Object.assign(s, restored);
    s.revision = revision;
    audit(
      s,
      "Backup restored",
      `Restored ${file.name}; previous data exported before replacement.`,
    );
  });
}
export function csv(rows: (string | number)[][]) {
  return rows
    .map((row) =>
      row
        .map((v) => {
          let text = String(v);
          if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
          return '"' + text.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
