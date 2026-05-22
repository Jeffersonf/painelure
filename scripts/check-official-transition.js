"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
}

function exists(file) {
  return fs.existsSync(path.join(ROOT, file));
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const pkg = readJson("package.json");
const lock = readJson("package-lock.json");

if (pkg.name !== "painelure") fail("package.json deve usar name=painelure para a base oficial.");
if (lock.name !== "painelure") fail("package-lock.json deve usar name=painelure.");
if (lock.packages?.[""]?.name !== "painelure") fail("package-lock root deve usar name=painelure.");

if (!exists("docs/transicao-oficial.md")) fail("docs/transicao-oficial.md nao encontrado.");
if (!exists("docs/melhorias-finanza-setechub.md")) fail("docs/melhorias-finanza-setechub.md nao encontrado.");
if (!exists("docs/passo-a-passo-virada-hoje.md")) fail("docs/passo-a-passo-virada-hoje.md nao encontrado.");
if (!exists("scripts/migrate-setechub-online.js")) fail("script de migracao do SETECHUB nao encontrado.");
if (!exists("scripts/finalizar-virada-github.ps1")) fail("script de virada GitHub nao encontrado.");

const reportFile = path.join(ROOT, "server", "storage", "setechub-migration-report.json");
if (fs.existsSync(reportFile)) {
  const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
  if (Number(report.counts?.users || 0) <= 0) fail("relatorio de migracao sem usuarios.");
  if (Number(report.counts?.schools || 0) <= 0) fail("relatorio de migracao sem escolas.");
  if ((report.pins || []).some(user => /pec/i.test(`${user.username} ${user.name}`))) {
    fail("relatorio de migracao ainda contem usuario PEC.");
  }
}

if (!process.exitCode) console.log("Transicao oficial OK");
