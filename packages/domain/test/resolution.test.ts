import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  entityId,
  resolveEntityCandidates,
  separateRepeatedNamedDeclarations,
  slugify,
  type EntityCandidate,
  type Encrustment,
  type Item,
  type Recipe,
} from "../src/index";

function candidate(
  sourceId: string,
  precedence: number,
  price: number,
): EntityCandidate<Item> {
  const name = "Clockwork Blade";
  const provenance = {
    sourceId,
    file: `${sourceId}/itemDB.xml`,
    line: 2,
    column: 3,
    originalName: name,
  };

  return {
    precedence,
    entity: {
      id: entityId("item", name),
      kind: "item",
      canonicalKey: canonicalKey(name),
      slug: slugify(name),
      slugAliases: [],
      name,
      description: `${sourceId} variant`,
      category: "weapon",
      price,
      quality: 2,
      artifacts: [],
      armourDeclarations: [],
      weaponDeclarations: [],
      macguffinDeclarations: [],
      toolkitDeclarations: [],
      recoveries: [],
      chargeRanges: [],
      traps: [],
      iconPath: null,
      stats: [],
      modifiers: [],
      triggers: [],
      provenance,
      variants: [provenance],
      appliedOverrides: [],
      appliedPatches: [],
      diagnosticIds: [],
    },
  };
}

function recipeCandidate({
  input,
  line,
  precedence = 0,
}: {
  input: string;
  line: number;
  precedence?: number;
}): EntityCandidate<Recipe> {
  const name = "Training Tonic Recipe";
  const provenance = {
    sourceId: "synthetic-base",
    file: "synthetic-base/craftDB.xml",
    line,
    column: 1,
    originalName: name,
  };
  return {
    precedence,
    entity: {
      id: entityId("recipe", name),
      kind: "recipe",
      canonicalKey: canonicalKey(name),
      slug: slugify(name),
      slugAliases: [],
      name,
      description: "",
      tool: "still",
      hidden: false,
      skillLevel: 1,
      inputs: [
        {
          itemKey: canonicalKey(input),
          itemName: input,
          amount: 1,
        },
      ],
      outputs: [
        {
          itemKey: "training tonic",
          itemName: "Training Tonic",
          amount: 1,
          skillLevel: 1,
        },
      ],
      provenance,
      variants: [provenance],
      appliedOverrides: [],
      appliedPatches: [],
      diagnosticIds: [],
    },
  };
}

function encrustmentCandidate({
  line,
  slot,
}: {
  line: number;
  slot: string;
}): EntityCandidate<Encrustment> {
  const name = "Training Thrusters";
  const provenance = {
    sourceId: "synthetic-base",
    file: "synthetic-base/encrustDB.xml",
    line,
    column: 1,
    originalName: name,
  };
  return {
    precedence: 0,
    entity: {
      id: entityId("encrustment", name),
      kind: "encrustment",
      canonicalKey: canonicalKey(name),
      slug: slugify(name),
      slugAliases: [],
      name,
      description: `${slot} coating`,
      tool: "tinkerer",
      hidden: false,
      skillLevel: 2,
      inputs: [],
      slots: [slot],
      instability: 3,
      modifiers: [],
      powers: [],
      appearanceDescriptors: [],
      provenance,
      variants: [provenance],
      appliedOverrides: [],
      appliedPatches: [],
      diagnosticIds: [],
    },
  };
}

describe("source precedence", () => {
  it("is deterministic regardless of candidate input order", () => {
    const lower = candidate("synthetic-base", 0, 120);
    const higher = candidate("synthetic-expansion", 10, 155);

    const forward = resolveEntityCandidates([lower, higher]);
    const reverse = resolveEntityCandidates([higher, lower]);

    expect(forward).toEqual(reverse);
    expect(forward.active[0]?.price).toBe(155);
    expect(
      forward.active[0]?.variants.map((variant) => variant.sourceId),
    ).toEqual(["synthetic-base", "synthetic-expansion"]);
    expect(forward.collisions[0]?.changedFields).toContain("price");
  });

  it("breaks equal-precedence ties with stable source provenance", () => {
    const alpha = candidate("synthetic-alpha", 10, 120);
    const beta = candidate("synthetic-beta", 10, 155);

    const forward = resolveEntityCandidates([alpha, beta]);
    const reverse = resolveEntityCandidates([beta, alpha]);

    expect(forward).toEqual(reverse);
    expect(forward.active[0]?.price).toBe(155);
    expect(
      forward.active[0]?.variants.map((variant) => variant.sourceId),
    ).toEqual(["synthetic-alpha", "synthetic-beta"]);
    expect(forward.collisions).toMatchObject([
      {
        previous: { sourceId: "synthetic-alpha" },
        replacement: { sourceId: "synthetic-beta" },
      },
    ]);
  });

  it("uses source columns when candidates otherwise share provenance", () => {
    const earlier = candidate("synthetic-base", 10, 120);
    earlier.entity.provenance.column = 3;
    earlier.entity.variants = [earlier.entity.provenance];
    const later = candidate("synthetic-base", 10, 155);
    later.entity.provenance.column = 8;
    later.entity.variants = [later.entity.provenance];

    const forward = resolveEntityCandidates([earlier, later]);
    const reverse = resolveEntityCandidates([later, earlier]);

    expect(forward).toEqual(reverse);
    expect(forward.active[0]?.price).toBe(155);
    expect(
      forward.active[0]?.variants.map((variant) => variant.column),
    ).toEqual([3, 8]);
  });
});

describe("repeated crafting declarations", () => {
  it("keeps differing same-name recipes and preserves the former winner identity", () => {
    const earlier = recipeCandidate({ input: "Applejack", line: 10 });
    const later = recipeCandidate({ input: "Night Cap", line: 20 });

    const forward = separateRepeatedNamedDeclarations([earlier, later]);
    const reverse = separateRepeatedNamedDeclarations([later, earlier]);

    expect(forward).toEqual(reverse);
    const resolved = resolveEntityCandidates(forward.candidates);
    expect(resolved.active).toHaveLength(2);
    expect(resolved.collisions).toEqual([]);
    expect(
      resolved.active.find(
        (recipe) => recipe.id === "recipe:training tonic recipe",
      )?.inputs[0]?.itemName,
    ).toBe("Night Cap");
    expect(
      resolved.active.find(
        (recipe) => recipe.inputs[0]?.itemName === "Applejack",
      )?.id,
    ).toMatch(/^recipe:training tonic recipe~[a-z0-9-]+$/);
    expect(forward.independentDeclarations).toHaveLength(1);
  });

  it("continues to resolve fact-identical declarations by source precedence", () => {
    const lower = recipeCandidate({ input: "Applejack", line: 10 });
    const higher = recipeCandidate({
      input: "Applejack",
      line: 20,
      precedence: 10,
    });

    const separated = separateRepeatedNamedDeclarations([lower, higher]);
    const resolved = resolveEntityCandidates(separated.candidates);

    expect(separated.independentDeclarations).toEqual([]);
    expect(resolved.active).toHaveLength(1);
    expect(resolved.active[0]?.provenance.line).toBe(20);
    expect(resolved.active[0]?.variants).toHaveLength(2);
  });

  it("keeps same-name encrustments with different applicability", () => {
    const hands = encrustmentCandidate({ line: 10, slot: "hands" });
    const feet = encrustmentCandidate({ line: 20, slot: "feet" });

    const separated = separateRepeatedNamedDeclarations([hands, feet]);
    const resolved = resolveEntityCandidates(separated.candidates);

    expect(resolved.active).toHaveLength(2);
    expect(resolved.active.map((entry) => entry.slots).sort()).toEqual([
      ["feet"],
      ["hands"],
    ]);
    expect(
      resolved.active.find(
        (entry) => entry.id === "encrustment:training thrusters",
      )?.slots,
    ).toEqual(["feet"]);
  });
});
