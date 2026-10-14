import { Link, useSearchParams } from "react-router";
import { Suspense } from "react";
import { currentMonth, formatRM, MonthSummary, nextMonth, parseMonth, prevMonth, summariseMonth } from "@/lib/budget";
import { allCategories, allPaymentMethods, lastUsedPaymentMethodId, listExpensesForMonth, listRecurringItems } from "@/lib/db";
import { useDb } from "@/lib/use-db";
import { AddExpenseForm } from "./add-expense-form";
import { ExpenseRow } from "./expense-row";

function Summary({ s }: { s: MonthSummary }) {
  const cells = [
    ["Income", s.incomeSen],
    ["Fixed", s.fixedSen],
    ["Variable", s.variableSen],
  ] as const;
  const negative = s.leftSen < 0;
  return (
    <div className="card mt-3 p-4">
      <dl className="grid grid-cols-3 gap-2 text-sm">
        {cells.map(([label, sen]) => (
          <div key={label}>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="font-medium tabular-nums">{formatRM(sen)}</dd>
          </div>
        ))}
      </dl>
      <p className={`mt-3 flex items-baseline justify-between border-t border-line pt-3 ${negative ? "text-danger" : ""}`}>
        <span className="font-medium">Left to spend{negative && " (over budget)"}</span>
        <span className="text-2xl font-semibold tabular-nums">{formatRM(s.leftSen)}</span>
      </p>
    </div>
  );
}

function Spending() {
  const [searchParams] = useSearchParams();
  const month = parseMonth(searchParams.get("month")) ?? currentMonth();
  const categories = allCategories();
  const methods = allPaymentMethods();
  const lastId = lastUsedPaymentMethodId();
  const rows = listExpensesForMonth(month);
  const recurring = listRecurringItems();
  const summary = summariseMonth(month, recurring, rows);
  const active = <T extends { archived: boolean }>(xs: T[]) => xs.filter((x) => !x.archived);

  return (
    <>
      <AddExpenseForm
        categories={active(categories)}
        paymentMethods={active(methods)}
        defaultPaymentMethodId={lastId}
      />
      <div className="mt-8 flex items-center justify-between">
        <Link to={`/spending?month=${prevMonth(month)}`} className="btn-quiet w-11" aria-label="Previous month">
          &lsaquo;
        </Link>
        <h2 className="text-lg font-semibold tabular-nums">{month}</h2>
        <Link to={`/spending?month=${nextMonth(month)}`} className="btn-quiet w-11" aria-label="Next month">
          &rsaquo;
        </Link>
      </div>
      <Summary s={summary} />
      {rows.length === 0 ? (
        <p className="mt-4 text-center text-muted">No expenses this month.</p>
      ) : (
        <ul className="card mt-3 divide-y divide-line px-4">
          {rows.map((e) => (
            // An edit keeps the expense's own archived Category/Payment method in the options.
            <ExpenseRow
              key={e.id}
              e={e}
              categories={categories.filter((c) => !c.archived || c.id === e.categoryId)}
              paymentMethods={methods.filter((m) => !m.archived || m.id === e.paymentMethodId)}
            />
          ))}
        </ul>
      )}
    </>
  );
}

export default function SpendingPage() {
  useDb();
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-28 md:pb-8">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">Spending</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Spending />
      </Suspense>
    </main>
  );
}
