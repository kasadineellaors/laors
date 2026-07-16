import { describe, expect, it } from "vitest";
import { buildCalvingAlerts, inferTwinStatus } from "./calving-alerts";

describe("calving-alerts", () => {
  it("builds overdue and unprocessed alerts", () => {
    const items = buildCalvingAlerts({
      dueNext7Days: 3,
      overdueNoCalving: 2,
      bredWithoutDueDate: 1,
      unprocessedCalves: 12,
      calfWithoutCalvingRecord: 0,
      multiDamCalves: 0,
    });
    expect(items.some((i) => i.id === "calving-overdue")).toBe(true);
    expect(items.some((i) => i.id === "calves-unprocessed")).toBe(true);
  });

  it("infers twin status from calf count", () => {
    expect(inferTwinStatus(1)).toBe("single");
    expect(inferTwinStatus(2)).toBe("twin");
    expect(inferTwinStatus(3)).toBe("triplet");
  });
});
