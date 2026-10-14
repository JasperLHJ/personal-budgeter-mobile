import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router";
import "./index.css";
import App from "./app/App";
import { loadDb } from "./lib/db";

const root = createRoot(document.getElementById("root")!);
try {
  await loadDb();
  root.render(
    <HashRouter>
      <App />
    </HashRouter>,
  );
} catch (e) {
  root.render(<p style={{ padding: 16 }}>Could not open the local database: {e instanceof Error ? e.message : String(e)}</p>);
}
