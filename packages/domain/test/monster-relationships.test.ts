import { describe, expect, it } from "vitest";

import { itemMonsterDropRelationships, type Monster } from "../src/index";

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
