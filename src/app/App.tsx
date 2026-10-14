import { useEffect, useState } from "react";
import { hasPin } from "@/lib/pin";
import { LockScreen } from "./lock-screen";
import { Navigate, Route, Routes } from "react-router";
import { TabBar } from "./tab-bar";
import Home from "./page";
import SettingsPage from "./settings/page";
import SpendingPage from "./spending/page";

export default function App({ startLocked }: { startLocked: boolean }) {
  const [locked, setLocked] = useState(startLocked);

  // Re-lock when the app goes to the background (recent-apps switcher).
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void hasPin().then((p) => p && setLocked(true));
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  if (locked) return <LockScreen onUnlock={() => setLocked(false)} />;
  return (
    <>
      <TabBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/spending" element={<SpendingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
