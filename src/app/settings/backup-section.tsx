import { useRef, useState } from "react";
import { backupFileName, exportJson, importJson } from "@/lib/backup";

const button = "btn-quiet";

export function BackupSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson()], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = backupFileName();
    a.click();
    URL.revokeObjectURL(url);
  };

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    if (!window.confirm("Replace ALL data on this phone with this backup?")) return;
    try {
      await importJson(text);
      setMessage({ ok: true, text: "Backup restored." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "Could not restore the backup." });
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="section-title">Backup</h2>
      <p className="text-muted">Your data lives only on this phone. Export a backup regularly.</p>
      <div className="flex gap-2">
        <button type="button" onClick={download} className={button}>
          Export
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={button}>
          Import
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const input = e.currentTarget;
            void pick(input.files?.[0]).finally(() => (input.value = ""));
          }}
        />
      </div>
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
