// Optional UI check: set PLAYWRIGHT_MODULE to a Playwright installation outside the project.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const fs = require("fs"), http = require("http"), assert = require("assert/strict"), path = require("path");
(async () => {
  const root = path.resolve(__dirname, "..");
  const source = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const section = source.slice(source.indexOf('    <section class="page" id="page-network">'), source.indexOf('    <section class="page" id="page-inventory">'));
  const html = `<html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main>${section}</main>
    <script src="/data/mock.js"></script><script src="/data/schools.js"></script><script src="/data/school-operational.js"></script><script src="/modules/network-import-core.js"></script>
    <script>const P=window.PainelURE;let state={...P.mockData,...P.seedData};P.canAccess=()=>true;P.getAppData=()=>state;P.setAppData=x=>state=x;P.saveAppData=()=>{};P.renderApp=()=>P.renderNetworkDashboard(state);
    window.failImport=false;P.importNetworkRows=async(token,rows)=>{window.sentRows=rows;if(window.failImport)throw new Error('Falha simulada');const r=P.networkImport.normalize(rows,state);return {networkData:{...state.networkData,...r.updates},meta:{importedAt:new Date().toISOString()},updatedAt:new Date().toISOString()}};</script>
    <script src="/modules/network-import.js"></script><script>P.bindNetworkImport();P.renderApp();document.getElementById('page-network').style.display='block';</script></body></html>`;
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname === "/") { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(html); return; }
    if (!/^\/(styles\.css|(?:modules|vendor|data)\/[\w.-]+\.(?:js|css))$/.test(url.pathname)) { res.statusCode = 404; res.end(); return; }
    res.setHeader("Content-Type", url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8");
    res.end(fs.readFileSync(path.join(root, url.pathname)));
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  let browser, page;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = []; page.on("pageerror", e => errors.push(e.message));
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.locator("#networkImportControls summary").click();
    const file = process.argv[2];
    if (!file) throw new Error("Informe o caminho do CSV de teste.");
    await page.locator("#networkImportFile").setInputFiles(file);
    await page.waitForFunction(() => !document.getElementById("networkImportApply").disabled);
    const count = await page.locator("#networkImportPreview tbody tr").count(); assert(count > 0);
    console.log("Prévia CSV OK:", count, "escolas.");
    await page.evaluate(() => window.failImport = true);
    await page.locator("#networkImportApply").click();
    await page.waitForFunction(() => document.getElementById("networkImportStatus").textContent.includes("Falha simulada"));
    assert.equal(await page.locator("#networkImportApply").isEnabled(), true);
    const fields = await page.evaluate(() => Object.keys(window.sentRows[0])); assert(!fields.includes("SENHA")); assert(!fields.includes("Usuário DVR"));
    await page.evaluate(() => window.failImport = false);
    await page.locator("#networkImportApply").click();
    await page.waitForFunction(() => document.getElementById("networkImportStatus").textContent.includes("Importação salva"));
    console.log("Falha e nova tentativa OK.");
    await page.locator("#networkImportFile").setInputFiles(file);
    await page.waitForFunction(() => !document.getElementById("networkImportApply").disabled);
    await page.locator("#networkImportCancel").click(); assert.equal(await page.locator("#networkImportApply").isDisabled(), true);
    if (process.argv[3]) {
      await page.locator("#networkImportFile").setInputFiles(process.argv[3]);
      await page.waitForFunction(() => !document.getElementById("networkImportApply").disabled);
      assert.equal(await page.locator("#networkImportPreview tbody tr").count(), count);
      console.log("Prévia Excel OK.");
    }
    const output = path.join(process.env.TEMP || "/tmp", "painelure-network-check"); fs.mkdirSync(output, { recursive: true });
    await page.screenshot({ path: path.join(output, "desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []);
    console.log("Cancelamento, layout mobile e execução sem erros OK.");
  } catch (error) {
    if (page) console.error("Estado da interface:", await page.locator("#networkImportStatus").textContent());
    throw error;
  } finally { if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
