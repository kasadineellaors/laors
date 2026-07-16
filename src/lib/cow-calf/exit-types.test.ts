import { describe, expect, it } from "vitest";
import { calfStatusAfterWeaning, animalTypeAfterReplacementWeaning } from "./exit-types";

describe("exit-types", () => {
  it("marks retained calves as replacement", () => {
    expect(calfStatusAfterWeaning(true)).toBe("replacement");
    expect(calfStatusAfterWeaning(false)).toBe("weaned");
  });

  it("promotes female calves to heifer when retained", () => {
    expect(animalTypeAfterReplacementWeaning("female")).toBe("heifer");
    expect(animalTypeAfterReplacementWeaning("male")).toBe("other");
  });
});
