import { describe, expect, it } from "vitest";

import { parseSourceInteger, parseSourceNumber } from "../src/numeric-lexemes";

describe("numeric source lexemes", () => {
  it("accepts the measured signed and leading-zero integer forms", () => {
    expect(["0", "02", "473", "-1", "-9999"].map(parseSourceInteger)).toEqual([
      0, 2, 473, -1, -9999,
    ]);
    expect(parseSourceInteger(String(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
    expect(["1.0", ".5", "-.5"].map(parseSourceInteger)).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("accepts integers and the measured complete decimal forms", () => {
    expect(
      ["0", "02", "0.10", "3.50", ".04", "-.5", "-2.75"].map(parseSourceNumber),
    ).toEqual([0, 2, 0.1, 3.5, 0.04, -0.5, -2.75]);
  });

  it("rejects coercible but non-contractual or unrepresentable forms", () => {
    const invalid = [
      "",
      " ",
      " 1",
      "1 ",
      "+1",
      "1.",
      ".",
      "1e2",
      "0x10",
      "0b10",
      "Infinity",
      "NaN",
      "1_000",
      "1,5",
      "１２",
    ];

    expect(invalid.map(parseSourceInteger)).toEqual(invalid.map(() => null));
    expect(invalid.map(parseSourceNumber)).toEqual(invalid.map(() => null));
    expect(parseSourceInteger("9007199254740992")).toBeNull();
    expect(parseSourceNumber("9".repeat(400))).toBeNull();
  });
});
