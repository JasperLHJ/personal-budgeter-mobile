import { useEffect, useState } from "react";
import { clearPin, hasPin, setPin } from "@/lib/pin";

const button = "btn-quiet";

export function PinSection() {
  const [on, setOn] = useState(false);
  const [editing, setEditing] = useState(false);
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => void hasPin().then(setOn), []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) return setMessage({ ok: false, text: "PINs don't match." });
    try {
      await setPin(next);
      setOn(true);
      setEditing(false);
      setNext("");
      setConfirm("");
      setMessage({ ok: true, text: "PIN saved." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Could not save the PIN." });
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove the PIN lock?")) return;
    await clearPin();
    setOn(false);
    setEditing(false);
    setMessage({ ok: true, text: "PIN removed." });
  };

  const showForm = !on || editing;
  return (
    <section className="space-y-3">
      <h2 className="section-title">PIN lock</h2>
      <p className="text-muted">{on ? "PIN lock is on." : "Ask for a PIN when the app opens."}</p>
      {showForm && (
        <form onSubmit={save} className="space-y-2">
          {(["New PIN", "Confirm PIN"] as const).map((label) => (
            <input
              key={label}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              placeholder={label}
              aria-label={label}
              value={label === "New PIN" ? next : confirm}
              onChange={(e) => (label === "New PIN" ? setNext : setConfirm)(e.target.value.replace(/\D/g, ""))}
              className="field w-full"
            />
          ))}
          <button className="btn w-full">{on ? "Save new PIN" : "Set PIN"}</button>
        </form>
      )}
      {on && (
        <div className="flex gap-2">
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className={button}>
              Change PIN
            </button>
          )}
          <button type="button" onClick={() => void remove()} className={`${button} btn-danger`}>
            Remove PIN
          </button>
        </div>
      )}
      {message &&
        (message.ok ? (
          <p role="status" className="text-sm text-muted">
            {message.text}
          </p>
        ) : (
          <p role="alert" className="text-sm text-danger">
            {message.text}
          </p>
        ))}
    </section>
  );
}
