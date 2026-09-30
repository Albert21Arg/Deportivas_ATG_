// Exporta prisma/dev.db (SQLite local) a la base D1 "deportivas-db" de Cloudflare.
//
// Uso:  npm run d1:export              -> sube a Cloudflare (requiere `npx wrangler login`)
//       npm run d1:export -- --local   -> prueba contra una copia local de D1
//
// Recrea las tablas en D1 (DROP + CREATE) y copia todas las filas, así que
// REEMPLAZA todo lo que haya en D1 por el contenido de dev.db.
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcPath = path.join(root, 'prisma', 'dev.db');
const outPath = path.join(root, 'prisma', 'd1-export.sql');
const target = process.argv.includes('--local') ? '--local' : '--remote';

const db = new DatabaseSync(srcPath, { readOnly: true });

const allTables = db
  .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
  .all();
const indexes = db
  .prepare("SELECT sql FROM sqlite_master WHERE type = 'index' AND sql IS NOT NULL")
  .all();

const quoteId = (name) => `"${name.replaceAll('"', '""')}"`;

// D1 remoto valida las FKs durante la importación (no respeta
// defer_foreign_keys), así que las tablas se ordenan de padres a hijos.
function sortByDependencies(list) {
  const sorted = [];
  const visited = new Set();
  const visit = (table) => {
    if (visited.has(table.name)) return;
    visited.add(table.name);
    const parents = db.prepare('SELECT DISTINCT "table" FROM pragma_foreign_key_list(?)').all(table.name);
    for (const { table: parent } of parents) {
      const parentTable = list.find((t) => t.name === parent);
      if (parentTable) visit(parentTable);
    }
    sorted.push(table);
  };
  list.forEach(visit);
  return sorted;
}

const tables = sortByDependencies(allTables);

function toSqlLiteral(value) {
  if (value === null) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (value instanceof Uint8Array) return `X'${Buffer.from(value).toString('hex')}'`;
  // Los saltos de línea se codifican con char() para que cada sentencia quede
  // en una sola línea (la importación de D1 falla con strings multilínea).
  return String(value)
    .split(/(\r|\n)/)
    .map((part) => (part === '\n' ? 'char(10)' : part === '\r' ? 'char(13)' : `'${part.replaceAll("'", "''")}'`))
    .join(' || ');
}

// D1 no acepta BEGIN/COMMIT en archivos importados.
const lines = ['PRAGMA defer_foreign_keys = true;'];

for (const { name } of [...tables].reverse()) lines.push(`DROP TABLE IF EXISTS ${quoteId(name)};`);
for (const { sql } of tables) lines.push(`${sql};`);
for (const { sql } of indexes) lines.push(`${sql};`);

// SQLite local no aplica las FKs, así que pueden existir filas huérfanas (que
// apuntan a un registro ya borrado). D1 sí las aplica y rechazaría toda la
// importación, por eso se omiten y se listan.
const orphans = db.prepare('PRAGMA foreign_key_check').all();
for (const { table, rowid, parent } of orphans) {
  console.warn(`Omitida fila huérfana: ${table} rowid=${rowid} (sin registro en ${parent})`);
}

let rowCount = 0;
for (const { name } of tables) {
  const orphanRowIds = orphans.filter((o) => o.table === name).map((o) => o.rowid);
  const where = orphanRowIds.length ? ` WHERE rowid NOT IN (${orphanRowIds.join(', ')})` : '';
  const rows = db.prepare(`SELECT * FROM ${quoteId(name)}${where}`).all();

  // Prisma con SQLite nativo guarda DateTime como entero (ms desde epoch),
  // pero el adapter de D1 solo lee y compara fechas en texto ISO.
  const dateColumns = db
    .prepare("SELECT name FROM pragma_table_info(?) WHERE type = 'DATETIME'")
    .all(name)
    .map((c) => c.name);
  for (const row of rows) {
    for (const col of dateColumns) {
      if (typeof row[col] === 'number' || typeof row[col] === 'bigint') {
        row[col] = new Date(Number(row[col])).toISOString().replace('Z', '+00:00');
      }
    }
    const columns = Object.keys(row).map(quoteId).join(', ');
    const values = Object.values(row).map(toSqlLiteral).join(', ');
    lines.push(`INSERT INTO ${quoteId(name)} (${columns}) VALUES (${values});`);
  }
  rowCount += rows.length;
}

writeFileSync(outPath, `${lines.join('\n')}\n`);
console.log(`SQL generado en ${path.relative(root, outPath)}: ${tables.length} tablas, ${rowCount} filas`);

execFileSync('npx', ['wrangler', 'd1', 'execute', 'deportivas-db', target, `--file=${outPath}`, '--yes'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
