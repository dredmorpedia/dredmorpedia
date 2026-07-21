import { describe, expect, it } from "vitest";

import {
  applyEntityPatch,
  canonicalKey,
  entityId,
  slugify,
  type EntityCollections,
  type EntityPatchDefinition,
  type Item,
} from "../src/index";

function item(): Item {
  const name = "Clockwork Blade";
  const provenance = {
    sourceId: "synthetic-expansion",
    file: "fixtures/synthetic/expansion/itemDB.xml",
    line: 2,
    column: 3,
    originalName: name,
    originalId: "clockwork-blade-plus",
  };
  return {
    id: entityId("item", name),
    kind: "item",
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description: "Expansion variant.",
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
    category: "weapon",
    price: 155,
    quality: 3,
    iconPath: null,
    stats: [],
    triggers: [],
  };
}

function collections(activeItem: Item): EntityCollections {
  return {
    items: [activeItem],
    recipes: [],
    encrustments: [],
    skills: [],
    abilities: [],
    spells: [],
    monsters: [],
    stats: [],
    templates: [],
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
