import { describe, expect, it } from "vitest";
import {
  calculateCowCalfInventory,
  reconcileMixedHerdCounts,
  type CowCalfAnimalSnapshot,
  type DamCalfRelationshipSnapshot,
} from "@/lib/cow-calf/inventory-calculations";

function cow(id: string, overrides: Partial<CowCalfAnimalSnapshot> = {}): CowCalfAnimalSnapshot {
  return {
    id,
    role: "cow",
    lifecycleStatus: "active",
    reproductiveStatus: "nursing",
    ...overrides,
  };
}

function calf(id: string, overrides: Partial<CowCalfAnimalSnapshot> = {}): CowCalfAnimalSnapshot {
  return {
    id,
    role: "calf",
    lifecycleStatus: "active",
    calfLifecycleStatus: "at_side",
    ...overrides,
  };
}

function rel(damId: string, calfId: string, nursingStatus: DamCalfRelationshipSnapshot["nursingStatus"] = "at_side"): DamCalfRelationshipSnapshot {
  return { damId, calfId, nursingStatus, isActive: true };
}

describe("calculateCowCalfInventory", () => {
  it("counts cow with calf at side as one pair and two head", () => {
    const result = calculateCowCalfInventory({
      animals: [cow("c1"), calf("f1")],
      relationships: [rel("c1", "f1")],
    });
    expect(result.pairs).toBe(1);
    expect(result.cows).toBe(1);
    expect(result.calvesAtSide).toBe(1);
    expect(result.totalPhysicalHead).toBe(2);
  });

  it("does not count cow without calf as a pair", () => {
    const result = calculateCowCalfInventory({
      animals: [cow("c1", { reproductiveStatus: "open" })],
      relationships: [],
    });
    expect(result.pairs).toBe(0);
    expect(result.cows).toBe(1);
    expect(result.calvesAtSide).toBe(0);
  });

  it("counts twins as two calves and two pairs for one cow", () => {
    const result = calculateCowCalfInventory({
      animals: [cow("c1"), calf("f1"), calf("f2")],
      relationships: [rel("c1", "f1"), rel("c1", "f2")],
    });
    expect(result.pairs).toBe(2);
    expect(result.calvesAtSide).toBe(2);
    expect(result.totalPhysicalHead).toBe(3);
  });

  it("excludes weaned calf from calves at side", () => {
    const result = calculateCowCalfInventory({
      animals: [cow("c1"), calf("f1", { calfLifecycleStatus: "weaned" })],
      relationships: [rel("c1", "f1", "weaned")],
    });
    expect(result.calvesAtSide).toBe(0);
    expect(result.pairs).toBe(0);
  });

  it("excludes sold animals from active counts", () => {
    const result = calculateCowCalfInventory({
      animals: [
        cow("c1", { lifecycleStatus: "sold" }),
        calf("f1", { lifecycleStatus: "sold" }),
      ],
      relationships: [rel("c1", "f1")],
    });
    expect(result.cows).toBe(0);
    expect(result.calvesAtSide).toBe(0);
    expect(result.pairs).toBe(0);
  });

  it("includes bull in total head without affecting pairs", () => {
    const result = calculateCowCalfInventory({
      animals: [cow("c1"), calf("f1"), { id: "b1", role: "bull", lifecycleStatus: "active" }],
      relationships: [rel("c1", "f1")],
    });
    expect(result.pairs).toBe(1);
    expect(result.bulls).toBe(1);
    expect(result.totalPhysicalHead).toBe(3);
  });

  it("adds group totals without treating pairs as single head", () => {
    const result = calculateCowCalfInventory({
      animals: [],
      relationships: [],
      groupCounts: {
        groupCows: 42,
        groupCalvesAtSide: 39,
        groupBulls: 2,
        groupReplacements: 0,
      },
    });
    expect(result.cows).toBe(42);
    expect(result.calvesAtSide).toBe(39);
    expect(result.bulls).toBe(2);
    expect(result.totalPhysicalHead).toBe(83);
    expect(result.pairs).toBe(0);
  });
});

describe("reconcileMixedHerdCounts", () => {
  it("prevents double counting identified animals in mixed mode", () => {
    const reconciled = reconcileMixedHerdCounts(
      { groupCows: 42, groupCalvesAtSide: 39, groupBulls: 2, groupReplacements: 0 },
      28,
      25,
    );
    expect(reconciled.groupCows).toBe(14);
    expect(reconciled.groupCalvesAtSide).toBe(14);
  });
});
