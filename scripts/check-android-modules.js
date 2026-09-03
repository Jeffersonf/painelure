const fs = require("fs");

const web = fs.readFileSync("modules/access-scope.js", "utf8");
const android = fs.readFileSync("android-kotlin/app/src/main/java/com/painelure/app/data/PanelModule.kt", "utf8");
const webBlock = web.match(/const DEFAULT_ACCESS = \{([\s\S]*?)\n  \};/)?.[1] || "";
const webPages = [...webBlock.matchAll(/"([a-z0-9-]+)"/g)].map(match => match[1]);
const androidPages = new Set([...android.matchAll(/PanelModule\("([a-z0-9-]+)"/g)].map(match => match[1]));
const missing = [...new Set(webPages)].filter(page => !androidPages.has(page));
if (missing.length) {
  console.error(`Módulos ausentes no catálogo Android: ${missing.join(", ")}`);
  process.exit(1);
}
console.log(`OK: ${androidPages.size} módulos representados no catálogo Android.`);
