import { FormEvent, startTransition, useActionState, useEffect, useRef } from "react";
import { addItem, CatalogState, renameItem, setItemArchived } from "@/lib/actions";

type Kind = "category" | "paymentMethod";
type Item = { id: number; name: string; archived: boolean };
type Action = (prev: CatalogState, fd: FormData) => Promise<CatalogState>;

const input = "field min-w-0 flex-1";
const button = "btn-quiet";

// Submits without letting React clear the fields on a failed save (same as add-expense-form).
function useSubmit(action: Action) {
  const [state, dispatch, pending] = useActionState(action, null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };
  return { state, pending, onSubmit };
}

function FormError({ message }: { message?: string }) {
  return message ? (
    <p role="alert" className="text-sm text-danger">
      {message}
    </p>
  ) : null;
}

function AddForm({ kind, label }: { kind: Kind; label: string }) {
  const add = useSubmit(addItem);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (add.state?.ok) formRef.current?.reset();
  }, [add.state]);

  return (
    <form ref={formRef} onSubmit={add.onSubmit} className="space-y-2">
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-2">
        <input name="name" maxLength={50} autoComplete="off" required placeholder={`New ${label.toLowerCase()}`} aria-label={`New ${label.toLowerCase()} name`} className={input} />
        <button disabled={add.pending} className={button}>
          Add
        </button>
      </div>
      <FormError message={add.state?.error} />
    </form>
  );
}

function ItemRow({ kind, item }: { kind: Kind; item: Item }) {
  const rename = useSubmit(renameItem);
  const archive = useSubmit(setItemArchived);
  const ids = (
    <>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={item.id} />
    </>
  );

  if (item.archived) {
    return (
      <li className="py-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted">{item.name}</span>
          <form onSubmit={archive.onSubmit}>
            {ids}
            <input type="hidden" name="archived" value="0" />
            <button disabled={archive.pending} className={button}>
              Unarchive
            </button>
          </form>
        </div>
        <FormError message={archive.state?.error} />
      </li>
    );
  }

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <form onSubmit={rename.onSubmit} className="flex min-w-0 flex-1 gap-2">
          {ids}
          <input name="name" defaultValue={item.name} maxLength={50} autoComplete="off" required aria-label={`Rename ${item.name}`} className={input} />
          <button disabled={rename.pending} className={button}>
            Rename
          </button>
        </form>
        <form onSubmit={archive.onSubmit}>
          {ids}
          <input type="hidden" name="archived" value="1" />
          <button disabled={archive.pending} className={button}>
            Archive
          </button>
        </form>
      </div>
      <FormError message={rename.state?.error ?? archive.state?.error} />
    </li>
  );
}

/** One Settings section for either kind; `items` holds active and archived rows. */
export function CatalogSection({ kind, title, items }: { kind: Kind; title: string; items: Item[] }) {
  const active = items.filter((i) => !i.archived);
  const archived = items.filter((i) => i.archived);
  const label = kind === "category" ? "Category" : "Payment method";

  return (
    <section className="space-y-3">
      <h2 className="section-title">{title}</h2>
      <AddForm kind={kind} label={label} />
      {active.length === 0 ? (
        <p className="text-muted">None yet.</p>
      ) : (
        <ul className="card divide-y divide-line px-4">
          {active.map((i) => (
            <ItemRow key={i.id} kind={kind} item={i} />
          ))}
        </ul>
      )}
      {archived.length > 0 && (
        <div>
          <h3 className="mt-4 text-sm font-medium text-muted">Archived</h3>
          <ul className="card divide-y divide-line px-4">
            {archived.map((i) => (
              <ItemRow key={i.id} kind={kind} item={i} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
