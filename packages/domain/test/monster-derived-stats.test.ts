import { describe, expect, it } from "vitest";

import { calculateMonsterPrimaryAttributes } from "../src/index";
import {
  calculateMonsterRequiredArmour,
  rankMonstersByRequiredArmour,
} from "../src/index";

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

  it("uses the last matching primary override and ignores other modifiers", () => {
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
      modifier: -2,
      total: 0,
    });
  });

  it("preserves a negative total instead of clamping it", () => {
    const values = calculateMonsterPrimaryAttributes(
      { fighter: 1, rogue: 0, wizard: 0 },
      [{ kind: "primary", sourceKey: "2", amount: -3 }],
    );

    expect(values.find((value) => value.key === "nimbleness")).toEqual({
      key: "nimbleness",
      label: "Nimbleness",
      base: 1,
      modifier: -3,
      total: -2,
    });
  });
});

describe("required armour by monster", () => {
  it("preserves the archetype formula and three mundane damage modifiers", () => {
    expect(
      calculateMonsterRequiredArmour({ fighter: 2, rogue: 3, wizard: 1 }, [
        { kind: "damage", sourceKey: "crushing", amount: 4 },
        { kind: "damage", sourceKey: "slashing", amount: -2 },
        { kind: "damage", sourceKey: "blasting", amount: 3 },
        { kind: "damage", sourceKey: "acidic", amount: 99 },
        { kind: "resistance", sourceKey: "crushing", amount: 99 },
      ]),
    ).toEqual({
      archetypeContribution: 1,
      mundaneDamageModifiers: 5,
      requiredArmour: 6,
    });
  });

  it("retains the historical floor behavior without clamping", () => {
    expect(
      calculateMonsterRequiredArmour({ fighter: 0, rogue: 0, wizard: 0 }, []),
    ).toEqual({
      archetypeContribution: -2,
      mundaneDamageModifiers: 0,
      requiredArmour: -2,
    });
  });

  it("ranks deterministically and keeps only the top ten", () => {
    const monsters = Array.from({ length: 11 }, (_, index) => ({
      id: `monster:${String(index).padStart(2, "0")}`,
      name: index === 9 ? "Alpha" : index === 10 ? "Beta" : `Monster ${index}`,
      slug: `monster-${index}`,
      archetypeLevels: {
        fighter: index >= 9 ? 12 : index + 3,
        rogue: 0,
        wizard: 0,
      },
      modifiers: [],
    }));

    const ranking = rankMonstersByRequiredArmour(monsters);

    expect(ranking).toHaveLength(10);
    expect(ranking.slice(0, 2).map((entry) => entry.monsterName)).toEqual([
      "Alpha",
      "Beta",
    ]);
    expect(ranking.map((entry) => entry.monsterName)).not.toContain(
      "Monster 0",
    );
  });
});
