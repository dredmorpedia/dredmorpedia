import { describe, expect, it } from "vitest";

import {
  wandChargeRangeSummary,
  wandChargeRangesSummary,
} from "../src/lib/wand-charge-summary";

describe("wand charge summaries", () => {
  it("formats exact ranges and singular fixed counts for catalogue cards", () => {
    expect(wandChargeRangeSummary({ minimum: 2, maximum: 4 })).toBe(
      "2–4 charges",
    );
    expect(wandChargeRangeSummary({ minimum: 1, maximum: 1 })).toBe("1 charge");
    expect(wandChargeRangeSummary({ minimum: 3, maximum: 3 })).toBe(
      "3 charges",
    );
  });

  it("keeps incomplete and repeated declarations loss-aware", () => {
    expect(wandChargeRangeSummary({ minimum: null, maximum: 4 })).toBe(
      "?–4 charges",
    );
    expect(wandChargeRangeSummary({ minimum: 2, maximum: null })).toBe(
      "2–? charges",
    );
    expect(wandChargeRangeSummary({ minimum: null, maximum: null })).toBe(
      "Unavailable",
    );
    expect(
      wandChargeRangesSummary([
        { minimum: 2, maximum: 4 },
        { minimum: 1, maximum: 1 },
      ]),
    ).toBe("2–4 charges; 1 charge");
  });
});
