import { describe, expect, test } from "vitest";
import {
  currentMonth,
  formatRM,
  isActiveInMonth,
  isValidDate,
  monthTrend,
  monthOfDate,
  nextMonth,
  parseAmountSen,
  parseMonth,
  prevMonth,
  summariseMonth,
  todayDate,
} from "@/lib/budget";

describe("parseAmountSen", () => {
  test.each([
    ["12", 1200],
    ["12.5", 1250],
    ["12.50", 1250],
    ["0.05", 5],
    [" 1,000.00 ", 100000],
    [".5", 50],
    ["10000000", 1_000_000_000],
  ])("accepts %s", (input, sen) => expect(parseAmountSen(input)).toBe(sen));

  test.each(["0", "0.00", "-1", "1.234", "abc", "", "  ", "1.", "1e3", "12 3", "10000000.01"])(
    "rejects %j",
    (input) => expect(parseAmountSen(input)).toBeNull(),
  );
});

describe("formatRM", () => {
  test.each([
    [1250, "RM 12.50"],
    [5, "RM 0.05"],
    [123450, "RM 1,234.50"],
    [100000000, "RM 1,000,000.00"],
    [-1250, "-RM 12.50"],
  ])("%d", (sen, out) => expect(formatRM(sen)).toBe(out));
});

describe("months", () => {
  test("rollover", () => {
    expect(prevMonth("2026-01")).toBe("2025-12");
    expect(nextMonth("2025-12")).toBe("2026-01");
    expect(prevMonth("2026-03")).toBe("2026-02");
    expect(nextMonth("2026-03")).toBe("2026-04");
  });
  test("monthOfDate first/last day", () => {
    expect(monthOfDate("2026-02-01")).toBe("2026-02");
    expect(monthOfDate("2026-02-28")).toBe("2026-02");
    expect(monthOfDate("2024-12-31")).toBe("2024-12");
  });
  test("parseMonth", () => {
    expect(parseMonth("2026-10")).toBe("2026-10");
    for (const bad of ["2026-13", "2026-00", "2026-1", "abc", "", undefined, null])
      expect(parseMonth(bad)).toBeNull();
  });
  test("local today / current month", () => {
    const d = new Date(2026, 0, 31, 23, 59); // local time, not UTC
    expect(todayDate(d)).toBe("2026-01-31");
    expect(currentMonth(d)).toBe("2026-01");
  });
  test("isValidDate", () => {
    expect(isValidDate("2024-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-1-1")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });
});

describe("isActiveInMonth", () => {
  const item = { startMonth: "2026-03", endMonth: "2026-06" };
  test.each([
    ["2026-03", true], // start
    ["2026-04", true], // between
    ["2026-06", true], // end
    ["2026-02", false], // before
    ["2026-07", false], // after
    ["2025-05", false], // before, earlier year
  ])("%s -> %s", (month, active) => expect(isActiveInMonth(item, month)).toBe(active));

  test("open-ended", () => {
    const open = { startMonth: "2026-03", endMonth: null };
    expect(isActiveInMonth(open, "2026-02")).toBe(false);
    expect(isActiveInMonth(open, "2026-03")).toBe(true);
    expect(isActiveInMonth(open, "2099-12")).toBe(true);
  });

  test("one-off (start = end)", () => {
    const once = { startMonth: "2026-12", endMonth: "2026-12" };
    expect(isActiveInMonth(once, "2026-11")).toBe(false);
    expect(isActiveInMonth(once, "2026-12")).toBe(true);
    expect(isActiveInMonth(once, "2027-01")).toBe(false);
  });
});

describe("summariseMonth", () => {
  const salary = { kind: "income" as const, amountSen: 500000, startMonth: "2026-01", endMonth: null };
  const rent = { kind: "fixed" as const, amountSen: 150000, startMonth: "2026-01", endMonth: null };
  const food = { categoryId: 1, category: "Food" };
  const fuel = { categoryId: 2, category: "Transport" };

  test("counts only items active in the month, incl. one-off income", () => {
    const bonus = { kind: "income" as const, amountSen: 100000, startMonth: "2026-12", endMonth: "2026-12" };
    const oldPhone = { kind: "fixed" as const, amountSen: 5000, startMonth: "2025-01", endMonth: "2026-11" };
    const s = summariseMonth("2026-12", [salary, rent, bonus, oldPhone], []);
    expect(s).toEqual({ incomeSen: 600000, fixedSen: 150000, variableSen: 0, leftSen: 450000, byCategory: [] });
    expect(summariseMonth("2027-01", [salary, rent, bonus, oldPhone], []).incomeSen).toBe(500000);
    expect(summariseMonth("2026-11", [salary, rent, bonus, oldPhone], []).fixedSen).toBe(155000);
  });

  test("left to spend goes negative", () => {
    const s = summariseMonth("2026-10", [salary, rent], [{ ...food, amountSen: 400000, date: "2026-10-05" }]);
    expect(s.leftSen).toBe(500000 - 150000 - 400000);
    expect(s.leftSen).toBeLessThan(0);
  });

  test.each([
    ["2027-02", "2027-02-28", "2027-01-31", "2027-03-01"], // 28 days
    ["2028-02", "2028-02-29", "2028-01-31", "2028-03-01"], // 29 days, leap
    ["2026-04", "2026-04-30", "2026-03-31", "2026-05-01"], // 30 days
    ["2026-12", "2026-12-31", "2026-11-30", "2027-01-01"], // 31 days, year end
  ])("%s includes first and last day only", (month, last, before, after) => {
    const xs = [`${month}-01`, last, before, after].map((date) => ({ ...food, amountSen: 100, date }));
    expect(summariseMonth(month, [], xs).variableSen).toBe(200);
  });

  test("variable by category, sorted by amount desc", () => {
    const fun = { categoryId: 3, category: "Entertainment" };
    const s = summariseMonth("2026-10", [salary], [
      { ...food, amountSen: 1200, date: "2026-10-01" },
      { ...fuel, amountSen: 5000, date: "2026-10-02" },
      { ...food, amountSen: 1350, date: "2026-10-31" },
      { ...fun, amountSen: 999, date: "2026-10-15" },
      { ...fun, amountSen: 99999, date: "2026-09-30" }, // other month
    ]);
    expect(s.byCategory).toEqual([
      { ...fuel, sen: 5000 },
      { ...food, sen: 2550 },
      { ...fun, sen: 999 },
    ]);
    expect(s.variableSen).toBe(8549);
    expect(s.leftSen).toBe(500000 - 8549);
  });
});

describe("monthTrend", () => {
  const recurring = [
    { kind: "income" as const, amountSen: 500000, startMonth: "2026-10", endMonth: null },
    { kind: "fixed" as const, amountSen: 100000, startMonth: "2026-01", endMonth: "2026-12" },
  ];
  const ex = (date: string, amountSen: number) => ({ amountSen, date, categoryId: 1, category: "Food" });
  const expenses = [ex("2026-08-31", 999), ex("2026-09-05", 100), ex("2027-01-01", 200), ex("2027-01-31", 50), ex("2027-03-01", 777)];

  test("6 months ending 2027-02 crosses the year boundary", () => {
    const t = monthTrend("2027-02", 6, recurring, expenses);
    expect(t.map((m) => m.month)).toEqual(["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(t.map((m) => m.variableSen)).toEqual([100, 0, 0, 0, 250, 0]);
    expect(t.map((m) => m.incomeSen)).toEqual([0, 500000, 500000, 500000, 500000, 500000]);
    expect(t.map((m) => m.fixedSen)).toEqual([100000, 100000, 100000, 100000, 0, 0]);
  });

  test("n=1", () => {
    expect(monthTrend("2026-10", 1, recurring, expenses)).toEqual([
      { month: "2026-10", incomeSen: 500000, fixedSen: 100000, variableSen: 0 },
    ]);
  });
});
