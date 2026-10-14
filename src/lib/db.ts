import { get, set } from "idb-keyval";
import { isValidDate, nextMonth, parseMonth, type RecurringKind } from "./budget";

// Local replacement for Postgres + Drizzle. State lives in memory, mirrored to one IndexedDB key.

export type CatalogRow = { id: number; name: string; archived: boolean; createdAt: string };
export type ExpenseRow = {
  id: number;
  amountSen: number;
  categoryId: number;
  paymentMethodId: number;
  date: string;
  note: string | null;
  createdAt: string;
};
export type RecurringRow = {
  id: number;
  kind: RecurringKind;
  name: string;
  amountSen: number;
  startMonth: string;
  endMonth: string | null;
  createdAt: string;
};
export type DbState = {
  version: 1;
  categories: CatalogRow[];
  paymentMethods: CatalogRow[];
  expenses: ExpenseRow[];
  recurringItems: RecurringRow[];
};
export type CatalogKind = "category" | "paymentMethod";
export type ExpenseValues = Omit<ExpenseRow, "id" | "createdAt">;
export type ExpenseWithNames = ExpenseValues & { id: number; category: string; paymentMethod: string };
export type RecurringValues = Omit<RecurringRow, "id" | "createdAt">;

export class DuplicateNameError extends Error {}

const KEY = "budgeter-db";
const SEED_CATEGORIES = ["Food", "Transport", "Groceries", "Shopping", "Entertainment", "Health", "Bills", "Other"];
const SEED_METHODS = ["Cash", "Touch 'n Go", "MAE"];

function seed(): DbState {
  const now = new Date().toISOString();
  const rows = (names: string[]) => names.map((name, i) => ({ id: i + 1, name, archived: false, createdAt: now }));
  return { version: 1, categories: rows(SEED_CATEGORIES), paymentMethods: rows(SEED_METHODS), expenses: [], recurringItems: [] };
}

let state: DbState = seed();
const listeners = new Set<() => void>();

export const getSnapshot = (): DbState => state;
export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Load from IndexedDB (seeding when empty). Call once at startup, before rendering. */
export async function loadDb(): Promise<void> {
  try {
    // Never block startup on the persistence request (it can stay pending, e.g. in headless/Firefox).
    void navigator.storage?.persist?.();
  } catch {
    /* best effort */
  }
  const stored = await get<DbState>(KEY);
  if (stored) state = stored;
  else {
    state = seed();
    await set(KEY, state);
  }
  listeners.forEach((l) => l());
}

// Writes run one at a time so overlapping awaits can't clobber each other.
let queue: Promise<unknown> = Promise.resolve();

/** Apply `fn` to a copy, persist, then swap in. Throws (memory unchanged) if `fn` or persist fails. */
export function mutate<T>(fn: (draft: DbState) => T): Promise<T> {
  const run = async () => {
    const draft = structuredClone(state);
    const result = fn(draft);
    await set(KEY, draft);
    state = draft;
    listeners.forEach((l) => l());
    return result;
  };
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

/** Replace the whole database (backup import). Caller must have validated `next`. */
export const replaceAll = (next: DbState) => mutate((d) => void Object.assign(d, structuredClone(next)));

/** Erase everything back to the fresh seeded state ("Forgot PIN?"). */
export const resetDb = () => mutate((d) => void Object.assign(d, seed()));

const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;
const nowIso = () => new Date().toISOString();

// Expenses

const withNames = (e: ExpenseRow): ExpenseWithNames => ({
  id: e.id,
  amountSen: e.amountSen,
  date: e.date,
  note: e.note,
  categoryId: e.categoryId,
  paymentMethodId: e.paymentMethodId,
  category: state.categories.find((c) => c.id === e.categoryId)!.name,
  paymentMethod: state.paymentMethods.find((p) => p.id === e.paymentMethodId)!.name,
});

const byNewest = (a: ExpenseRow, b: ExpenseRow) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : b.id - a.id);

/** Expenses from the first day of `from` to the last day of `to` (YYYY-MM). */
export function listExpensesInRange(from: string, to: string): ExpenseWithNames[] {
  const lo = `${from}-01`;
  const hi = `${nextMonth(to)}-01`;
  return state.expenses
    .filter((e) => e.date >= lo && e.date < hi)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id))
    .map(withNames);
}

export const listExpensesForMonth = (month: string) => listExpensesInRange(month, month);

export const recentExpenses = (limit = 5): ExpenseWithNames[] =>
  [...state.expenses].sort(byNewest).slice(0, limit).map(withNames);

// Includes archived rows; callers filter, so an edit form can show an expense's archived value.
export const allCategories = (): CatalogRow[] => [...state.categories].sort((a, b) => a.id - b.id);
export const allPaymentMethods = (): CatalogRow[] => [...state.paymentMethods].sort((a, b) => a.id - b.id);

export function getExpense(id: number) {
  const e = state.expenses.find((x) => x.id === id);
  return e && { id: e.id, categoryId: e.categoryId, paymentMethodId: e.paymentMethodId };
}

/** Payment method of the newest expense, if it's still active. */
export function lastUsedPaymentMethodId(): number | null {
  const active = new Set(state.paymentMethods.filter((p) => !p.archived).map((p) => p.id));
  return [...state.expenses].filter((e) => active.has(e.paymentMethodId)).sort(byNewest)[0]?.paymentMethodId ?? null;
}

export const isActiveCategory = (id: number) => state.categories.some((c) => c.id === id && !c.archived);
export const isActivePaymentMethod = (id: number) => state.paymentMethods.some((p) => p.id === id && !p.archived);

function checkExpense(d: DbState, v: ExpenseValues) {
  if (!Number.isInteger(v.amountSen) || v.amountSen <= 0) throw new Error("Amount must be above 0.");
  if (!isValidDate(v.date)) throw new Error("Invalid date.");
  if (!d.categories.some((c) => c.id === v.categoryId)) throw new Error("Unknown category.");
  if (!d.paymentMethods.some((p) => p.id === v.paymentMethodId)) throw new Error("Unknown payment method.");
}

export const insertExpense = (v: ExpenseValues) =>
  mutate((d) => {
    checkExpense(d, v);
    d.expenses.push({ ...v, id: nextId(d.expenses), createdAt: nowIso() });
  });

export const updateExpense = (id: number, v: ExpenseValues) =>
  mutate((d) => {
    checkExpense(d, v);
    const i = d.expenses.findIndex((e) => e.id === id);
    if (i >= 0) d.expenses[i] = { ...d.expenses[i], ...v };
  });

export const deleteExpense = (id: number) =>
  mutate((d) => void (d.expenses = d.expenses.filter((e) => e.id !== id)));

// Catalog (categories and payment methods share one shape)

const tableKey = (kind: CatalogKind) => (kind === "category" ? "categories" : "paymentMethods");

export const listCatalog = (kind: CatalogKind): CatalogRow[] => (kind === "category" ? allCategories() : allPaymentMethods());

// Case-sensitive exact match, like Postgres UNIQUE.
function assertUnique(rows: CatalogRow[], name: string, selfId?: number) {
  if (rows.some((r) => r.name === name && r.id !== selfId)) throw new DuplicateNameError(`"${name}" already exists.`);
}

export const createCatalogItem = (kind: CatalogKind, name: string) =>
  mutate((d) => {
    const rows = d[tableKey(kind)];
    assertUnique(rows, name);
    rows.push({ id: nextId(rows), name, archived: false, createdAt: nowIso() });
  });

export const renameCatalogItem = (kind: CatalogKind, id: number, name: string) =>
  mutate((d) => {
    const rows = d[tableKey(kind)];
    assertUnique(rows, name, id);
    const r = rows.find((x) => x.id === id);
    if (r) r.name = name;
  });

export const setCatalogArchived = (kind: CatalogKind, id: number, archived: boolean) =>
  mutate((d) => {
    const r = d[tableKey(kind)].find((x) => x.id === id);
    if (r) r.archived = archived;
  });

// Recurring items

export const listRecurringItems = (): RecurringRow[] =>
  [...state.recurringItems].sort((a, b) => (a.startMonth < b.startMonth ? -1 : a.startMonth > b.startMonth ? 1 : a.id - b.id));

function checkRecurring(v: RecurringValues) {
  if (v.kind !== "income" && v.kind !== "fixed") throw new Error("Invalid kind.");
  if (!Number.isInteger(v.amountSen) || v.amountSen <= 0) throw new Error("Amount must be above 0.");
  if (!parseMonth(v.startMonth) || (v.endMonth !== null && !parseMonth(v.endMonth))) throw new Error("Invalid month.");
  if (v.endMonth !== null && v.endMonth < v.startMonth) throw new Error("End month can't be before the start month.");
}

export const createRecurringItem = (v: RecurringValues) =>
  mutate((d) => {
    checkRecurring(v);
    d.recurringItems.push({ ...v, id: nextId(d.recurringItems), createdAt: nowIso() });
  });

export const updateRecurringItem = (id: number, v: RecurringValues) =>
  mutate((d) => {
    checkRecurring(v);
    const i = d.recurringItems.findIndex((r) => r.id === id);
    if (i >= 0) d.recurringItems[i] = { ...d.recurringItems[i], ...v };
  });

export const deleteRecurringItem = (id: number) =>
  mutate((d) => void (d.recurringItems = d.recurringItems.filter((r) => r.id !== id)));
