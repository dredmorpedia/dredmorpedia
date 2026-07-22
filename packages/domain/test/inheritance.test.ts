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
      chicken: inheritsKey ? true : null,
      canCharm: inheritsKey ? false : null,
      canParalyze: inheritsKey ? false : null,
      stealGold: inheritsKey ? true : null,
      stealPercentage: inheritsKey ? 20 : null,
    },
    sight: inheritsKey
      ? { cone: null, modifier: null }
      : { cone: 90, modifier: 0.8 },
    movement: inheritsKey
      ? { dig: null, dash: null, charge: null }
      : {
          dig: {
            chance: 20,
            ambushChance: 20,
            blockedChance: 100,
            minimumTurns: 3,
            maximumTurns: 6,
            minimumDistance: 3,
          },
          dash: null,
          charge: null,
        },
    presentation: inheritsKey
      ? {
          soundEffects: null,
          attack: null,
          hit: null,
          death: null,
          cast: null,
          beam: null,
          morph: null,
          dig: null,
        }
      : {
          soundEffects: null,
          attack: {
            down: "assets/synthetic.svg",
            left: null,
            right: null,
            up: null,
          },
          hit: null,
          death: null,
          cast: null,
          beam: null,
          morph: null,
          dig: null,
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
      chicken: true,
      canCharm: false,
      canParalyze: false,
      stealGold: true,
      stealPercentage: 20,
    });
    expect(resolvedChild?.sight).toEqual({ cone: null, modifier: null });
    expect(resolvedChild?.movement).toEqual({
      dig: null,
      dash: null,
      charge: null,
    });
    expect(resolvedChild?.presentation).toEqual({
      soundEffects: null,
      attack: null,
      hit: null,
      death: null,
      cast: null,
      beam: null,
      morph: null,
      dig: null,
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

  it("canonicalizes root modifiers and applies child overrides once", () => {
    const parent = monster("Parent");
    parent.modifiers = [
      { kind: "primary", sourceKey: "2", amount: 9 },
      { kind: "primary", sourceKey: "2", amount: 4 },
    ];
    const child = monster("Child", parent.canonicalKey);
    child.modifiers = [
      { kind: "primary", sourceKey: "2", amount: 7 },
      { kind: "primary", sourceKey: "2", amount: 1 },
    ];

    const result = applyMonsterInheritance([child, parent]);
    const resolvedParent = result.monsters.find(
      (entry) => entry.name === "Parent",
    );
    const resolvedChild = result.monsters.find(
      (entry) => entry.name === "Child",
    );

    expect(resolvedParent?.modifiers).toEqual([
      { kind: "primary", sourceKey: "2", amount: 4 },
    ]);
    expect(resolvedChild?.modifiers).toEqual([
      { kind: "primary", sourceKey: "2", amount: 1 },
    ]);
  });

  it("keeps every member of an inheritance cycle local", () => {
    const alpha = monster("Alpha", "beta");
    const beta = monster("Beta", "gamma");
    const gamma = monster("Gamma", "alpha");
    alpha.description = "Alpha only";
    beta.description = "Beta only";
    gamma.description = "Gamma only";

    const result = applyMonsterInheritance([gamma, alpha, beta]);

    expect(result.issues).toEqual([
      { type: "cycle", monsterId: alpha.id, parentKey: "beta" },
      { type: "cycle", monsterId: beta.id, parentKey: "gamma" },
      { type: "cycle", monsterId: gamma.id, parentKey: "alpha" },
    ]);
    expect(
      result.monsters.map(({ name, description, inheritsId }) => ({
        name,
        description,
        inheritsId,
      })),
    ).toEqual([
      { name: "Alpha", description: "Alpha only", inheritsId: undefined },
      { name: "Beta", description: "Beta only", inheritsId: undefined },
      { name: "Gamma", description: "Gamma only", inheritsId: undefined },
    ]);
  });

  it("allows a non-cyclic descendant to inherit a cycle member's local data", () => {
    const alpha = monster("Alpha", "beta");
    const beta = monster("Beta", "alpha");
    const child = monster("Child", "alpha");
    alpha.description = "Alpha local";

    const result = applyMonsterInheritance([child, beta, alpha]);
    const resolvedChild = result.monsters.find(
      (entry) => entry.name === "Child",
    );

    expect(resolvedChild?.description).toBe("Alpha local");
    expect(resolvedChild?.inheritsId).toBe(alpha.id);
  });
});
