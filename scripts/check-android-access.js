const fs = require("fs");

const web = fs.readFileSync("modules/access-scope.js", "utf8");
const android = fs.readFileSync("android-kotlin/app/src/main/java/com/painelure/app/data/PermissionPolicy.kt", "utf8");

const normalize = value => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

const webBlock = web.match(/const DEFAULT_ACCESS = \{([\s\S]*?)\n  \};/)?.[1] || "";
const webRoles = [...webBlock.matchAll(/^\s*(?:"([^"]+)"|([A-Za-zÀ-ÿ]+))\s*:/gm)].map(match => match[1] || match[2]);
const androidRoles = [...android.matchAll(/^\s*"([^"]+)"\s+to setOf/gm)].map(match => match[1]);
const androidSet = new Set(androidRoles.map(normalize));
const missing = webRoles.filter(role => !androidSet.has(normalize(role)));

if (missing.length) {
  console.error(`Perfis ausentes na política Android: ${missing.join(", ")}`);
  process.exit(1);
}

console.log(`OK: ${webRoles.length} perfis do site cobertos pela política Android.`);
