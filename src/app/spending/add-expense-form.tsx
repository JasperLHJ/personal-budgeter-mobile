import { startTransition, useActionState, useEffect, useRef } from "react";
import { todayDate } from "@/lib/budget";
import { addExpense } from "@/lib/actions";
import { Chips, type Option } from "./chips";

export function AddExpenseForm({
  categories,
  paymentMethods,
  defaultPaymentMethodId,
}: {
  categories: Option[];
  paymentMethods: Option[];
  defaultPaymentMethodId: number | null;
}) {
  const [state, formAction, pending] = useActionState(addExpense, null);
  const formRef = useRef<HTMLFormElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  // Default date is the browser's local today (the server may be in another timezone).
  useEffect(() => {
    if (dateRef.current && !dateRef.current.value) dateRef.current.value = todayDate();
  }, []);

  useEffect(() => {
    if (!state?.ok || !formRef.current) return;
    formRef.current.reset();
    if (dateRef.current) dateRef.current.value = todayDate();
    amountRef.current?.focus();
  }, [state]);

  const missing = !categories.length ? "category" : !paymentMethods.length ? "payment method" : null;
  if (missing)
    return (
      <p className="card p-4 text-sm">
        <a href="/settings" className="underline">Add or unarchive a {missing} in Settings</a> to record expenses.
      </p>
    );

  return (
    <form
      ref={formRef}
      // Not a plain form action: React would clear the fields on a failed save too.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
      className="card space-y-3 p-4"
    >
      <input
        ref={amountRef}
        name="amount"
        inputMode="decimal"
        autoComplete="off"
        autoFocus
        required
        placeholder="Amount (RM)"
        aria-label="Amount in RM"
        className="field w-full text-3xl font-semibold tabular-nums"
      />
      <Chips name="categoryId" options={categories} />
      <Chips name="paymentMethodId" options={paymentMethods} defaultId={defaultPaymentMethodId ?? paymentMethods[0]?.id} />
      <div className="flex gap-2">
        <input ref={dateRef} type="date" name="date" required aria-label="Date" className="field" />
        <input name="note" maxLength={500} autoComplete="off" placeholder="Note (optional)" aria-label="Note" className="min-w-0 flex-1 field" />
      </div>
      <button disabled={pending} className="btn w-full">
        {pending ? "Saving..." : "Add expense"}
      </button>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
