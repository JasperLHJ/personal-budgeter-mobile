import { Suspense } from "react";
import { currentMonth } from "@/lib/budget";
import { listCatalog, listRecurringItems } from "@/lib/db";
import { useDb } from "@/lib/use-db";
import { BackupSection } from "./backup-section";
import { CatalogSection } from "./catalog-section";
import { RecurringSection } from "./recurring-section";

function Recurring() {
  return <RecurringSection items={listRecurringItems()} month={currentMonth()} />;
}

function Catalogs() {
  const categories = listCatalog("category");
  const methods = listCatalog("paymentMethod");
  return (
    <>
      <CatalogSection kind="category" title="Categories" items={categories} />
      <CatalogSection kind="paymentMethod" title="Payment methods" items={methods} />
    </>
  );
}

export default function SettingsPage() {
  useDb();
  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 p-4 pb-28 md:pb-8">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Recurring />
      </Suspense>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Catalogs />
      </Suspense>
      <BackupSection />
    </main>
  );
}
