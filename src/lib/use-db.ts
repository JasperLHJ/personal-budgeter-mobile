import { useSyncExternalStore } from "react";
import { getSnapshot, subscribe } from "./db";

/** Re-renders the caller whenever the database changes. */
export const useDb = () => useSyncExternalStore(subscribe, getSnapshot);
