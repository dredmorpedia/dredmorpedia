import { describe, expect, it } from "vitest";

import { isValidTemplateRows, summarizeTemplateRows } from "../src/index";

describe("targeting template grids", () => {
  it("validates and summarizes a rectangular pattern with one anchor", () => {
    const rows = [".@.", "@#@", ".@."];

    expect(isValidTemplateRows(rows)).toBe(true);
    expect(summarizeTemplateRows(rows, true)).toEqual({
      rowCount: 3,
      columnCount: 3,
      affectedTileCount: 5,
    });
    expect(summarizeTemplateRows(rows, false).affectedTileCount).toBe(4);
  });

  it("allows an explicit empty pattern for the consumer failure state", () => {
    expect(isValidTemplateRows([])).toBe(true);
    expect(summarizeTemplateRows([], false)).toEqual({
      rowCount: 0,
      columnCount: 0,
      affectedTileCount: 0,
    });
  });

  it.each([
    ["non-array", "..."],
    ["blank row", [".#.", ""]],
    ["unsupported symbol", [".#.", ".x."]],
    ["ragged rows", [".#.", ".."]],
    ["missing anchor", ["...", ".@."]],
    ["multiple anchors", [".#.", ".#."]],
  ])("rejects %s", (_label, rows) => {
    expect(isValidTemplateRows(rows)).toBe(false);
  });
});
