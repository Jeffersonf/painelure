const fs = require('fs');
const path = require('path');

const input = process.argv[2] || 'C:\\Users\\jeffe\\Desktop\\rede2026.txt';
const html = fs.readFileSync(input, 'utf8');
const rows = [];
const rowRe = /<tr>[\s\S]*?<\/tr>/gi;
for (const row of html.match(rowRe) || []) {
  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
  if (cells.length < 3) continue;
  const clean = value => value.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
  const link = row.match(/<a[^>]+href="([^"]+)"/i)?.[1] || '';
  const number = clean(cells[0]);
  const date = clean(cells[1]);
  const title = clean(cells[2]);
  if (!/^\d+\/26$/.test(number) || !title) continue;
  rows.push({ label: title, value: date, note: `Rede nº ${number}`, type: 'Redes 2026', scope: 'institucional', link });
}
const output = path.join(__dirname, '..', 'data', 'rede-2026.js');
const content = `(function () {\n  const P = window.PainelURE = window.PainelURE || {};\n  P.rede2026 = ${JSON.stringify(rows, null, 2)};\n  P.seedData = P.seedData || {};\n  P.seedData.calendar = [...(P.seedData.calendar || []), ...P.rede2026];\n})();\n`;
fs.writeFileSync(output, content, 'utf8');
console.log(`Importadas ${rows.length} redes para ${output}`);
