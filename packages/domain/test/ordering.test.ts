import { describe, expect, it } from "vitest";

import { compareCodeUnits } from "../src/index";

describe("deterministic string ordering", () => {
  it("uses a fixed UTF-16 code-unit order", () => {
    expect(["é", "z", "a", "Z", "A", "Ω"].sort(compareCodeUnits)).toEqual([
      "A",
      "Z",
      "a",
      "z",
      "é",
      "Ω",
    ]);
  });

  it("returns zero only for identical strings", () => {
    expect(compareCodeUnits("clockwork", "clockwork")).toBe(0);
    expect(compareCodeUnits("clockwork", "Clockwork")).toBe(1);
    expect(compareCodeUnits("Clockwork", "clockwork")).toBe(-1);
  });
});
