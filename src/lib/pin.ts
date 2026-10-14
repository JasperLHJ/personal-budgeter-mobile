import { del, get, set } from "idb-keyval";

// UI lock only, not encryption. Kept under its own key so backups/imports never touch it.
const KEY = "budgeter-pin";
type Stored = { salt: string; hash: string };

const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map((x) => x.toString(16).padStart(2, "0")).join("");

async function derive(pin: string, salt: Uint8Array<ArrayBuffer>) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100_000 }, key, 256));
}

export const hasPin = async () => (await get<Stored>(KEY)) !== undefined;

export async function setPin(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4–8 digits.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  await set(KEY, { salt: hex(salt), hash: await derive(pin, salt) } satisfies Stored);
}

export const clearPin = () => del(KEY);

export async function checkPin(pin: string) {
  const s = await get<Stored>(KEY);
  if (!s) return true;
  const salt = new Uint8Array(s.salt.match(/../g)!.map((h) => parseInt(h, 16)));
  return (await derive(pin, salt)) === s.hash;
}
