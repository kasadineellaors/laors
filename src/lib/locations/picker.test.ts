import { describe, expect, it } from "vitest";
import type { TreePickerOption } from "@/lib/locations/options";
import {
  collectDescendantIds,
  findPropertyRoot,
  findTreeNode,
  listSubLocationOptions,
  resolveLocationSelection,
} from "./picker";

const tree: TreePickerOption[] = [
  {
    id: "prop-1",
    name: "Home Place",
    depth: 0,
    head_count: 100,
    parent_id: null,
    type_name: "Property",
    breadcrumb: "Home Place",
    children: [
      {
        id: "trap-s",
        name: "South Trap",
        depth: 1,
        head_count: 60,
        parent_id: "prop-1",
        type_name: "Trap",
        breadcrumb: "Home Place › South Trap",
        children: [],
      },
      {
        id: "trap-r",
        name: "River Trap",
        depth: 1,
        head_count: 40,
        parent_id: "prop-1",
        type_name: "Trap",
        breadcrumb: "Home Place › River Trap",
        children: [
          {
            id: "pen-1",
            name: "Pen 1",
            depth: 2,
            head_count: 20,
            parent_id: "trap-r",
            type_name: "Pen",
            breadcrumb: "Home Place › River Trap › Pen 1",
            children: [],
          },
        ],
      },
    ],
  },
];

describe("findPropertyRoot", () => {
  it("returns property for nested location", () => {
    expect(findPropertyRoot(tree, "pen-1")?.id).toBe("prop-1");
  });
});

describe("listSubLocationOptions", () => {
  it("lists traps and nested pens under a property", () => {
    const parent = findTreeNode(tree, "prop-1")!;
    expect(listSubLocationOptions(parent).map((o) => o.label)).toEqual([
      "South Trap",
      "River Trap",
      "River Trap › Pen 1",
    ]);
  });
});

describe("resolveLocationSelection", () => {
  it("prefers sub-location when set", () => {
    expect(resolveLocationSelection(tree, "prop-1", "trap-s")).toBe("trap-s");
  });
});

describe("collectDescendantIds", () => {
  it("includes nested locations", () => {
    const parent = findTreeNode(tree, "prop-1")!;
    expect(collectDescendantIds(parent)).toEqual([
      "prop-1",
      "trap-s",
      "trap-r",
      "pen-1",
    ]);
  });
});
