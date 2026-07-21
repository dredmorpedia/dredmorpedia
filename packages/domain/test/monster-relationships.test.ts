import { describe, expect, it } from "vitest";

import {
  isMonsterDrop,
  itemMonsterDropRelationships,
  type Monster,
} from "../src/index";

function monster(name: string, itemId?: string): Monster {
  const canonicalKey = name.toLocaleLowerCase("en");
  const provenance = {
    sourceId: "synthetic-base",
    file: "base/monDB.xml",
    line: 1,
    column: 1,
    originalName: name,
  };

  return {
    id: `monster:${canonicalKey}`,
    kind: "monster",
    canonicalKey,
    slug: canonicalKey.replaceAll(" ", "-"),
    slugAliases: [],
    name,
    description: "Synthetic monster",
    taxonomy: "Animal",
    level: 0,
    depth: 1,
    special: false,
    iconPath: null,
    paletteName: null,
    paletteTint: null,
    archetypeLevels: { fighter: 0, rogue: 0, wizard: 0 },
    ai: {
      aggressiveness: null,
      span: null,
      invisible: null,
      chicken: null,
      canCharm: null,
      canParalyze: null,
      stealGold: null,
      stealPercentage: null,
    },
    sight: { cone: null, modifier: null },
    movement: { dig: null, dash: null, charge: null },
    experienceValue: 0,
    modifiers: [],
    spellChance: null,
    triggers: [],
    drops: [
      {
        itemKey: "clockwork blade",
        itemName: "Clockwork Blade",
        ...(itemId ? { itemId } : {}),
        chance: 40,
      },
      { dropType: "artifact", chance: 25 },
    ],
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

describe("monster drop relationships", () => {
  it("accepts exactly one named or typed drop shape", () => {
    expect(
      isMonsterDrop({
        itemKey: "clockwork blade",
        itemName: "Clockwork Blade",
        itemId: "item:clockwork blade",
        chance: 40,
      }),
    ).toBe(true);
    expect(isMonsterDrop({ dropType: "artifact", chance: 100 })).toBe(true);
    expect(
      isMonsterDrop({
        itemKey: "clockwork blade",
        itemName: "Clockwork Blade",
        dropType: 42,
        chance: 40,
      }),
    ).toBe(false);
    expect(
      isMonsterDrop({
        itemKey: "clockwork blade",
        itemName: "Clockwork Blade",
        dropType: "artifact",
        chance: 40,
      }),
    ).toBe(false);
    expect(isMonsterDrop({ itemKey: "partial", chance: 40 })).toBe(false);
    expect(isMonsterDrop({ dropType: "artifact", chance: 101 })).toBe(false);
  });

  it("returns only resolved named drops in deterministic monster order", () => {
    const itemId = "item:clockwork blade";
    const relationships = itemMonsterDropRelationships(
      [
        monster("Zeta Diggle", itemId),
        monster("Alpha Diggle"),
        monster("Beta Diggle", itemId),
      ],
      itemId,
    );

    expect(
      relationships.map(({ monster: entry, drop, dropIndex }) => ({
        monster: entry.name,
        chance: drop.chance,
        dropIndex,
      })),
    ).toEqual([
      { monster: "Beta Diggle", chance: 40, dropIndex: 0 },
      { monster: "Zeta Diggle", chance: 40, dropIndex: 0 },
    ]);
  });
});
