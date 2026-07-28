import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  entityId,
  slugify,
  spellBuffEventHookBacklinks,
  spellEffectBacklinks,
  spellEffectChain,
  spellEffectOptionItemBacklinks,
  spellEffectOptionSpellBacklinks,
  type Spell,
} from "../src/index";

const noEffectControls: Spell["effects"][number]["controls"] = {
  chancePercent: null,
  affectsCaster: null,
  affectsSelf: null,
  affectsCorpses: null,
  resistable: null,
  burnsTarget: null,
  taxonomy: null,
};

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
    animations: [],
    impacts: [],
    aiHints: [],
    buffs: [],
    effects,
  };
}

function reference(target: Spell): Spell["effects"][number] {
  return {
    type: "trigger",
    spellKey: target.canonicalKey,
    spellName: target.name,
    spellId: target.id,
    controls: noEffectControls,
    options: [],
  };
}

function buffEventHookReference(
  target: Spell,
  kind: "target-hit" | "player-hit",
): Spell["buffs"][number]["eventHooks"][number] {
  return {
    kind,
    spellKey: target.canonicalKey,
    spellName: target.name,
    spellId: target.id,
    chance: 50,
    sourceFlags: [],
  };
}

function buff(
  eventHooks: Spell["buffs"][number]["eventHooks"],
): Spell["buffs"][number] {
  return {
    iconPath: null,
    smallIconPath: null,
    timerMode: null,
    duration: null,
    manaUpkeep: null,
    currencyUpkeep: null,
    hitLimit: null,
    attackLimit: null,
    removable: null,
    affectsSelf: null,
    resistable: null,
    detrimental: null,
    stackable: null,
    allowStacking: null,
    stackLimit: null,
    descriptions: [],
    halos: [],
    aiHints: [],
    sourceFlags: [],
    modifiers: [],
    sightModifiers: [],
    eventHooks,
  };
}

describe("spell effect relationships", () => {
  it("stops at cycles and keeps dangling references visible", () => {
    const missing = {
      type: "trigger",
      spellKey: "missing echo",
      spellName: "Missing Echo",
      controls: noEffectControls,
      options: [],
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
      {
        type: "damage",
        amount: 2,
        controls: noEffectControls,
        options: [],
      },
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

  it("returns buff event-hook backlinks with their buff and hook positions", () => {
    const target = spell("Target");
    const later = spell("Later");
    const earlier = spell("Earlier");
    later.buffs = [buff([buffEventHookReference(target, "player-hit")])];
    earlier.buffs = [
      buff([
        buffEventHookReference(target, "target-hit"),
        {
          kind: "player-hit",
          spellKey: "missing",
          spellName: "Missing",
          chance: null,
          sourceFlags: [],
        },
      ]),
      buff([buffEventHookReference(target, "player-hit")]),
    ];

    expect(
      spellBuffEventHookBacklinks([target, later, earlier], target.id).map(
        (backlink) => [
          backlink.spell.name,
          backlink.buffIndex,
          backlink.hookIndex,
          backlink.hook.kind,
        ],
      ),
    ).toEqual([
      ["Earlier", 0, 0, "target-hit"],
      ["Earlier", 1, 0, "player-hit"],
      ["Later", 0, 0, "player-hit"],
    ]);
  });

  it("returns typed list-option backlinks in deterministic source order", () => {
    const target = spell("Target");
    const later = spell("Later", [
      {
        type: "triggerfromlist",
        controls: noEffectControls,
        options: [
          {
            kind: "spell",
            spellKey: target.canonicalKey,
            spellName: target.name,
            spellId: target.id,
          },
        ],
      },
    ]);
    const earlier = spell("Earlier", [
      {
        type: "spawnitemfromlist",
        controls: noEffectControls,
        options: [
          {
            kind: "item",
            itemKey: "brass ingot",
            itemName: "Brass Ingot",
            itemId: "item:brass ingot",
            amount: null,
          },
          {
            kind: "item",
            itemKey: "brass ingot",
            itemName: "Brass Ingot",
            itemId: "item:brass ingot",
            amount: 2,
          },
        ],
      },
      {
        type: "triggerfromlist",
        controls: noEffectControls,
        options: [
          {
            kind: "spell",
            spellKey: target.canonicalKey,
            spellName: target.name,
            spellId: target.id,
          },
        ],
      },
    ]);

    expect(
      spellEffectOptionSpellBacklinks([target, later, earlier], target.id).map(
        ({ spell: source, effectIndex, optionIndex }) => [
          source.name,
          effectIndex,
          optionIndex,
        ],
      ),
    ).toEqual([
      ["Earlier", 1, 0],
      ["Later", 0, 0],
    ]);
    expect(
      spellEffectOptionItemBacklinks(
        [target, later, earlier],
        "item:brass ingot",
      ).map(({ spell: source, effectIndex, optionIndex, option }) => [
        source.name,
        effectIndex,
        optionIndex,
        option.amount,
      ]),
    ).toEqual([
      ["Earlier", 0, 0, null],
      ["Earlier", 0, 1, 2],
    ]);
  });
});
