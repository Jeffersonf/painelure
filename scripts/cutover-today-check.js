"use strict";

const { execFileSync } = require("child_process");
const NODE = process.execPath;

function run(command, args, options = {}) {
  const output = execFileSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
    shell: false,
    ...options
  });
  return typeof output === "string" ? output.trim() : "";
}

function fail(message) {
  console.error(`BLOQUEIO: ${message}`);
  process.exitCode = 1;
}

function info(message) {
  console.log(`OK: ${message}`);
}

function hasOnlineCredentials() {
  return Boolean(process.env.P2_ADMIN_KEY || (process.env.P2_ADMIN_USER && process.env.P2_ADMIN_PASSWORD));
}

function hasGithubAccess() {
  if (process.env.GITHUB_TOKEN) return true;
  try {
    run("gh", ["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}

function checkGitStatus(path, label) {
  const status = run("git", ["-C", path, "status", "--short"]);
  if (status) {
    console.log(`AVISO: ${label} tem alteracoes locais:\n${status}`);
  } else {
    info(`${label} sem alteracoes locais`);
  }
}

try {
  [
    "scripts/check-js.js",
    "scripts/check-access-scope.js",
    "scripts/check-backend-routes.js",
    "scripts/check-official-transition.js"
  ].forEach(script => run(NODE, [script], { stdio: "inherit" }));
  info("checks do PainelURE passaram");
} catch (error) {
  fail(`npm run check falhou: ${error.message}`);
}

try {
  run(NODE, ["scripts/migrate-setechub-online.js"], { stdio: "inherit" });
  info("migracao local do SETECHUB passou");
} catch (error) {
  fail(`migracao local do SETECHUB falhou: ${error.message}`);
}

if (!process.env.P2_API_URL) {
  fail("P2_API_URL nao definido para a API oficial.");
}

if (!hasOnlineCredentials()) {
  fail("credenciais online ausentes. Defina P2_ADMIN_KEY ou P2_ADMIN_USER/P2_ADMIN_PASSWORD.");
}

if (!hasGithubAccess()) {
  console.log("AVISO: sem GITHUB_TOKEN e sem gh autenticado. A renomeacao GitHub tera que ser feita manualmente.");
} else {
  info("acesso GitHub disponivel para renomeacao quando a virada for aprovada");
}

checkGitStatus(".", "painelure novo");
checkGitStatus("C:/Users/jeffe/setechub", "painelure legado");

if (!process.exitCode) {
  console.log("PRONTO: ambiente local apto para executar npm run migrate:setechub:online e fazer a virada GitHub/Pages.");
}
