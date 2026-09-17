import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost:1420",
});
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "HTMLInputElement",
  "HTMLDialogElement",
  "FormData",
  "localStorage",
  "sessionStorage",
  "MutationObserver",
])
  Object.defineProperty(globalThis, key, {
    value: key === "window" ? dom.window : dom.window[key],
    configurable: true,
    writable: true,
  });
dom.window.HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
dom.window.print = () => {};
const React = await import("react");
const { render, fireEvent, screen, waitFor, within, cleanup } =
  await import("@testing-library/react");
const { default: App } = await import("../src/App");
const button = (text: string, root: ParentNode = document) => {
  const b = Array.from(root.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  );
  assert.ok(b, `Button not found: ${text}`);
  return b as HTMLButtonElement;
};
const dialog = () => document.querySelector("dialog")!;
const click = (text: string, root: ParentNode = document) =>
  fireEvent.click(button(text, root));
const settled = () => new Promise((resolve) => setTimeout(resolve, 20));
test("owner opens cash session, sells measured goods, and refunds through UI", async () => {
  render(React.createElement(App));
  await settled();
  click("Open demo workspace");
  await settled();
  assert.equal(document.querySelector("h1")?.textContent, "Point of sale");
  click("Cash sessions");
  click("Open session");
  fireEvent.change(dialog().querySelector('input[name="opening"]')!, {
    target: { value: "1000" },
  });
  click("Open session", dialog());
  await settled();
  assert.equal(dialog(), null);
  fireEvent.click(document.querySelector('button[title="Point of sale"]')!);
  fireEvent.click(
    Array.from(document.querySelectorAll(".product-card")).find((b) =>
      b.textContent?.includes("White rice"),
    )!,
  );
  fireEvent.change(dialog().querySelector('input[name="qty"]')!, {
    target: { value: "0.512" },
  });
  click("Add to bill", dialog());
  await settled();
  fireEvent.click(document.querySelector(".pay-button")!);
  fireEvent.change(dialog().querySelector("input")!, {
    target: { value: "200" },
  });
  click("Complete cash sale", dialog());
  await settled();
  assert.equal(dialog().querySelector("h2")?.textContent, "Sale completed");
  const saved = JSON.parse(localStorage.getItem("counter-pos-demo-v1")!);
  assert.equal(saved.sales.length, 1);
  assert.equal(saved.sales[0].total, 12288);
  assert.equal(saved.sales[0].change, 7712);
  assert.equal(saved.products.find((p: any) => p.id === "p0").stock, 51488);
  click("Next sale");
  click("Sales & returns");
  click("View bill");
  click("Return item");
  fireEvent.change(dialog().querySelector('input[name="qty"]')!, {
    target: { value: "0.512" },
  });
  fireEvent.change(dialog().querySelector('input[name="reason"]')!, {
    target: { value: "Test resellable return" },
  });
  click("Confirm cash refund", dialog());
  await settled();
  const d = JSON.parse(localStorage.getItem("counter-pos-demo-v1")!);
  assert.equal(d.refunds.length, 1);
  assert.equal(d.products.find((p: any) => p.id === "p0").stock, 52000);
  cleanup();
  dom.window.close();
});
