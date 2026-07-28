import { describe, expect, it } from "vitest";

import { stableSerialize } from "../src/index";

describe("stable serialization", () => {
  it("orders object keys by fixed UTF-16 code units", () => {
    const value = Object.fromEntries([
      ["é", 3],
      ["a", 2],
      ["Z", 1],
    ]);

    expect(stableSerialize(value)).toBe(
      ["{", '  "Z": 1,', '  "a": 2,', '  "é": 3', "}", ""].join("\n"),
    );
  });
});
