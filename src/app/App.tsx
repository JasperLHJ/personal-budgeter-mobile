import { Navigate, Route, Routes } from "react-router";
import { TabBar } from "./tab-bar";
import Home from "./page";
import SettingsPage from "./settings/page";
import SpendingPage from "./spending/page";

export default function App() {
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
