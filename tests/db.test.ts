import { beforeEach, describe, expect, test, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("idb-keyval", () => ({
  get: async (k: string) => store.get(k),
  set: async (k: string, v: unknown) => void store.set(k, structuredClone(v)),
}));

import { addExpense, addItem, deleteExpense, renameItem, setItemArchived, updateExpense } from "@/lib/actions";
import { exportJson, importJson } from "@/lib/backup";
import { allCategories, allPaymentMethods, listExpensesForMonth, loadDb } from "@/lib/db";

const form = (o: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(o)) fd.set(k, v);
  return fd;
};
const exp = (o: Record<string, string> = {}) =>
  form({ amount: "12.50", categoryId: "1", paymentMethodId: "1", date: "2026-03-05", note: "", ...o });

beforeEach(async () => {
  store.clear();
  await loadDb();
});

describe("db", () => {
  test("seeds on empty", () => {
    expect(allCategories().map((c) => c.name)).toEqual(["Food", "Transport", "Groceries", "Shopping", "Entertainment", "Health", "Bills", "Other"]);
    expect(allPaymentMethods().map((c) => c.name)).toEqual(["Cash", "Touch 'n Go", "MAE"]);
    expect(store.has("budgeter-db")).toBe(true);
  });

  test("add, update, delete expense", async () => {
    expect(await addExpense(null, exp())).toEqual({ ok: true });
    expect(listExpensesForMonth("2026-03")[0]).toMatchObject({ id: 1, amountSen: 1250, category: "Food", paymentMethod: "Cash" });
    expect(await updateExpense(null, exp({ id: "1", amount: "20", note: "hi" }))).toEqual({ ok: true });
    expect(listExpensesForMonth("2026-03")[0]).toMatchObject({ amountSen: 2000, note: "hi" });
    expect(await deleteExpense(null, form({ id: "1" }))).toEqual({ ok: true });
    expect(listExpensesForMonth("2026-03")).toEqual([]);
  });

  test("validation error string", async () => {
    expect(await addExpense(null, exp({ amount: "0" }))).toEqual({
      ok: false,
      error: "Enter an amount above 0 with at most 2 decimals.",
    });
  });

  test("duplicate catalog name", async () => {
    expect(await addItem(null, form({ kind: "category", name: "Food" }))).toEqual({ ok: false, error: '"Food" already exists.' });
    expect(await addItem(null, form({ kind: "category", name: "food" }))).toEqual({ ok: true });
    expect(await renameItem(null, form({ kind: "category", id: "1", name: "Food" }))).toEqual({ ok: true });
  });

  test("archived category: rejected on add, kept on edit", async () => {
    await addExpense(null, exp());
    await setItemArchived(null, form({ kind: "category", id: "1", archived: "1" }));
    expect(await addExpense(null, exp())).toEqual({ ok: false, error: "Pick a category." });
    expect(await updateExpense(null, exp({ id: "1", amount: "3" }))).toEqual({ ok: true });
    expect(await updateExpense(null, exp({ id: "1", categoryId: "2" }))).toEqual({ ok: true });
    expect(await updateExpense(null, exp({ id: "1", categoryId: "1" }))).toEqual({ ok: false, error: "Pick a category." });
  });

  test("export -> import round-trip", async () => {
    await addExpense(null, exp({ note: "x" }));
    const before = exportJson();
    await deleteExpense(null, form({ id: "1" }));
    await importJson(before);
    expect(JSON.parse(exportJson())).toEqual(JSON.parse(before));
  });

  test("import rejects dangling categoryId and leaves data alone", async () => {
    await addExpense(null, exp());
    const bad = JSON.parse(exportJson());
    bad.expenses[0].categoryId = 99;
    await expect(async () => importJson(JSON.stringify(bad))).rejects.toThrow(/missing category/);
    expect(listExpensesForMonth("2026-03")).toHaveLength(1);
  });
});
