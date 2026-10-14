import { useEffect, useState } from "react";
import { resetDb } from "@/lib/db";
import { checkPin, clearPin } from "@/lib/pin";

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPinValue] = useState("");
  const [error, setError] = useState("");
  const [fails, setFails] = useState(0); // shortcut: attempt counter resets on reload; persist it if brute force becomes a concern
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (wait > 0) return;
    if (await checkPin(pin)) return onUnlock();
    const n = fails + 1;
    setPinValue("");
    if (n >= 5) {
      setFails(0);
      setWait(30);
    } else {
      setFails(n);
      setError("Wrong PIN.");
    }
  };

  const forgot = async () => {
    if (!window.confirm("Erase ALL data on this phone and remove the PIN? This cannot be undone. Export first if you can.")) return;
    await resetDb();
    await clearPin();
    onUnlock();
  };

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg p-4">
      <h1 className="text-3xl font-semibold tracking-tight">Budgeter</h1>
      <form onSubmit={submit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          maxLength={8}
          aria-label="PIN"
          value={pin}
          disabled={wait > 0}
          onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
          className="field w-full text-center"
        />
        <button disabled={wait > 0 || pin.length < 4} className="btn w-full">
          Unlock
        </button>
        {wait > 0 ? (
          <p role="alert" className="text-center text-sm text-danger">
            Too many attempts. Try again in {wait}s.
          </p>
        ) : (
          error && (
            <p role="alert" className="text-center text-sm text-danger">
              {error}
            </p>
          )
        )}
      </form>
      <button type="button" onClick={() => void forgot()} className="btn-quiet">
        Forgot PIN?
      </button>
    </main>
  );
}
