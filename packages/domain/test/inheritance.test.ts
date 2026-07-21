import { describe, expect, it } from "vitest";

import { applyMonsterInheritance, type Monster } from "../src/index";

function monster(name: string, inheritsKey?: string): Monster {
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
    description: inheritsKey ? "" : "Inherited description",
    taxonomy: inheritsKey ? "" : "Animal",
    level: 1,
    depth: inheritsKey ? null : 2,
    special: false,
    iconPath: inheritsKey ? null : "assets/synthetic.svg",
    paletteName: inheritsKey ? null : "Synthetic brass",
    paletteTint: inheritsKey ? null : 45,
    archetypeLevels: { fighter: 2, rogue: 0, wizard: 0 },
    ai: {
      aggressiveness: inheritsKey ? 4 : 1,
      span: inheritsKey ? 10 : 8,
      invisible: Boolean(inheritsKey),
    },
    experienceValue: 10,
    modifiers: inheritsKey
      ? [{ kind: "damage", sourceKey: "crushing", amount: 3 }]
      : [
          { kind: "damage", sourceKey: "crushing", amount: 1 },
          { kind: "resistance", sourceKey: "toxic", amount: 2 },
        ],
    spellChance: inheritsKey ? null : 25,
    triggers: inheritsKey
      ? [
          {
            kind: "cast-when-aware",
            spellKey: "clockwork echo",
            spellName: "Clockwork Echo",
            chance: null,
            oneChanceIn: null,
          },
        ]
      : [],
    drops: inheritsKey
      ? [
          {
            itemKey: "child loot",
            itemName: "Child Loot",
            chance: 40,
          },
        ]
      : [
          {
            itemKey: "parent loot",
            itemName: "Parent Loot",
            chance: 75,
          },
        ],
    ...(inheritsKey ? { inheritsKey, inheritsName: "Parent" } : {}),
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

describe("monster inheritance", () => {
  it("inherits stable fields through the domain layer", () => {
    const parent = monster("Parent");
    const child = monster("Child", parent.canonicalKey);
    const result = applyMonsterInheritance([child, parent]);
    const resolvedChild = result.monsters.find(
      (entry) => entry.name === "Child",
    );

    expect(result.issues).toEqual([]);
    expect(resolvedChild?.description).toBe("Inherited description");
    expect(resolvedChild?.taxonomy).toBe("Animal");
    expect(resolvedChild?.depth).toBe(2);
    expect(resolvedChild?.iconPath).toBe("assets/synthetic.svg");
    expect(resolvedChild?.paletteName).toBe("Synthetic brass");
    expect(resolvedChild?.paletteTint).toBe(45);
    expect(resolvedChild?.ai).toEqual({
      aggressiveness: 4,
      span: 10,
      invisible: true,
    });
    expect(resolvedChild?.modifiers).toEqual([
      { kind: "damage", sourceKey: "crushing", amount: 3 },
      { kind: "resistance", sourceKey: "toxic", amount: 2 },
    ]);
    expect(resolvedChild?.spellChance).toBe(25);
    expect(resolvedChild?.triggers).toEqual([
      {
        kind: "cast-when-aware",
        spellKey: "clockwork echo",
        spellName: "Clockwork Echo",
        chance: 25,
        oneChanceIn: null,
      },
    ]);
    expect(resolvedChild?.drops).toEqual([
      {
        itemKey: "child loot",
        itemName: "Child Loot",
        chance: 40,
      },
    ]);
    expect(resolvedChild?.inheritsId).toBe(parent.id);
  });
});
