#!/usr/bin/env node
// Rebuilds web/public/mtrly-extension.zip from extension/.
// Run from repo root: node scripts/build-extension-zip.js
// Requires the `archiver` package (e.g. `cd /tmp && npm i archiver`).

const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const SRC = path.join(REPO, "extension");
const OUT = path.join(REPO, "web/public/mtrly-extension.zip");

const output = fs.createWriteStream(OUT);
const archive = archiver("zip", { zlib: { level: 9 } });

output.on("close", () => {
  console.log(`wrote ${OUT} — ${archive.pointer()} bytes`);
});
archive.on("warning", (e) => console.warn("warn", e));
archive.on("error", (e) => {
  throw e;
});

archive.pipe(output);

function walk(dir, base = "") {
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith(".git")) continue;
    const full = path.join(dir, name);
    const rel = path.posix.join(base, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, rel);
    else archive.file(full, { name: rel });
  }
}
walk(SRC);
archive.finalize();
