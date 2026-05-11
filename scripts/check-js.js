"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const targets = [
  "server/index.js",
  "app.js",
  ...fs.readdirSync(path.join(root, "modules")).filter(file => file.endsWith(".js")).map(file => `modules/${file}`),
  ...fs.readdirSync(path.join(root, "data")).filter(file => file.endsWith(".js")).map(file => `data/${file}`)
];

let failed = false;

for (const target of targets) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, target)], { stdio: "inherit" });
  if (result.status !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
