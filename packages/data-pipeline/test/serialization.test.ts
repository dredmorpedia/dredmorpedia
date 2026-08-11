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

  it("can omit presentation whitespace without changing deterministic ordering", () => {
    const value = {
      outer: [{ beta: 2, alpha: 1 }],
      absent: undefined,
    };

    const compact = stableSerialize(value, { format: "compact" });

    expect(compact).toBe('{"outer":[{"alpha":1,"beta":2}]}\n');
    expect(JSON.parse(compact)).toEqual(JSON.parse(stableSerialize(value)));
  });
});
