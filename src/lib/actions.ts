import { isValidDate, parseAmountSen, parseMonth } from "./budget";
import {
  createCatalogItem,
  createRecurringItem,
  deleteExpense as removeExpense,
  deleteRecurringItem,
  DuplicateNameError,
  getExpense,
  insertExpense,
  isActiveCategory,
  isActivePaymentMethod,
  renameCatalogItem,
  setCatalogArchived,
  updateExpense as saveExpense,
  updateRecurringItem,
  type CatalogKind,
  type RecurringValues,
} from "./db";

// Same signatures as the Next server actions, so they plug into useActionState unchanged.

export type ExpenseState = { ok: boolean; error?: string } | null;
export type CatalogState = { ok: boolean; error?: string } | null;

// Spending

type Fields = { amountSen: number; categoryId: number; paymentMethodId: number; date: string; note: string | null };

// Shared by add and update. `current` lets an edit keep its archived Category/Payment method.
function parseFields(
  fd: FormData,
  current?: { categoryId: number; paymentMethodId: number },
): { error: string } | { value: Fields } {
  const amountSen = parseAmountSen(String(fd.get("amount") ?? ""));
  if (amountSen === null) return { error: "Enter an amount above 0 with at most 2 decimals." };

  const categoryId = Number(fd.get("categoryId"));
  const paymentMethodId = Number(fd.get("paymentMethodId"));
  if (!Number.isInteger(categoryId) || !(categoryId === current?.categoryId || isActiveCategory(categoryId)))
    return { error: "Pick a category." };
  if (
    !Number.isInteger(paymentMethodId) ||
    !(paymentMethodId === current?.paymentMethodId || isActivePaymentMethod(paymentMethodId))
  )
    return { error: "Pick a payment method." };

  const date = String(fd.get("date") ?? "");
  if (!isValidDate(date)) return { error: "Enter a valid date." };

  const note = String(fd.get("note") ?? "").trim();
  if (note.length > 500) return { error: "Note is too long (max 500 characters)." };

  return { value: { amountSen, categoryId, paymentMethodId, date, note: note || null } };
}

export async function addExpense(_prev: ExpenseState, fd: FormData): Promise<ExpenseState> {
  const parsed = parseFields(fd);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    await insertExpense(parsed.value);
  } catch {
    return { ok: false, error: "Could not save the expense. Try again." };
  }
  return { ok: true };
}

export async function updateExpense(_prev: ExpenseState, fd: FormData): Promise<ExpenseState> {
  const id = Number(fd.get("id"));
  const existing = Number.isInteger(id) ? getExpense(id) : undefined;
  if (!existing) return { ok: false, error: "This expense no longer exists." };

  const parsed = parseFields(fd, existing);
  if ("error" in parsed) return { ok: false, error: parsed.error };
  try {
    await saveExpense(id, parsed.value);
  } catch {
    return { ok: false, error: "Could not save the expense. Try again." };
  }
  return { ok: true };
}

export async function deleteExpense(_prev: ExpenseState, fd: FormData): Promise<ExpenseState> {
  const id = Number(fd.get("id"));
  if (!Number.isInteger(id)) return { ok: false, error: "This expense no longer exists." };
  try {
    await removeExpense(id);
  } catch {
    return { ok: false, error: "Could not delete the expense. Try again." };
  }
  return { ok: true };
}

// Settings: catalog

function kindOf(fd: FormData): CatalogKind | null {
  const kind = fd.get("kind");
  return kind === "category" || kind === "paymentMethod" ? kind : null;
}

function idOf(fd: FormData) {
  const id = Number(fd.get("id"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

const nameOf = (fd: FormData) => String(fd.get("name") ?? "").trim();

function nameError(name: string) {
  if (!name) return "Enter a name.";
  if (name.length > 50) return "Name is too long (max 50 characters).";
  return null;
}

/** Runs a catalog write; a duplicate name becomes a form error instead of a crash. */
async function write(op: () => Promise<unknown>): Promise<CatalogState> {
  try {
    await op();
  } catch (e) {
    if (e instanceof DuplicateNameError) return { ok: false, error: e.message };
    throw e;
  }
  return { ok: true };
}

export async function addItem(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  const kind = kindOf(fd);
  if (!kind) return { ok: false, error: "Unknown list." };
  const name = nameOf(fd);
  const err = nameError(name);
  if (err) return { ok: false, error: err };
  return write(() => createCatalogItem(kind, name));
}

export async function renameItem(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  const kind = kindOf(fd);
  const id = idOf(fd);
  if (!kind || !id) return { ok: false, error: "Unknown item." };
  const name = nameOf(fd);
  const err = nameError(name);
  if (err) return { ok: false, error: err };
  return write(() => renameCatalogItem(kind, id, name));
}

export async function setItemArchived(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  const kind = kindOf(fd);
  const id = idOf(fd);
  if (!kind || !id) return { ok: false, error: "Unknown item." };
  return write(() => setCatalogArchived(kind, id, fd.get("archived") === "1"));
}

// Settings: recurring items

function recurringValues(fd: FormData): RecurringValues | string {
  const kind = fd.get("kind");
  if (kind !== "income" && kind !== "fixed") return "Choose income or fixed.";
  const name = nameOf(fd);
  const err = nameError(name);
  if (err) return err;
  const amountSen = parseAmountSen(String(fd.get("amount") ?? ""));
  if (amountSen === null) return "Enter an amount above RM 0, e.g. 12.50.";
  const startMonth = parseMonth(String(fd.get("startMonth") ?? ""));
  if (!startMonth) return "Enter a start month (YYYY-MM).";
  const rawEnd = String(fd.get("endMonth") ?? "").trim();
  const endMonth = rawEnd ? parseMonth(rawEnd) : null;
  if (rawEnd && !endMonth) return "End month must be YYYY-MM, or left empty.";
  if (endMonth && endMonth < startMonth) return "End month can't be before the start month.";
  return { kind, name, amountSen, startMonth, endMonth };
}

/** Runs a recurring write; a failure becomes a form error instead of a crash. */
async function writeRecurring(op: () => Promise<unknown>): Promise<CatalogState> {
  try {
    await op();
  } catch {
    return { ok: false, error: "Could not save. Try again." };
  }
  return { ok: true };
}

export async function addRecurring(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  const v = recurringValues(fd);
  if (typeof v === "string") return { ok: false, error: v };
  return writeRecurring(() => createRecurringItem(v));
}

export async function editRecurring(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  const id = idOf(fd);
  if (!id) return { ok: false, error: "Unknown item." };
  const v = recurringValues(fd);
  if (typeof v === "string") return { ok: false, error: v };
  return writeRecurring(() => updateRecurringItem(id, v));
}

export async function removeRecurring(_prev: CatalogState, fd: FormData): Promise<CatalogState> {
  const id = idOf(fd);
  if (!id) return { ok: false, error: "Unknown item." };
  return writeRecurring(() => deleteRecurringItem(id));
}
