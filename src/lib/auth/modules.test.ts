import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  resolveVisibleModules,
  ROLE_MODULE_PRESETS,
} from "./modules";

describe("resolveVisibleModules", () => {
  it("owners always see everything", () => {
    expect(resolveVisibleModules("owner", ["dashboard"]).length).toBeGreaterThan(8);
  });

  it("uses custom modules when provided", () => {
    expect(resolveVisibleModules("worker", ["dashboard", "jobs"])).toEqual([
      "dashboard",
      "jobs",
    ]);
  });

  it("falls back to role preset when custom list is empty", () => {
    expect(resolveVisibleModules("worker", null)).toEqual(ROLE_MODULE_PRESETS.worker);
  });
});

describe("canAccessPath", () => {
  it("blocks finance routes when invoices module is off", () => {
    expect(canAccessPath("/invoices", ROLE_MODULE_PRESETS.worker)).toBe(false);
    expect(canAccessPath("/invoices", ROLE_MODULE_PRESETS.accountant)).toBe(true);
  });
});
