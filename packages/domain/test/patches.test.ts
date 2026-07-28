import { describe, expect, it } from "vitest";

import {
  applyEntityPatch,
  canonicalKey,
  entityId,
  slugify,
  type Ability,
  type Encrustment,
  type EntityCollections,
  type EntityKind,
  type EntityPatchDefinition,
  type Item,
  type Monster,
  type NormalizedEntity,
  type NormalizedEntityBase,
  type Recipe,
  type Skill,
  type Template,
} from "../src/index";

function baseEntity<K extends EntityKind>(
  kind: K,
  name: string,
): NormalizedEntityBase & { kind: K } {
  const provenance = {
    sourceId: "synthetic-expansion",
    file: `fixtures/synthetic/expansion/${kind}DB.xml`,
    line: 2,
    column: 3,
    originalName: name,
    originalId: `${slugify(name)}-source`,
  };
  return {
    id: entityId(kind, name),
    kind,
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description: `${name} fixture.`,
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

function item(): Item {
  const name = "Clockwork Blade";
  return {
    ...baseEntity("item", name),
    description: "Expansion variant.",
    category: "weapon",
    price: 155,
    quality: 3,
    artifacts: [],
    armourDeclarations: [],
    recoveries: [],
    chargeRanges: [],
    traps: [],
    iconPath: null,
    stats: [],
    modifiers: [],
    triggers: [],
  };
}

function recipe(): Recipe {
  return {
    ...baseEntity("recipe", "Guarded Recipe"),
    tool: "smithing",
    hidden: false,
    skillLevel: 2,
    inputs: [],
    outputs: [],
  };
}

function encrustment(): Encrustment {
  return {
    ...baseEntity("encrustment", "Guarded Encrustment"),
    tool: "smithing",
    hidden: false,
    skillLevel: 2,
    inputs: [],
    slots: ["weapon"],
    instability: 1,
    modifiers: [],
    powers: [],
    appearanceDescriptors: [],
  };
}

function skill(): Skill {
  return {
    ...baseEntity("skill", "Guarded Skill"),
    archetype: "warrior",
    iconPath: null,
    loadouts: [],
    loadoutItemKeys: [],
    sourceFlags: [],
    progressionTags: [],
    abilityIds: [],
  };
}

function ability(): Ability {
  return {
    ...baseEntity("ability", "Guarded Ability"),
    skillKey: "guarded skill",
    iconPath: null,
    level: 0,
    startSkill: false,
    modifiers: [],
    sourceFlags: [],
    recoveryBuffAmounts: [],
    currencyBuffPercents: [],
    triggers: [],
    spellKeys: [],
    spellIds: [],
  };
}

function monster(): Monster {
  return {
    ...baseEntity("monster", "Guarded Monster"),
    taxonomy: "construct",
    level: 2,
    depth: 3,
    special: false,
    iconPath: null,
    paletteName: null,
    paletteTint: null,
    archetypeLevels: { fighter: 1, rogue: 0, wizard: 0 },
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
    presentation: {
      soundEffects: null,
      attack: null,
      hit: null,
      death: null,
      cast: null,
      beam: null,
      morph: null,
      dig: null,
    },
    experienceValue: null,
    modifiers: [],
    spellChance: null,
    triggers: [],
    drops: [],
  };
}

function template(): Template {
  return {
    ...baseEntity("template", "Guarded Template"),
    affectsPlayer: false,
    rows: [".#."],
  };
}

function collections(activeEntity: NormalizedEntity): EntityCollections {
  return {
    items: activeEntity.kind === "item" ? [activeEntity] : [],
    recipes: activeEntity.kind === "recipe" ? [activeEntity] : [],
    encrustments: activeEntity.kind === "encrustment" ? [activeEntity] : [],
    skills: activeEntity.kind === "skill" ? [activeEntity] : [],
    abilities: activeEntity.kind === "ability" ? [activeEntity] : [],
    spells: [],
    monsters: activeEntity.kind === "monster" ? [activeEntity] : [],
    stats: [],
    templates: activeEntity.kind === "template" ? [activeEntity] : [],
  };
}

function patch(
  operations: EntityPatchDefinition["operations"],
): EntityPatchDefinition {
  return {
    schemaVersion: 1,
    id: "synthetic-clockwork-blade-correction",
    file: "fixtures/synthetic/patches/clockwork-blade.json",
    reason: "Synthetic patch behavior fixture.",
    appliesTo: {
      datasetId: "synthetic",
      datasetVersion: "1.0.0",
      sourceId: "synthetic-expansion",
      sourceVersion: "1.0.0",
    },
    operations,
  };
}

describe("entity patches", () => {
  it("applies guarded fields deterministically and records before/after values", () => {
    const operations: EntityPatchDefinition["operations"] = [
      {
        entityKind: "item",
        canonicalKey: "clockwork blade",
        field: "price",
        expectedValue: 155,
        value: 160,
      },
      {
        entityKind: "item",
        canonicalKey: "clockwork blade",
        field: "description",
        expectedValue: "Expansion variant.",
        value: "Reviewed expansion variant.",
      },
      {
        entityKind: "item",
        canonicalKey: "clockwork blade",
        field: "quality",
        expectedValue: 3,
        value: 4,
      },
    ];

    const forward = applyEntityPatch(collections(item()), patch(operations));
    const reverse = applyEntityPatch(
      collections(item()),
      patch([...operations].reverse()),
    );

    expect(forward).toEqual(reverse);
    expect(forward.issues).toEqual([]);
    expect(forward.entities.items[0]).toMatchObject({
      price: 160,
      quality: 4,
      description: "Reviewed expansion variant.",
      appliedPatches: [
        {
          id: "synthetic-clockwork-blade-correction",
          changes: [
            {
              field: "description",
              previousValue: "Expansion variant.",
              value: "Reviewed expansion variant.",
            },
            { field: "price", previousValue: 155, value: 160 },
            { field: "quality", previousValue: 3, value: 4 },
          ],
        },
      ],
    });
  });

  it.each([2.5, -1])("rejects an invalid quality patch value (%s)", (value) => {
    const original = collections(item());
    const result = applyEntityPatch(
      original,
      patch([
        {
          entityKind: "item",
          canonicalKey: "clockwork blade",
          field: "quality",
          expectedValue: 3,
          value,
        },
      ]),
    );

    expect(result.entities).toBe(original);
    expect(result.applications).toEqual([]);
    expect(result.issues).toMatchObject([
      { code: "patch_value_invalid", entityId: "item:clockwork blade" },
    ]);
  });

  it.each([
    {
      label: "negative item price",
      entity: item(),
      field: "price",
      expectedValue: 155,
      value: -1,
    },
    {
      label: "fractional item price",
      entity: item(),
      field: "price",
      expectedValue: 155,
      value: 1.5,
    },
    {
      label: "negative recipe skill level",
      entity: recipe(),
      field: "skillLevel",
      expectedValue: 2,
      value: -1,
    },
    {
      label: "fractional encrustment instability",
      entity: encrustment(),
      field: "instability",
      expectedValue: 1,
      value: 1.5,
    },
    {
      label: "negative monster level",
      entity: monster(),
      field: "level",
      expectedValue: 2,
      value: -1,
    },
    {
      label: "invalid template grid",
      entity: template(),
      field: "rows",
      expectedValue: [".#."],
      value: ["...", "..."],
    },
  ])(
    "rejects a patch value outside the normalized contract: $label",
    ({ entity, field, expectedValue, value }) => {
      const original = collections(entity);
      const result = applyEntityPatch(
        original,
        patch([
          {
            entityKind: entity.kind,
            canonicalKey: entity.canonicalKey,
            field,
            expectedValue,
            value,
          },
        ]),
      );

      expect(result.entities).toBe(original);
      expect(result.applications).toEqual([]);
      expect(result.issues).toMatchObject([
        { code: "patch_value_invalid", entityId: entity.id },
      ]);
    },
  );

  it.each([
    {
      label: "skill loadout keys",
      entity: skill(),
      field: "loadoutItemKeys",
      value: ["replacement item"],
    },
    {
      label: "ability spell keys",
      entity: ability(),
      field: "spellKeys",
      value: ["replacement spell"],
    },
  ])(
    "rejects a patch to derived compatibility data: $label",
    ({ entity, field, value }) => {
      const original = collections(entity);
      const result = applyEntityPatch(
        original,
        patch([
          {
            entityKind: entity.kind,
            canonicalKey: entity.canonicalKey,
            field,
            expectedValue: [],
            value,
          },
        ]),
      );

      expect(result.entities).toBe(original);
      expect(result.applications).toEqual([]);
      expect(result.issues).toMatchObject([
        { code: "patch_field_unsupported", entityId: entity.id },
      ]);
    },
  );

  it("rejects a stale precondition atomically", () => {
    const original = collections(item());
    const result = applyEntityPatch(
      original,
      patch([
        {
          entityKind: "item",
          canonicalKey: "clockwork blade",
          field: "price",
          expectedValue: 999,
          value: 160,
        },
        {
          entityKind: "item",
          canonicalKey: "clockwork blade",
          field: "description",
          expectedValue: "Expansion variant.",
          value: "This must not be partially applied.",
        },
      ]),
    );

    expect(result.entities).toBe(original);
    expect(result.applications).toEqual([]);
    expect(result.issues).toMatchObject([
      { code: "patch_precondition_failed", entityId: "item:clockwork blade" },
    ]);
  });
});
