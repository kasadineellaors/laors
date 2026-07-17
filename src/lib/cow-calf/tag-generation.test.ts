import { describe, expect, it } from "vitest";
import { formatGenericCalfTag } from "./tag-generation";

describe("formatGenericCalfTag", () => {
  it("uses generic sequential labels", () => {
    expect(formatGenericCalfTag(1)).toBe("Calf 1");
    expect(formatGenericCalfTag(42)).toBe("Calf 42");
  });
});
