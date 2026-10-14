import { startTransition, useActionState, useCallback, useEffect, useState } from "react";
import { formatRM, senToAmountInput } from "@/lib/budget";
import { deleteExpense, updateExpense } from "@/lib/actions";
import { Chips, type Option } from "./chips";

export type ExpenseRowData = {
  id: number;
  amountSen: number;
  date: string;
  note: string | null;
  categoryId: number;
  paymentMethodId: number;
  category: string;
  paymentMethod: string;
};

export function ExpenseRow({
  e,
  categories,
  paymentMethods,
}: {
  e: ExpenseRowData;
  categories: Option[];
  paymentMethods: Option[];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <li className="py-3.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p>
            {e.category} <span className="text-muted">· {e.paymentMethod}</span>
          </p>
          <p className="text-sm text-muted">
            {e.date}
            {e.note && ` · ${e.note}`}
          </p>
        </div>
        <span className="font-medium tabular-nums">{formatRM(e.amountSen)}</span>
      </button>
      {open && <EditExpenseForm e={e} categories={categories} paymentMethods={paymentMethods} onDone={close} />}
    </li>
  );
}

// Unmounted when closed, so its action state resets on the next open.
function EditExpenseForm({
  e,
  categories,
  paymentMethods,
  onDone,
}: {
  e: ExpenseRowData;
  categories: Option[];
  paymentMethods: Option[];
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateExpense, null);
  const [delState, deleteAction, deleting] = useActionState(deleteExpense, null);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const remove = () => {
    if (!confirm("Delete this expense? This cannot be undone.")) return;
    const fd = new FormData();
    fd.set("id", String(e.id));
    startTransition(() => deleteAction(fd));
  };

  const error = state?.error ?? delState?.error;

  return (
    <form
      // Not a plain form action: React would clear the fields on a failed save too.
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        fd.set("id", String(e.id));
        startTransition(() => formAction(fd));
      }}
      className="card mt-3 space-y-3 p-4"
    >
      <input
        name="amount"
        inputMode="decimal"
        autoComplete="off"
        required
        defaultValue={senToAmountInput(e.amountSen)}
        aria-label="Amount in RM"
        className="field w-full text-2xl"
      />
      <Chips name="categoryId" options={categories} defaultId={e.categoryId} />
      <Chips name="paymentMethodId" options={paymentMethods} defaultId={e.paymentMethodId} />
      <div className="flex gap-2">
        <input type="date" name="date" required defaultValue={e.date} aria-label="Date" className="field" />
        <input
          name="note"
          maxLength={500}
          autoComplete="off"
          defaultValue={e.note ?? ""}
          placeholder="Note (optional)"
          aria-label="Note"
          className="min-w-0 flex-1 field"
        />
      </div>
      <div className="flex gap-2">
        <button disabled={pending || deleting} className="btn flex-1">
          {pending ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending || deleting}
          className="btn-quiet btn-danger px-4 font-medium"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  );
}
