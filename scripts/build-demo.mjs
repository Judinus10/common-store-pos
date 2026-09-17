import { build } from "esbuild";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
const result = await build({
  entryPoints: ["src/main.tsx"],
  bundle: true,
  write: false,
  format: "iife",
  minify: true,
  loader: { ".css": "empty" },
  define: { "process.env.NODE_ENV": '"production"' },
  target: "es2022",
});
const css = readdirSync("dist/assets")
  .filter((f) => f.endsWith(".css"))
  .map((f) => readFileSync("dist/assets/" + f, "utf8"))
  .join("\n");
const js = result.outputFiles[0].text.replaceAll("</script", "<\\/script");
writeFileSync(
  "Counter_POS_Demo.html",
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Counter POS — Demo</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`,
);
console.log("Created standalone Counter_POS_Demo.html");
