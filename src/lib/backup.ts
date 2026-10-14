import { isValidDate, parseMonth, todayDate } from "./budget";
import { getSnapshot, replaceAll, type CatalogRow, type DbState, type ExpenseRow, type RecurringRow } from "./db";

const MAX_SEN = 1_000_000_000;

export const exportJson = (): string => JSON.stringify(getSnapshot(), null, 2);
export const backupFileName = () => `budgeter-backup-${todayDate()}.json`;

// Trust boundary: the file is user-supplied, so every field is checked before anything is replaced.

const fail = (msg: string): never => {
  throw new Error(`Invalid backup: ${msg}`);
};
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function rows(root: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = root[key];
  if (!Array.isArray(v)) return fail(`"${key}" must be a list.`);
  const ids = new Set<number>();
  v.forEach((r, i) => {
    if (!isObj(r)) fail(`${key}[${i}] must be an object.`);
    const id = (r as Record<string, unknown>).id;
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0) fail(`${key}[${i}] has a bad id.`);
    if (ids.has(id as number)) fail(`${key}[${i}] has a duplicate id ${id}.`);
    ids.add(id as number);
  });
  return v as Record<string, unknown>[];
}

function str(r: Record<string, unknown>, k: string, where: string): string {
  if (typeof r[k] !== "string") fail(`${where} needs text in "${k}".`);
  return r[k] as string;
}

function createdAt(r: Record<string, unknown>, where: string) {
  const s = str(r, "createdAt", where);
  if (Number.isNaN(Date.parse(s))) fail(`${where} has a bad createdAt.`);
  return s;
}

function name(r: Record<string, unknown>, where: string) {
  const n = str(r, "name", where);
  if (n !== n.trim() || !n || n.length > 50) fail(`${where} has a bad name.`);
  return n;
}

function amount(r: Record<string, unknown>, where: string) {
  const a = r.amountSen;
  if (typeof a !== "number" || !Number.isInteger(a) || a <= 0 || a > MAX_SEN) fail(`${where} has a bad amount.`);
  return a as number;
}

function catalog(root: Record<string, unknown>, key: string): CatalogRow[] {
  const names = new Set<string>();
  return rows(root, key).map((r, i) => {
    const where = `${key}[${i}]`;
    const n = name(r, where);
    if (names.has(n)) fail(`${where} duplicates the name "${n}".`);
    names.add(n);
    if (typeof r.archived !== "boolean") fail(`${where} needs true/false in "archived".`);
    return { id: r.id as number, name: n, archived: r.archived as boolean, createdAt: createdAt(r, where) };
  });
}

export function parseBackup(text: string): DbState {
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    return fail("not valid JSON.");
  }
  if (!isObj(root)) return fail("expected an object.");
  if (root.version !== 1) return fail("unsupported version.");

  const categories = catalog(root, "categories");
  const paymentMethods = catalog(root, "paymentMethods");
  const catIds = new Set(categories.map((c) => c.id));
  const pmIds = new Set(paymentMethods.map((p) => p.id));

  const expenses: ExpenseRow[] = rows(root, "expenses").map((r, i) => {
    const where = `expenses[${i}]`;
    const date = str(r, "date", where);
    if (!isValidDate(date)) fail(`${where} has a bad date.`);
    if (r.note !== null && (typeof r.note !== "string" || r.note.length > 500)) fail(`${where} has a bad note.`);
    if (!catIds.has(r.categoryId as number)) fail(`${where} points to a missing category.`);
    if (!pmIds.has(r.paymentMethodId as number)) fail(`${where} points to a missing payment method.`);
    return {
      id: r.id as number,
      amountSen: amount(r, where),
      categoryId: r.categoryId as number,
      paymentMethodId: r.paymentMethodId as number,
      date,
      note: r.note as string | null,
      createdAt: createdAt(r, where),
    };
  });

  const recurringItems: RecurringRow[] = rows(root, "recurringItems").map((r, i) => {
    const where = `recurringItems[${i}]`;
    if (r.kind !== "income" && r.kind !== "fixed") fail(`${where} has a bad kind.`);
    const startMonth = parseMonth(str(r, "startMonth", where));
    if (!startMonth) fail(`${where} has a bad startMonth.`);
    let endMonth: string | null = null;
    if (r.endMonth !== null) {
      endMonth = typeof r.endMonth === "string" ? parseMonth(r.endMonth) : null;
      if (!endMonth) fail(`${where} has a bad endMonth.`);
      if ((endMonth as string) < (startMonth as string)) fail(`${where} ends before it starts.`);
    }
    return {
      id: r.id as number,
      kind: r.kind as "income" | "fixed",
      name: name(r, where),
      amountSen: amount(r, where),
      startMonth: startMonth as string,
      endMonth,
      createdAt: createdAt(r, where),
    };
  });

  return { version: 1, categories, paymentMethods, expenses, recurringItems };
}

/** Validates, then replaces everything. Throws an Error with a readable message. */
export const importJson = (text: string) => replaceAll(parseBackup(text));
