import { FormEvent, startTransition, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { formatRM, isActiveInMonth, RecurringKind, senToAmountInput } from "@/lib/budget";
import { addRecurring, CatalogState, editRecurring, removeRecurring } from "@/lib/actions";

type Item = { id: number; kind: RecurringKind; name: string; amountSen: number; startMonth: string; endMonth: string | null };
type Action = (prev: CatalogState, fd: FormData) => Promise<CatalogState>;

const input = "field min-w-0";
const button = "btn-quiet";

// Submits without letting React clear the fields on a failed save (same as catalog-section).
function useSubmit(action: Action) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, dispatch, pending, onSubmit };
}

function FormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  ) : null;
}

/** Fields shared by the add and edit forms; `item` pre-fills an edit. */
function Fields({ item, month }: { item?: Item; month: string }) {
  return (
    <>
      <div className="flex gap-3">
        <label className="grid gap-1 text-xs text-muted">
          Kind
          <select name="kind" defaultValue={item?.kind ?? "income"} className={`${input} text-base text-ink`}>
            <option value="income">Income</option>
            <option value="fixed">Fixed</option>
          </select>
        </label>
        <label className="grid min-w-0 flex-1 gap-1 text-xs text-muted">
          Name
          <input name="name" defaultValue={item?.name} maxLength={50} autoComplete="off" required placeholder="e.g. Salary" className={`${input} text-base text-ink`} />
        </label>
      </div>
      <label className="grid gap-1 text-xs text-muted">
        Amount (RM)
        <input
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          required
          defaultValue={item && senToAmountInput(item.amountSen)}
          placeholder="0.00"
          className={`${input} text-base text-ink`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid min-w-0 gap-1 text-xs text-muted">
          From
          <input type="month" name="startMonth" required defaultValue={item?.startMonth ?? month} className={`${input} text-base text-ink`} />
        </label>
        <label className="grid min-w-0 gap-1 text-xs text-muted">
          To (optional)
          <input type="month" name="endMonth" defaultValue={item?.endMonth ?? ""} aria-describedby="end-hint" className={`${input} text-base text-ink`} />
        </label>
      </div>
    </>
  );
}

function AddForm({ month }: { month: string }) {
  const add = useSubmit(addRecurring);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (add.state?.ok) formRef.current?.reset();
  }, [add.state]);

  return (
    <form ref={formRef} onSubmit={add.onSubmit} className="card space-y-4 p-4">
      <Fields month={month} />
      <p id="end-hint" className="text-sm text-muted">
        Leave &quot;To&quot; empty if it has no end. One-off income (bonus, ang pao): set the same start and end month.
      </p>
      <button disabled={add.pending} className="btn w-full">
        Add recurring item
      </button>
      <FormError message={add.state?.error} />
    </form>
  );
}

function ItemRow({ item, month }: { item: Item; month: string }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <li className="py-3.5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <p>{item.name}</p>
          <p className="text-sm text-muted">
            {item.startMonth === item.endMonth ? item.startMonth : `${item.startMonth} – ${item.endMonth ?? "no end"}`}
          </p>
        </div>
        <span className="font-medium tabular-nums">{formatRM(item.amountSen)}</span>
      </button>
      {open && <EditForm item={item} month={month} onDone={close} />}
    </li>
  );
}

// Unmounted when closed, so its action state resets on the next open (same as expense-row).
function EditForm({ item, month, onDone }: { item: Item; month: string; onDone: () => void }) {
  const edit = useSubmit(editRecurring);
  const del = useSubmit(removeRecurring);
  useEffect(() => {
    if (edit.state?.ok) onDone();
  }, [edit.state, onDone]);

  const remove = () => {
    if (!confirm(`Delete "${item.name}"? Past months will no longer count it.`)) return;
    const fd = new FormData();
    fd.set("id", String(item.id));
    startTransition(() => del.dispatch(fd));
  };

  return (
    <form onSubmit={edit.onSubmit} className="mt-3 space-y-4 rounded-xl bg-bg p-4">
      <input type="hidden" name="id" value={item.id} />
      <Fields item={item} month={month} />
      <div className="flex gap-2">
        <button disabled={edit.pending || del.pending} className={button}>
          {edit.pending ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={remove} disabled={edit.pending || del.pending} className={`${button} btn-danger`}>
          {del.pending ? "Deleting..." : "Delete"}
        </button>
      </div>
      <FormError message={edit.state?.error ?? del.state?.error} />
    </form>
  );
}

function List({ title, items, month }: { title: string; items: Item[]; month: string }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mt-4 mb-2 text-xs font-medium text-muted">{title}</h4>
      <ul className="card divide-y divide-line px-4">
        {items.map((i) => (
          <ItemRow key={i.id} item={i} month={month} />
        ))}
      </ul>
    </div>
  );
}

/** `month` is the current Month, used to split active from ended/upcoming items. */
export function RecurringSection({ items, month }: { items: Item[]; month: string }) {
  const groups = [
    { kind: "income", title: "Income" },
    { kind: "fixed", title: "Fixed" },
  ] as const;
  return (
    <section className="space-y-4">
      <h2 className="section-title">Recurring items</h2>
      <AddForm month={month} />
      {groups.map(({ kind, title }) => {
        const ofKind = items.filter((i) => i.kind === kind);
        return (
          <div key={kind}>
            <h3 className="mt-8 mb-1 text-lg font-semibold">{title}</h3>
            {ofKind.length === 0 ? (
              <p className="text-muted">None yet.</p>
            ) : (
              <>
                <List title="Active this month" items={ofKind.filter((i) => isActiveInMonth(i, month))} month={month} />
                <List title="Ended / upcoming" items={ofKind.filter((i) => !isActiveInMonth(i, month))} month={month} />
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
