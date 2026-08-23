/**
 * One-time import of the client list out of the old Excel workbook.
 *
 * This is NOT a live feature. It exists to fill the `clients` table once, from
 * the "BD" sheet of the spreadsheet Jose kept by hand.
 *
 * Usage (from log/):
 *   npm run import:clients                 # dry run, writes nothing
 *   npm run import:clients -- --write      # actually inserts
 *   npm run import:clients -- --file "/ruta/al/libro.xlsx"
 *   npm run import:clients -- --write --allow-existing   # insert even if the table has rows
 *
 * Only these columns are used:
 *   Clientes | Fecha de registro | Numero telefonico | BANCOS | DNI
 * CantidadEnvios, CxC, Enviado and Ganancias are ignored on purpose: this tool
 * does not carry over any balance or history from the spreadsheet.
 */

import ExcelJS from 'exceljs';
import postgres from 'postgres';

import { requireDatabaseUrl } from './env';
import { parseBanks } from '../lib/banks';
import { normalizeText } from '../lib/text';

const DEFAULT_FILE = '/home/greennell/kb/JVV/FILE ASSETS/J V V 2026 NEW.xlsx';
const SHEET_NAME = 'BD';

/** Bookkeeping placeholders in the sheet, not real people. */
const NOT_A_CLIENT = new Set(['remesa mvfb', 'a cliente']);

/** Values that mean "nothing recorded" in the DNI column. */
const DNI_PLACEHOLDERS = new Set(['n/a', 'na', 'n.a', 'n/d', '-', '--', 'x', '?', 'sin dni']);

interface Args {
  file: string;
  write: boolean;
  allowExisting: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { file: DEFAULT_FILE, write: false, allowExisting: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--write') args.write = true;
    else if (arg === '--dry-run') args.write = false;
    else if (arg === '--allow-existing') args.allowExisting = true;
    else if (arg === '--file') args.file = argv[++i] ?? args.file;
    else if (arg.startsWith('--file=')) args.file = arg.slice('--file='.length);
    else {
      console.error(`Opcion desconocida: ${arg}`);
      process.exit(1);
    }
  }
  return args;
}

/**
 * Most of the "Fecha de registro" column is a formula, so ExcelJS hands back
 * `{ formula, result }` instead of the value. Unwrap that (and shared formulas)
 * down to the underlying value before looking at it.
 */
function rawValue(value: ExcelJS.CellValue): ExcelJS.CellValue {
  let current: ExcelJS.CellValue = value;
  for (let depth = 0; depth < 5; depth++) {
    if (current && typeof current === 'object' && !(current instanceof Date) && 'result' in current) {
      current = (current as { result: ExcelJS.CellValue }).result;
    } else {
      return current;
    }
  }
  return current;
}

/** ExcelJS cell values come in several shapes. Flatten them to plain text. */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const anyValue = value as unknown as Record<string, unknown>;
    if (typeof anyValue.text === 'string') return anyValue.text.trim();
    if (Array.isArray(anyValue.richText)) {
      return anyValue.richText.map((part: { text?: string }) => part.text ?? '').join('').trim();
    }
    if ('result' in anyValue) return cellText(anyValue.result as ExcelJS.CellValue);
  }
  return String(value).trim();
}

/** The sheet stores phones as numbers sometimes and as text other times. */
function phoneText(raw: ExcelJS.CellValue): string | null {
  const value = rawValue(raw);
  if (typeof value === 'number') {
    // Never let a long phone number turn into "3.46123457e+10".
    return Number.isInteger(value) ? BigInt(Math.round(value)).toString() : String(value);
  }
  const text = cellText(value);
  return text ? text : null;
}

/** Only real dates survive; anything else becomes null. */
function dateOnly(value: ExcelJS.CellValue): string | null {
  const inner = rawValue(value);
  if (inner instanceof Date && !Number.isNaN(inner.getTime())) {
    // Use the UTC parts so a timezone offset cannot shift the day.
    const y = inner.getUTCFullYear();
    const m = String(inner.getUTCMonth() + 1).padStart(2, '0');
    const d = String(inner.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return null;
}

function dniOrNull(value: ExcelJS.CellValue): string | null {
  const text = cellText(value);
  if (!text) return null;
  if (DNI_PLACEHOLDERS.has(normalizeText(text))) return null;
  return text;
}

interface ClientRow {
  name: string;
  phone: string | null;
  banks: string[] | null;
  dni_nie: string | null;
  registered_at: string | null;
}

async function readSheet(file: string): Promise<{ rows: ClientRow[]; total: number; skipped: number }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(file);

  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) throw new Error(`El libro no tiene una hoja llamada "${SHEET_NAME}".`);

  // Map header text -> column number, so a reordered sheet still imports.
  const headers = new Map<string, number>();
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const key = normalizeText(cellText(cell.value));
    if (key) headers.set(key, colNumber);
  });

  const col = (name: string): number => {
    const index = headers.get(normalizeText(name));
    if (!index) throw new Error(`Falta la columna "${name}" en la hoja ${SHEET_NAME}.`);
    return index;
  };

  const colName = col('Clientes');
  const colDate = col('Fecha de registro');
  const colPhone = col('Número telefonico');
  const colBanks = col('BANCOS');
  const colDni = col('DNI');

  const rows: ClientRow[] = [];
  let total = 0;
  let skipped = 0;

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header

    const name = cellText(row.getCell(colName).value);
    if (!name) return; // fully blank row, not counted

    total += 1;

    if (NOT_A_CLIENT.has(normalizeText(name))) {
      skipped += 1;
      return;
    }

    const banks = parseBanks(cellText(row.getCell(colBanks).value));

    rows.push({
      name,
      phone: phoneText(row.getCell(colPhone).value),
      banks: banks.length > 0 ? banks : null,
      dni_nie: dniOrNull(row.getCell(colDni).value),
      registered_at: dateOnly(row.getCell(colDate).value),
    });
  });

  return { rows, total, skipped };
}

/** Aggregate counts only. This never prints a name, phone or DNI. */
function printSummary(rows: ClientRow[], total: number, skipped: number, wrote: boolean) {
  const withPhone = rows.filter((r) => r.phone).length;
  const withBank = rows.filter((r) => r.banks && r.banks.length > 0).length;
  const multiBank = rows.filter((r) => r.banks && r.banks.length > 1).length;
  const withDni = rows.filter((r) => r.dni_nie).length;
  const withDate = rows.filter((r) => r.registered_at).length;

  console.log('');
  console.log(wrote ? '=== IMPORTADO ===' : '=== SIMULACION (no se escribio nada) ===');
  console.log(`Filas con nombre en la hoja BD : ${total}`);
  console.log(`Descartadas (cuentas internas) : ${skipped}`);
  console.log(`Clientes a importar            : ${rows.length}`);
  console.log(`  con telefono                 : ${withPhone}`);
  console.log(`  con al menos un banco        : ${withBank}`);
  console.log(`  con mas de un banco          : ${multiBank}`);
  console.log(`  con DNI/NIE                  : ${withDni}`);
  console.log(`  con fecha de registro        : ${withDate}`);
  console.log('');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const { rows, total, skipped } = await readSheet(args.file);

  if (!args.write) {
    printSummary(rows, total, skipped, false);
    console.log('Vuelve a ejecutarlo con --write para insertar de verdad.');
    return;
  }

  const sql = postgres(requireDatabaseUrl(), { max: 1 });
  try {
    const [existing] = await sql<{ count: string }[]>`select count(*) as count from clients`;
    if (Number(existing.count) > 0 && !args.allowExisting) {
      console.error(
        `La tabla clients ya tiene ${existing.count} fila(s). Esta importacion es de una sola vez.\n` +
          'Si de verdad quieres insertar encima, vuelve a ejecutarlo con --allow-existing.',
      );
      process.exit(1);
    }

    // Insert in chunks so one huge statement does not hit any parameter limit.
    const CHUNK = 200;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      await sql`
        insert into clients ${sql(chunk, 'name', 'phone', 'banks', 'dni_nie', 'registered_at')}
      `;
    }

    printSummary(rows, total, skipped, true);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
