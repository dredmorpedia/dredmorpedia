import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  entityId,
  slugify,
  spellEffectBacklinks,
  spellEffectChain,
  type Spell,
} from "../src/index";

function spell(name: string, effects: Spell["effects"] = []): Spell {
  const provenance = {
    sourceId: "synthetic-spells",
    file: "synthetic/spellDB.xml",
    line: 2,
    column: 3,
    originalName: name,
  };
  return {
    id: entityId("spell", name),
    kind: "spell",
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description: "",
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
    spellType: "target",
    iconPath: null,
    manaCosts: [],
    effects,
  };
}

function reference(target: Spell): Spell["effects"][number] {
  return {
    type: "trigger",
    spellKey: target.canonicalKey,
    spellName: target.name,
    spellId: target.id,
  };
}

describe("spell effect relationships", () => {
  it("stops at cycles and keeps dangling references visible", () => {
    const missing = {
      type: "trigger",
      spellKey: "missing echo",
      spellName: "Missing Echo",
    };
    const spellA = spell("Spell A");
    const spellB = spell("Spell B");
    const spellC = spell("Spell C");
    spellA.effects = [reference(spellB), missing];
    spellB.effects = [reference(spellA), reference(spellC)];

    expect(
      spellEffectChain([spellA, spellB, spellC], spellA.id).map((step) => ({
        source: step.sourceSpell.name,
        target: step.targetSpell?.name ?? step.effect.spellName,
        depth: step.depth,
        cycle: step.cycle,
        alreadyExpanded: step.alreadyExpanded,
      })),
    ).toEqual([
      {
        source: "Spell A",
        target: "Spell B",
        depth: 1,
        cycle: false,
        alreadyExpanded: false,
      },
      {
        source: "Spell B",
        target: "Spell A",
        depth: 2,
        cycle: true,
        alreadyExpanded: false,
      },
      {
        source: "Spell B",
        target: "Spell C",
        depth: 2,
        cycle: false,
        alreadyExpanded: false,
      },
      {
        source: "Spell A",
        target: "Missing Echo",
        depth: 1,
        cycle: false,
        alreadyExpanded: false,
      },
    ]);
  });

  it("expands a shared target only once", () => {
    const spellA = spell("Spell A");
    const spellB = spell("Spell B");
    const spellC = spell("Spell C");
    const spellD = spell("Spell D");
    spellA.effects = [reference(spellB), reference(spellC)];
    spellB.effects = [reference(spellD)];
    spellC.effects = [reference(spellD)];

    const steps = spellEffectChain([spellA, spellB, spellC, spellD], spellA.id);

    expect(steps.map((step) => step.targetSpell?.name)).toEqual([
      "Spell B",
      "Spell D",
      "Spell C",
      "Spell D",
    ]);
    expect(steps.at(-1)?.alreadyExpanded).toBe(true);
  });

  it("returns direct backlinks in deterministic spell order", () => {
    const target = spell("Target");
    const later = spell("Later", [reference(target)]);
    const earlier = spell("Earlier", [
      reference(target),
      { type: "damage", amount: 2 },
      reference(target),
    ]);

    expect(
      spellEffectBacklinks([target, later, earlier], target.id).map(
        (backlink) => [backlink.spell.name, backlink.effectIndex],
      ),
    ).toEqual([
      ["Earlier", 0],
      ["Earlier", 2],
      ["Later", 0],
    ]);
  });
});
