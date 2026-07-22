import { describe, expect, it } from "vitest";

import { calculateMonsterPrimaryAttributes } from "../src/index";

describe("monster primary attribute calculations", () => {
  it("applies every independently verified archetype coefficient", () => {
    expect(
      calculateMonsterPrimaryAttributes(
        { fighter: 2, rogue: 3, wizard: 5 },
        [],
      ),
    ).toEqual([
      {
        key: "burliness",
        label: "Burliness",
        base: 12,
        modifier: 0,
        total: 12,
      },
      { key: "sagacity", label: "Sagacity", base: 15, modifier: 0, total: 15 },
      {
        key: "nimbleness",
        label: "Nimbleness",
        base: 13,
        modifier: 0,
        total: 13,
      },
      {
        key: "caddishness",
        label: "Caddishness",
        base: 15,
        modifier: 0,
        total: 15,
      },
      {
        key: "stubbornness",
        label: "Stubbornness",
        base: 17,
        modifier: 0,
        total: 17,
      },
      { key: "savvy", label: "Savvy", base: 18, modifier: 0, total: 18 },
    ]);
  });

  it("adds only matching primary source modifiers", () => {
    const values = calculateMonsterPrimaryAttributes(
      { fighter: 2, rogue: 0, wizard: 0 },
      [
        { kind: "primary", sourceKey: "2", amount: 1 },
        { kind: "primary", sourceKey: "2", amount: -2 },
        { kind: "primary", sourceKey: "unmapped", amount: 99 },
        { kind: "secondary", sourceKey: "2", amount: 99 },
      ],
    );

    expect(values.find((value) => value.key === "burliness")).toEqual({
      key: "burliness",
      label: "Burliness",
      base: 4,
      modifier: 0,
      total: 4,
    });
    expect(values.find((value) => value.key === "nimbleness")).toEqual({
      key: "nimbleness",
      label: "Nimbleness",
      base: 2,
      modifier: -1,
      total: 1,
    });
  });
});
