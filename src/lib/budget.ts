// Pure money + month helpers. No DB or framework imports.

const MAX_SEN = 1_000_000_000; // RM 10,000,000.00; Postgres int4 max is ~2.1e9

/** "12", "12.5", "1,000.00" -> integer sen; null if invalid or <= 0. */
export function parseAmountSen(input: string): number | null {
  const s = input.trim().replace(/,/g, "");
  const m = /^(\d*)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m || (!m[1] && !m[2])) return null;
  const sen = Number(m[1] || "0") * 100 + Number((m[2] ?? "").padEnd(2, "0"));
  return sen > 0 && sen <= MAX_SEN ? sen : null;
}

/** Integer sen -> text for an amount input, e.g. 1250 -> "12.50". */
export const senToAmountInput = (sen: number): string => (sen / 100).toFixed(2);

export function formatRM(sen: number): string {
  const abs = Math.abs(sen);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const frac = String(abs % 100).padStart(2, "0");
  return `${sen < 0 ? "-" : ""}RM ${whole}.${frac}`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-time calendar date, YYYY-MM-DD. */
export function todayDate(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const monthOfDate = (date: string): string => date.slice(0, 7);
export const currentMonth = (now = new Date()): string => monthOfDate(todayDate(now));

export function parseMonth(s: string | null | undefined): string | null {
  return s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : null;
}

function shiftMonth(month: string, delta: number): string {
  const total = Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1 + delta;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}
export const prevMonth = (m: string) => shiftMonth(m, -1);
export const nextMonth = (m: string) => shiftMonth(m, 1);

export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.toISOString().slice(0, 10) === s;
}

// "YYYY-MM" strings compare correctly as text.
export function isActiveInMonth(item: { startMonth: string; endMonth: string | null }, month: string): boolean {
  return item.startMonth <= month && (item.endMonth === null || month <= item.endMonth);
}

export type RecurringKind = "income" | "fixed";
export type RecurringInput = { kind: RecurringKind; amountSen: number; startMonth: string; endMonth: string | null };
/** `date` is YYYY-MM-DD; expenses from other months are ignored, so a multi-month list is fine. */
export type ExpenseInput = { amountSen: number; date: string; categoryId: number; category: string };
export type CategorySpend = { categoryId: number; category: string; sen: number };
export type MonthSummary = {
  incomeSen: number;
  fixedSen: number;
  variableSen: number;
  leftSen: number;
  byCategory: CategorySpend[]; // sen desc
};

export function summariseMonth(month: string, recurring: RecurringInput[], expenses: ExpenseInput[]): MonthSummary {
  let incomeSen = 0;
  let fixedSen = 0;
  for (const r of recurring) {
    if (!isActiveInMonth(r, month)) continue;
    if (r.kind === "income") incomeSen += r.amountSen;
    else fixedSen += r.amountSen;
  }
  const byId = new Map<number, CategorySpend>();
  let variableSen = 0;
  for (const e of expenses) {
    if (monthOfDate(e.date) !== month) continue;
    variableSen += e.amountSen;
    const c = byId.get(e.categoryId) ?? { categoryId: e.categoryId, category: e.category, sen: 0 };
    c.sen += e.amountSen;
    byId.set(e.categoryId, c);
  }
  const byCategory = [...byId.values()].sort((a, b) => b.sen - a.sen || a.category.localeCompare(b.category));
  return { incomeSen, fixedSen, variableSen, leftSen: incomeSen - fixedSen - variableSen, byCategory };
}

export type TrendPoint = { month: string; incomeSen: number; fixedSen: number; variableSen: number };

/** The `n` months ending at `endMonth`, oldest first. */
export function monthTrend(endMonth: string, n: number, recurring: RecurringInput[], expenses: ExpenseInput[]): TrendPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const month = shiftMonth(endMonth, i - n + 1);
    const { incomeSen, fixedSen, variableSen } = summariseMonth(month, recurring, expenses);
    return { month, incomeSen, fixedSen, variableSen };
  });
}
