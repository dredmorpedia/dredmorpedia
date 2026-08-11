import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  entityId,
  slugify,
  spellBuffEventHookBacklinks,
  spellBuffPolymorphBacklinks,
  spellEffectBacklinks,
  spellEffectChain,
  spellEffectConditionBacklinks,
  spellEffectItemTargetBacklinks,
  spellEffectMonsterTargetBacklinks,
  spellEffectOptionItemBacklinks,
  spellEffectOptionSpellBacklinks,
  spellEffectRemovedBuffBacklinks,
  type Spell,
  type SpellBuffEventHookKind,
} from "../src/index";

const noEffectControls: Spell["effects"][number]["controls"] = {
  durationTurns: null,
  after: null,
  chancePercent: null,
  affectsCaster: null,
  affectsSelf: null,
  affectsCorpses: null,
  resistable: null,
  burnsTarget: null,
  bleedsTarget: null,
  midas: null,
  skipAnimation: null,
  taxonomy: null,
};

const noEffectConditions: Spell["effects"][number]["conditions"] = {
  requiresSourceBuff: null,
  requiredBuff: {
    enabled: null,
    spellKey: null,
    spellName: null,
  },
  forbiddenBuff: {
    enabled: null,
    spellKey: null,
    spellName: null,
  },
};

const noEffectScaling: Spell["effects"][number]["scaling"] = {
  amountFactor: null,
  floorFactor: null,
  primaryStatId: null,
  secondaryStatId: null,
};

const noEffectItemTarget: Spell["effects"][number]["itemTarget"] = {
  itemKey: null,
  itemName: null,
};

const noEffectMonsterTarget: Spell["effects"][number]["monsterTarget"] = {
  monsterKey: null,
  monsterName: null,
};

const noEffectRemovedBuff: Spell["effects"][number]["removedBuff"] = {
  spellKey: null,
  spellName: null,
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
    sourceCooldownTurns: null,
    targetingTemplate: {
      sourceTemplateId: null,
      templateKey: null,
      sourceAnchored: null,
    },
    manaCosts: [],
    boozeRequirements: [],
    zorkmidRequirements: [],
    shieldRequirements: [],
    weaponRequirements: [],
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
    itemTarget: noEffectItemTarget,
    monsterTarget: noEffectMonsterTarget,
    removedBuff: noEffectRemovedBuff,
    damage: [],
    scaling: noEffectScaling,
    presentation: null,
    createdObjectSpritePath: null,
    regenerateGraphics: null,
    buffTag: null,
    controls: noEffectControls,
    conditions: noEffectConditions,
    options: [],
  };
}

function buffEventHookReference(
  target: Spell,
  kind: SpellBuffEventHookKind,
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
  polymorphDeclarations: Spell["buffs"][number]["polymorphDeclarations"] = [],
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
    invisibilityDeclarations: [],
    muteDeclarations: [],
    senseWallsDeclarations: [],
    paybackDeclarations: [],
    zorkmidAbsorptionDeclarations: [],
    polymorphDeclarations,
    effects: [],
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
      itemTarget: noEffectItemTarget,
      monsterTarget: noEffectMonsterTarget,
      removedBuff: noEffectRemovedBuff,
      damage: [],
      scaling: noEffectScaling,
      presentation: null,
      createdObjectSpritePath: null,
      regenerateGraphics: null,
      buffTag: null,
      controls: noEffectControls,
      conditions: noEffectConditions,
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
        itemTarget: noEffectItemTarget,
        monsterTarget: noEffectMonsterTarget,
        removedBuff: noEffectRemovedBuff,
        damage: [],
        scaling: noEffectScaling,
        presentation: null,
        createdObjectSpritePath: null,
        regenerateGraphics: null,
        buffTag: null,
        controls: noEffectControls,
        conditions: noEffectConditions,
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

  it("includes buff-local effects in chains and backlinks", () => {
    const target = spell("Target");
    const owner = spell("Owner");
    owner.buffs = [buff([])];
    owner.buffs[0]!.effects = [reference(target)];

    expect(
      spellEffectChain([target, owner], owner.id).map((step) => [
        step.sourceSpell.name,
        step.targetSpell?.name,
        step.effectIndex,
      ]),
    ).toEqual([["Owner", "Target", 0]]);
    expect(
      spellEffectBacklinks([target, owner], target.id).map((backlink) => [
        backlink.spell.name,
        backlink.effectIndex,
      ]),
    ).toEqual([["Owner", 0]]);
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
      buff([buffEventHookReference(target, "dodge")]),
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
      ["Earlier", 1, 0, "dodge"],
      ["Later", 0, 0, "player-hit"],
    ]);
  });

  it("returns typed list-option backlinks in deterministic source order", () => {
    const target = spell("Target");
    const later = spell("Later", [
      {
        type: "triggerfromlist",
        itemTarget: noEffectItemTarget,
        monsterTarget: noEffectMonsterTarget,
        removedBuff: noEffectRemovedBuff,
        damage: [],
        scaling: noEffectScaling,
        presentation: null,
        createdObjectSpritePath: null,
        regenerateGraphics: null,
        buffTag: null,
        controls: noEffectControls,
        conditions: noEffectConditions,
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
        itemTarget: noEffectItemTarget,
        monsterTarget: noEffectMonsterTarget,
        removedBuff: noEffectRemovedBuff,
        damage: [],
        scaling: noEffectScaling,
        presentation: null,
        createdObjectSpritePath: null,
        regenerateGraphics: null,
        buffTag: null,
        controls: noEffectControls,
        conditions: noEffectConditions,
        options: [
          {
            kind: "item",
            itemKey: "brass ingot",
            itemName: "Brass Ingot",
            itemId: "item:brass ingot",
            itemResolution: {
              status: "resolved",
              resolutionMethod: "exact",
              targetKind: "item",
              sourceLabel: "Brass Ingot",
              targetId: "item:brass ingot",
            },
            amount: null,
          },
          {
            kind: "item",
            itemKey: "brass ingot typo",
            itemName: "Brass Ingot Typo",
            itemId: "item:brass ingot",
            itemResolution: {
              status: "resolved",
              resolutionMethod: "reviewed-correction",
              targetKind: "item",
              sourceLabel: "Brass Ingot Typo",
              targetId: "item:brass ingot",
              reviewId: "relationship-review:test:brass-ingot-typo",
            },
            amount: 2,
          },
        ],
      },
      {
        type: "triggerfromlist",
        itemTarget: noEffectItemTarget,
        monsterTarget: noEffectMonsterTarget,
        removedBuff: noEffectRemovedBuff,
        damage: [],
        scaling: noEffectScaling,
        presentation: null,
        createdObjectSpritePath: null,
        regenerateGraphics: null,
        buffTag: null,
        controls: noEffectControls,
        conditions: noEffectConditions,
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

  it("returns direct item-target backlinks in deterministic source order", () => {
    const targetId = "item:brass ingot";
    const directTarget = (
      type: "spawn" | "spawnitematlocation",
    ): Spell["effects"][number] => ({
      type,
      itemTarget: {
        itemKey: "brass ingot",
        itemName: "Brass Ingot",
        itemId: targetId,
      },
      monsterTarget: noEffectMonsterTarget,
      removedBuff: noEffectRemovedBuff,
      damage: [],
      scaling: noEffectScaling,
      presentation: null,
      createdObjectSpritePath: null,
      regenerateGraphics: null,
      buffTag: null,
      controls: noEffectControls,
      conditions: noEffectConditions,
      options: [],
    });
    const later = spell("Later", [directTarget("spawn")]);
    const earlier = spell("Earlier", [
      directTarget("spawnitematlocation"),
      {
        ...directTarget("spawn"),
        itemTarget: {
          itemKey: "source-token",
          itemName: "source-token",
        },
        monsterTarget: noEffectMonsterTarget,
      },
      directTarget("spawn"),
    ]);

    expect(
      spellEffectItemTargetBacklinks([later, earlier], targetId).map(
        ({ spell: source, effectIndex, effect }) => [
          source.name,
          effectIndex,
          effect.type,
        ],
      ),
    ).toEqual([
      ["Earlier", 0, "spawnitematlocation"],
      ["Earlier", 2, "spawn"],
      ["Later", 0, "spawn"],
    ]);
  });

  it("returns summon monster-target backlinks in deterministic source order", () => {
    const targetId = "monster:training diggle";
    const summonTarget = (): Spell["effects"][number] => ({
      type: "summon",
      amount: 1,
      itemTarget: noEffectItemTarget,
      monsterTarget: {
        monsterKey: "training diggle",
        monsterName: "Training Diggle",
        monsterId: targetId,
      },
      removedBuff: noEffectRemovedBuff,
      damage: [],
      scaling: noEffectScaling,
      presentation: null,
      createdObjectSpritePath: null,
      regenerateGraphics: null,
      buffTag: null,
      controls: noEffectControls,
      conditions: noEffectConditions,
      options: [],
    });
    const later = spell("Later", [summonTarget()]);
    const earlier = spell("Earlier", [
      summonTarget(),
      {
        ...summonTarget(),
        monsterTarget: {
          monsterKey: "missing diggle",
          monsterName: "Missing Diggle",
        },
      },
      summonTarget(),
    ]);

    expect(
      spellEffectMonsterTargetBacklinks([later, earlier], targetId).map(
        ({ spell: source, effectIndex, effect }) => [
          source.name,
          effectIndex,
          effect.amount,
        ],
      ),
    ).toEqual([
      ["Earlier", 0, 1],
      ["Earlier", 2, 1],
      ["Later", 0, 1],
    ]);
  });

  it("returns polymorph backlinks in deterministic source order", () => {
    const targetId = "monster:training diggle";
    const declaration = (
      linked = true,
    ): Spell["buffs"][number]["polymorphDeclarations"][number] => ({
      monsterKey: "training diggle",
      monsterName: "Training Diggle",
      ...(linked ? { monsterId: targetId } : {}),
    });
    const later = spell("Later");
    later.buffs = [buff([], [declaration()])];
    const earlier = spell("Earlier");
    earlier.buffs = [
      buff([], [declaration(), declaration(false), declaration()]),
    ];

    expect(
      spellBuffPolymorphBacklinks([later, earlier], targetId).map(
        ({ spell: source, buffIndex, declarationIndex, declaration }) => [
          source.name,
          buffIndex,
          declarationIndex,
          declaration.monsterName,
        ],
      ),
    ).toEqual([
      ["Earlier", 0, 0, "Training Diggle"],
      ["Earlier", 0, 2, "Training Diggle"],
      ["Later", 0, 0, "Training Diggle"],
    ]);
  });

  it("returns named buff-removal backlinks in deterministic source order", () => {
    const target = spell("Target Buff");
    const removal = (): Spell["effects"][number] => ({
      type: "removebuffbyname",
      itemTarget: noEffectItemTarget,
      monsterTarget: noEffectMonsterTarget,
      removedBuff: {
        spellKey: target.canonicalKey,
        spellName: target.name,
        spellId: target.id,
      },
      damage: [],
      scaling: noEffectScaling,
      presentation: null,
      createdObjectSpritePath: null,
      regenerateGraphics: null,
      buffTag: null,
      controls: noEffectControls,
      conditions: noEffectConditions,
      options: [],
    });
    const later = spell("Later", [removal()]);
    const earlier = spell("Earlier", [
      removal(),
      {
        ...removal(),
        removedBuff: {
          spellKey: "missing buff",
          spellName: "Missing Buff",
        },
      },
      removal(),
    ]);

    expect(
      spellEffectRemovedBuffBacklinks([later, target, earlier], target.id).map(
        ({ spell: source, effectIndex, effect }) => [
          source.name,
          effectIndex,
          effect.removedBuff.spellName,
        ],
      ),
    ).toEqual([
      ["Earlier", 0, "Target Buff"],
      ["Earlier", 2, "Target Buff"],
      ["Later", 0, "Target Buff"],
    ]);
  });

  it("returns named buff-condition backlinks in deterministic source order", () => {
    const target = spell("Target");
    const later = spell("Later", [
      {
        type: "trigger",
        itemTarget: noEffectItemTarget,
        monsterTarget: noEffectMonsterTarget,
        removedBuff: noEffectRemovedBuff,
        damage: [],
        scaling: noEffectScaling,
        presentation: null,
        createdObjectSpritePath: null,
        regenerateGraphics: null,
        buffTag: null,
        controls: noEffectControls,
        conditions: {
          ...noEffectConditions,
          requiredBuff: {
            enabled: true,
            spellKey: target.canonicalKey,
            spellName: target.name,
            spellId: target.id,
          },
        },
        options: [],
      },
    ]);
    const earlier = spell("Earlier", [
      {
        type: "trigger",
        itemTarget: noEffectItemTarget,
        monsterTarget: noEffectMonsterTarget,
        removedBuff: noEffectRemovedBuff,
        damage: [],
        scaling: noEffectScaling,
        presentation: null,
        createdObjectSpritePath: null,
        regenerateGraphics: null,
        buffTag: null,
        controls: noEffectControls,
        conditions: {
          ...noEffectConditions,
          requiredBuff: {
            enabled: true,
            spellKey: target.canonicalKey,
            spellName: target.name,
            spellId: target.id,
          },
          forbiddenBuff: {
            enabled: false,
            spellKey: target.canonicalKey,
            spellName: target.name,
            spellId: target.id,
          },
        },
        options: [],
      },
    ]);

    expect(
      spellEffectConditionBacklinks([target, later, earlier], target.id).map(
        ({ spell: source, effectIndex, kind, condition }) => [
          source.name,
          effectIndex,
          kind,
          condition.enabled,
        ],
      ),
    ).toEqual([
      ["Earlier", 0, "forbidden-buff", false],
      ["Earlier", 0, "required-buff", true],
      ["Later", 0, "required-buff", true],
    ]);
  });
});
