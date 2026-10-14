export type Option = { id: number; name: string };

const chip =
  "inline-flex min-h-10 cursor-pointer items-center rounded-full border border-line-strong bg-surface px-4 text-sm select-none transition-colors active:scale-[0.97] peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent";

export function Chips({ name, options, defaultId }: { name: string; options: Option[]; defaultId?: number | null }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => (
        <label key={o.id}>
          <input type="radio" name={name} value={o.id} defaultChecked={o.id === defaultId} required className="peer sr-only" />
          <span className={chip}>{o.name}</span>
        </label>
      ))}
    </div>
  );
}
