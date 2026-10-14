import { Link } from "react-router";
import { Suspense } from "react";
import { currentMonth, formatRM, monthTrend, prevMonth, summariseMonth } from "@/lib/budget";
import { listExpensesInRange, listRecurringItems, recentExpenses } from "@/lib/db";
import { useDb } from "@/lib/use-db";
import { TrendChart } from "./trend-chart";

const TREND_MONTHS = 6;

function Dashboard() {
  const month = currentMonth();
  const from = Array.from({ length: TREND_MONTHS - 1 }).reduce<string>((m) => prevMonth(m), month);
  const recurring = listRecurringItems();
  const expenses = listExpensesInRange(from, month);
  const recent = recentExpenses(5);
  const s = summariseMonth(month, recurring, expenses);
  const trend = monthTrend(month, TREND_MONTHS, recurring, expenses);
  const negative = s.leftSen < 0;
  const max = s.byCategory[0]?.sen ?? 0;
  const hasTrend = trend.some((t) => t.incomeSen || t.fixedSen || t.variableSen);

  return (
    <>
      <section
        className={`rounded-3xl p-5 shadow-sm ${negative ? "border border-danger/40 bg-danger-soft text-danger" : "bg-accent text-accent-ink"}`}
      >
        <p className="flex items-center gap-1.5 text-sm font-medium opacity-80">
          {negative && (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3 2 21h20L12 3zm0 6v5m0 3v.01" />
            </svg>
          )}
          {negative ? "Over budget" : "Left to spend"} · {month}
        </p>
        <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums">{formatRM(s.leftSen)}</p>
        <Link
          to="/spending"
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-surface/95 px-5 text-sm font-semibold text-ink transition active:scale-[0.97]"
        >
          + Add expense
        </Link>
      </section>

      <h2 className="section-title mt-8 mb-2">Variable spend by category</h2>
      {s.byCategory.length === 0 ? (
        <p className="text-muted">No expenses this month.</p>
      ) : (
        <ul className="card space-y-4 p-4">
          {s.byCategory.map((c) => (
            <li key={c.categoryId}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span>{c.category}</span>
                <span className="font-medium tabular-nums">{formatRM(c.sen)}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(c.sen / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="section-title mt-8 mb-2">Last {TREND_MONTHS} months</h2>
      {hasTrend ? (
        <div className="card p-3">
          <TrendChart data={trend} />
        </div>
      ) : (
        <p className="text-muted">Nothing to chart yet.</p>
      )}

      <h2 className="section-title mt-8 mb-2">Recent expenses</h2>
      {recent.length === 0 ? (
        <p className="text-muted">No expenses yet.</p>
      ) : (
        <ul className="card divide-y divide-line px-4">
          {recent.map((e) => (
            <li key={e.id} className="flex justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate">{e.category} <span className="text-muted">· {e.paymentMethod}</span></p>
                <p className="truncate text-sm text-muted">{e.date}{e.note && ` · ${e.note}`}</p>
              </div>
              <span className="font-medium tabular-nums">{formatRM(e.amountSen)}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function Home() {
  useDb();
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-28 md:pb-8">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
