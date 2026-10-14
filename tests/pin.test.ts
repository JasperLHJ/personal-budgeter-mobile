import { beforeEach, describe, expect, test, vi } from "vitest";

const store = vi.hoisted(() => new Map<string, unknown>());
vi.mock("idb-keyval", () => ({
  get: async (k: string) => store.get(k),
  set: async (k: string, v: unknown) => void store.set(k, structuredClone(v)),
  del: async (k: string) => void store.delete(k),
}));

import { checkPin, clearPin, hasPin, setPin } from "@/lib/pin";

beforeEach(() => store.clear());

describe("pin", () => {
  test("set then check", async () => {
    expect(await hasPin()).toBe(false);
    await setPin("1234");
    expect(await hasPin()).toBe(true);
    expect(await checkPin("1234")).toBe(true);
    expect(await checkPin("1235")).toBe(false);
  });

  test("clear removes it", async () => {
    await setPin("1234");
    await clearPin();
    expect(await hasPin()).toBe(false);
  });

  test("rejects invalid format", async () => {
    for (const bad of ["123", "123456789", "12ab", ""]) await expect(setPin(bad)).rejects.toThrow("PIN must be 4–8 digits.");
    expect(await hasPin()).toBe(false);
  });

  test("stored value does not contain the PIN", async () => {
    await setPin("987654");
    expect(JSON.stringify(store.get("budgeter-pin"))).not.toContain("987654");
  });
});
