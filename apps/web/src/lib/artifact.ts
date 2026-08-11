import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createSearchDocuments,
  damageSourceKeys,
  entityKinds,
  isValidTemplateRows,
  itemRecoveryResources,
  itemTrapActivationModes,
  itemTriggerKinds,
  monsterSpellTriggerKinds,
  spellBuffEventHookKinds,
  statModifierKinds,
  type ArtifactManifest,
  type DatasetArtifact,
  type Diagnostic,
  type NormalizedEntity,
  type SearchArtifact,
} from "@dredmorpedia/domain";
import { z } from "zod";

const nonnegativeInteger = z.number().int().nonnegative();
const positiveInteger = z.number().int().positive();
const percentageInteger = nonnegativeInteger.max(100);
const nullableNumber = z.number().nullable();
const nullableNonnegativeNumber = z.number().nonnegative().nullable();
const nullableNonnegativeInteger = nonnegativeInteger.nullable();
const nullablePercentageInteger = percentageInteger.nullable();
const nullableSignedByte = z.number().int().min(-128).max(127).nullable();
const optionalString = z.string().optional();
const nonblankString = z
  .string()
  .refine((value) => value.trim().length > 0, "must be non-blank");
const entitySlugSchema = z
  .string()
  .regex(
    /^[a-z0-9-]+$/,
    "must contain only lowercase ASCII letters, digits, and hyphens",
  );
const entityUrlSchema = z
  .string()
  .regex(
    /^\/[a-z]+\/[a-z0-9-]+$/,
    "must be an absolute entity path with a lowercase route and slug",
  );
const safeRelativeAssetPathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.includes("\\") &&
      !path.posix.isAbsolute(value) &&
      !path.win32.isAbsolute(value) &&
      !/^[A-Za-z]:/.test(value) &&
      !value.split("/").some((segment) => segment === ".."),
    "must be a slash-normalized, non-traversing relative asset path",
  );
const nullableAssetPathSchema = safeRelativeAssetPathSchema.nullable();

const patchValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
]);

const sourceLocationSchema = z
  .object({
    sourceId: z.string(),
    file: z.string(),
    line: nonnegativeInteger,
    column: nonnegativeInteger,
  })
  .strict();

const provenanceSchema = sourceLocationSchema.extend({
  originalName: z.string(),
  originalId: optionalString,
});

const appliedOverrideSchema = z
  .object({
    previous: provenanceSchema,
    replacement: provenanceSchema,
    changedFields: z.array(z.string()),
  })
  .strict();

const appliedPatchSchema = z
  .object({
    id: z.string(),
    file: z.string(),
    reason: z.string(),
    sourceId: z.string(),
    sourceVersion: z.string(),
    changes: z.array(
      z
        .object({
          field: z.string(),
          previousValue: patchValueSchema,
          value: patchValueSchema,
        })
        .strict(),
    ),
  })
  .strict();

const entityBaseShape = {
  id: z.string(),
  canonicalKey: z.string(),
  slug: entitySlugSchema,
  slugAliases: z.array(entitySlugSchema),
  name: z.string(),
  description: z.string(),
  provenance: provenanceSchema,
  variants: z.array(provenanceSchema),
  appliedOverrides: z.array(appliedOverrideSchema),
  appliedPatches: z.array(appliedPatchSchema),
  diagnosticIds: z.array(z.string()),
};

const sourceFlagSchema = z
  .object({ sourceKey: z.string(), value: z.string() })
  .strict();

const itemRelationshipResolutionSchema = z.union([
  z
    .object({
      status: z.literal("resolved"),
      resolutionMethod: z.literal("exact"),
      targetKind: z.literal("item"),
      sourceLabel: nonblankString,
      targetId: nonblankString,
    })
    .strict(),
  z
    .object({
      status: z.literal("resolved"),
      resolutionMethod: z.literal("reviewed-correction"),
      targetKind: z.literal("item"),
      sourceLabel: nonblankString,
      targetId: nonblankString,
      reviewId: nonblankString,
    })
    .strict(),
  z
    .object({
      status: z.literal("source-only"),
      targetKind: z.literal("item"),
      sourceLabel: nonblankString,
      reviewId: nonblankString,
    })
    .strict(),
  z
    .object({
      status: z.literal("unresolved"),
      targetKind: z.literal("item"),
      sourceLabel: nonblankString,
    })
    .strict(),
]);

const skillLoadoutSchema = z
  .object({
    itemKey: optionalString,
    itemName: optionalString,
    itemId: optionalString,
    itemResolution: itemRelationshipResolutionSchema.optional(),
    itemType: optionalString,
    amount: positiveInteger,
    always: z.boolean(),
  })
  .strict()
  .superRefine((loadout, context) => {
    const hasItemKey = loadout.itemKey !== undefined;
    const hasItemName = loadout.itemName !== undefined;
    if (hasItemKey !== hasItemName) {
      context.addIssue({
        code: "custom",
        message: "Named loadout item key and name must both be present.",
      });
      return;
    }

    if (!hasItemName) {
      if (
        loadout.itemId !== undefined ||
        loadout.itemResolution !== undefined
      ) {
        context.addIssue({
          code: "custom",
          message: "Type-only loadouts must not carry item resolution data.",
        });
      }
      return;
    }

    if (!loadout.itemResolution) {
      context.addIssue({
        code: "custom",
        message: "Named loadouts must carry item resolution data.",
      });
      return;
    }
    if (loadout.itemResolution.sourceLabel !== loadout.itemName) {
      context.addIssue({
        code: "custom",
        message: "Loadout resolution must retain the original item name.",
      });
    }

    if (loadout.itemResolution.status === "resolved") {
      if (loadout.itemId !== loadout.itemResolution.targetId) {
        context.addIssue({
          code: "custom",
          message: "Resolved loadout target must match its item ID.",
        });
      }
    } else if (loadout.itemId !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Unlinked loadouts must not carry an item ID.",
      });
    }
  });

const statModifierSchema = z
  .object({
    kind: z.enum(statModifierKinds),
    sourceKey: z.string(),
    amount: z.number(),
    statId: optionalString,
  })
  .strict();

const spellTriggerSchema = z
  .object({
    kind: z.enum(itemTriggerKinds),
    spellKey: z.string(),
    spellName: z.string(),
    spellId: optionalString,
    chance: nullablePercentageInteger,
    delay: nonnegativeInteger,
    duration: nonnegativeInteger,
    unresistable: z.boolean(),
    monsterTaxonomy: z.string().nullable(),
    sourceFlags: z.array(sourceFlagSchema),
  })
  .strict();

const itemChargeRangeSchema = z
  .object({
    minimum: nullableNonnegativeInteger,
    maximum: nullableNonnegativeInteger,
  })
  .strict()
  .refine(
    ({ minimum, maximum }) =>
      minimum === null || maximum === null || minimum <= maximum,
    { message: "minimum must not exceed maximum" },
  );

const itemToolkitBoundsSchema = z
  .object({
    x1: nullableNonnegativeInteger,
    y1: nullableNonnegativeInteger,
    x2: nullableNonnegativeInteger,
    y2: nullableNonnegativeInteger,
  })
  .strict();

const itemToolkitControlSchema = z
  .object({
    path: nullableAssetPathSchema,
    positionX: nullableNonnegativeInteger,
    positionY: nullableNonnegativeInteger,
  })
  .strict();

const itemReferenceSchema = z
  .object({
    itemKey: z.string(),
    itemName: z.string(),
    itemId: optionalString,
    amount: positiveInteger,
  })
  .strict();

const itemSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("item"),
    category: z.string(),
    price: nonnegativeInteger.nullable(),
    quality: nonnegativeInteger,
    artifacts: z.array(
      z
        .object({
          quality: nullableNonnegativeInteger,
        })
        .strict(),
    ),
    armourDeclarations: z.array(
      z
        .object({
          slot: z.string().min(1).nullable(),
          level: nullableNonnegativeInteger,
          randoms: nullableNonnegativeInteger,
        })
        .strict(),
    ),
    weaponDeclarations: z.array(
      z
        .object({
          canTargetFloor: z.boolean().nullable(),
          thrownPath: nullableAssetPathSchema,
        })
        .strict(),
    ),
    macguffinDeclarations: z.array(
      z
        .object({
          spellKey: z.string().min(1).nullable(),
          spellName: z.string().min(1).nullable(),
          spellId: z.string().min(1).optional(),
          itemClassName: z.string().min(1).nullable(),
          consumable: z.boolean().nullable(),
        })
        .strict()
        .refine(
          ({ spellKey, spellName }) =>
            (spellKey === null) === (spellName === null),
          {
            message:
              "spellKey and spellName must both be supplied or both be null",
          },
        )
        .refine(
          ({ spellKey, spellId }) => spellId === undefined || spellKey !== null,
          {
            message: "spellId requires a supplied spell reference",
          },
        ),
    ),
    toolkitDeclarations: z.array(
      z
        .object({
          tag: z.string().min(1).nullable(),
          numSlots: nullableNonnegativeInteger,
          soundCue: z.string().min(1).nullable(),
          missingPath: nullableAssetPathSchema,
          presentPath: nullableAssetPathSchema,
          activePath: nullableAssetPathSchema,
          slotBounds: z.array(
            itemToolkitBoundsSchema.extend({
              slot: positiveInteger,
            }),
          ),
          outputBounds: itemToolkitBoundsSchema,
          craftButton: itemToolkitControlSchema,
          recipeButton: itemToolkitControlSchema,
          autofillButton: itemToolkitControlSchema,
          closePosition: z
            .object({
              x: nullableNonnegativeInteger,
              y: nullableNonnegativeInteger,
            })
            .strict(),
          backgroundPath: nullableAssetPathSchema,
        })
        .strict(),
    ),
    recoveries: z.array(
      z
        .object({
          resource: z.enum(itemRecoveryResources),
          amount: nullableNonnegativeInteger,
          sourceFlags: z.array(sourceFlagSchema),
        })
        .strict(),
    ),
    chargeRanges: z.array(itemChargeRangeSchema),
    traps: z.array(
      z
        .object({
          activation: z.enum(itemTrapActivationModes).nullable(),
          level: nullableNonnegativeInteger,
          targetsCaster: z.boolean().nullable(),
          originPath: nullableAssetPathSchema,
          originMount: z.string().nullable(),
          originFacing: z.string().nullable(),
        })
        .strict(),
    ),
    iconPath: nullableAssetPathSchema,
    stats: z.array(
      z
        .object({
          statKey: z.string(),
          statName: z.string(),
          statId: optionalString,
          amount: z.number().int(),
        })
        .strict(),
    ),
    modifiers: z.array(statModifierSchema),
    triggers: z.array(spellTriggerSchema),
  })
  .strict();

const recipeSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("recipe"),
    tool: z.string(),
    hidden: z.boolean(),
    skillLevel: nonnegativeInteger,
    inputs: z.array(itemReferenceSchema),
    outputs: z.array(itemReferenceSchema),
  })
  .strict();

const encrustmentSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("encrustment"),
    tool: z.string(),
    hidden: z.boolean(),
    skillLevel: nonnegativeInteger,
    inputs: z.array(itemReferenceSchema),
    slots: z.array(z.string()),
    instability: z.number().int(),
    modifiers: z.array(statModifierSchema),
    powers: z.array(
      z
        .object({
          name: z.string(),
          chance: z.number().min(0).max(1).nullable(),
        })
        .strict(),
    ),
    appearanceDescriptors: z.array(z.string()),
  })
  .strict();

const skillSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("skill"),
    archetype: z.string(),
    iconPath: nullableAssetPathSchema,
    loadouts: z.array(skillLoadoutSchema),
    loadoutItemKeys: z.array(z.string()),
    sourceFlags: z.array(sourceFlagSchema),
    progressionTags: z.array(
      z.object({ level: nonnegativeInteger, name: z.string() }).strict(),
    ),
    abilityIds: z.array(z.string()),
  })
  .strict();

const abilitySchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("ability"),
    skillKey: z.string(),
    skillId: optionalString,
    iconPath: nullableAssetPathSchema,
    level: nonnegativeInteger,
    startSkill: z.boolean(),
    modifiers: z.array(statModifierSchema),
    sourceFlags: z.array(sourceFlagSchema),
    recoveryBuffAmounts: z.array(z.number()),
    currencyBuffPercents: z.array(z.number()),
    triggers: z.array(spellTriggerSchema),
    spellKeys: z.array(z.string()),
    spellIds: z.array(z.string()),
  })
  .strict();

const nullableNonblankString = nonblankString.nullable();

const spellEffectItemOptionSchema = z
  .object({
    kind: z.literal("item"),
    itemKey: nullableNonblankString,
    itemName: nullableNonblankString,
    itemId: z.string().min(1).optional(),
    itemResolution: itemRelationshipResolutionSchema.optional(),
    amount: positiveInteger.nullable(),
  })
  .strict()
  .superRefine((option, context) => {
    if ((option.itemKey === null) !== (option.itemName === null)) {
      context.addIssue({
        code: "custom",
        message: "Item option key and name must both be present or absent.",
      });
    }
    if (option.itemKey === null) {
      if (option.itemId !== undefined || option.itemResolution !== undefined) {
        context.addIssue({
          code: "custom",
          message: "An unnamed item option must not carry resolution data.",
        });
      }
      return;
    }

    if (!option.itemResolution) {
      context.addIssue({
        code: "custom",
        message: "A named item option must carry resolution data.",
      });
      return;
    }
    if (option.itemResolution.sourceLabel !== option.itemName) {
      context.addIssue({
        code: "custom",
        message: "Item option resolution must retain the original item name.",
      });
    }
    if (option.itemResolution.status === "resolved") {
      if (option.itemId !== option.itemResolution.targetId) {
        context.addIssue({
          code: "custom",
          message: "Resolved item option target must match its item ID.",
        });
      }
    } else if (option.itemId !== undefined) {
      context.addIssue({
        code: "custom",
        message: "Unlinked item options must not carry an item ID.",
      });
    }
  });

const spellEffectSpellOptionSchema = z
  .object({
    kind: z.literal("spell"),
    spellKey: nullableNonblankString,
    spellName: nullableNonblankString,
    spellId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((option, context) => {
    if ((option.spellKey === null) !== (option.spellName === null)) {
      context.addIssue({
        code: "custom",
        message: "Spell option key and name must both be present or absent.",
      });
    }
    if (option.spellId !== undefined && option.spellKey === null) {
      context.addIssue({
        code: "custom",
        message: "A resolved spell option must retain its source target.",
        path: ["spellId"],
      });
    }
  });

const spellEffectItemTargetSchema = z
  .object({
    itemKey: nullableNonblankString,
    itemName: nullableNonblankString,
    itemId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((target, context) => {
    if ((target.itemKey === null) !== (target.itemName === null)) {
      context.addIssue({
        code: "custom",
        message:
          "Direct item-target key and name must both be present or absent.",
      });
    }
    if (target.itemId !== undefined && target.itemKey === null) {
      context.addIssue({
        code: "custom",
        message: "A resolved direct item target must retain its source target.",
        path: ["itemId"],
      });
    }
  });

const spellEffectMonsterTargetSchema = z
  .object({
    monsterKey: nullableNonblankString,
    monsterName: nullableNonblankString,
    monsterId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((target, context) => {
    if ((target.monsterKey === null) !== (target.monsterName === null)) {
      context.addIssue({
        code: "custom",
        message:
          "Direct monster-target key and name must both be present or absent.",
      });
    }
    if (target.monsterId !== undefined && target.monsterKey === null) {
      context.addIssue({
        code: "custom",
        message:
          "A resolved direct monster target must retain its source target.",
        path: ["monsterId"],
      });
    }
  });

const spellBuffPolymorphDeclarationSchema = z
  .object({
    monsterKey: nullableNonblankString,
    monsterName: nullableNonblankString,
    monsterId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((target, context) => {
    if ((target.monsterKey === null) !== (target.monsterName === null)) {
      context.addIssue({
        code: "custom",
        message:
          "Polymorph target key and name must both be present or absent.",
      });
    }
    if (target.monsterId !== undefined && target.monsterKey === null) {
      context.addIssue({
        code: "custom",
        message: "A resolved polymorph target must retain its source target.",
        path: ["monsterId"],
      });
    }
  });

const spellEffectRemovedBuffSchema = z
  .object({
    spellKey: nullableNonblankString,
    spellName: nullableNonblankString,
    spellId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((target, context) => {
    if ((target.spellKey === null) !== (target.spellName === null)) {
      context.addIssue({
        code: "custom",
        message:
          "Removed-buff target key and name must both be present or absent.",
      });
    }
    if (target.spellId !== undefined && target.spellKey === null) {
      context.addIssue({
        code: "custom",
        message:
          "A resolved removed-buff target must retain its source target.",
        path: ["spellId"],
      });
    }
  });

const spellEffectBuffConditionSchema = z
  .object({
    enabled: z.boolean().nullable(),
    spellKey: nullableNonblankString,
    spellName: nullableNonblankString,
    spellId: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((condition, context) => {
    if ((condition.spellKey === null) !== (condition.spellName === null)) {
      context.addIssue({
        code: "custom",
        message: "Buff condition key and name must both be present or absent.",
      });
    }
    if (condition.spellId !== undefined && condition.spellKey === null) {
      context.addIssue({
        code: "custom",
        message: "A resolved buff condition must retain its source target.",
        path: ["spellId"],
      });
    }
  });

const spellEffectSchema = z
  .object({
    type: z.string(),
    spellKey: optionalString,
    spellName: optionalString,
    spellId: optionalString,
    statKey: optionalString,
    statName: optionalString,
    statId: optionalString,
    amount: z.number().int().optional(),
    itemTarget: spellEffectItemTargetSchema,
    monsterTarget: spellEffectMonsterTargetSchema,
    removedBuff: spellEffectRemovedBuffSchema,
    damage: z.array(
      z
        .object({
          sourceKey: z.enum(damageSourceKeys),
          amount: nullableNonnegativeNumber,
          factor: nullableNonnegativeNumber,
        })
        .strict(),
    ),
    scaling: z
      .object({
        amountFactor: nullableNonnegativeNumber,
        floorFactor: nullableNonnegativeNumber,
        primaryStatId: nullableNonnegativeInteger,
        secondaryStatId: nullableNonnegativeInteger,
      })
      .strict(),
    presentation: z
      .object({
        iconPath: nullableAssetPathSchema,
        smallIconPath: nullableAssetPathSchema,
        spritePath: nullableAssetPathSchema,
        frameCount: nullableNonnegativeInteger,
        frameRate: nullableNonnegativeInteger,
        centered: z.boolean().nullable(),
        soundEffect: nullableNonblankString,
      })
      .strict()
      .nullable(),
    createdObjectSpritePath: nullableAssetPathSchema,
    regenerateGraphics: z.boolean().nullable(),
    buffTag: nullableNonblankString,
    controls: z
      .object({
        durationTurns: nullableNonnegativeInteger,
        after: z.boolean().nullable(),
        chancePercent: nullablePercentageInteger,
        affectsCaster: z.boolean().nullable(),
        affectsSelf: z.boolean().nullable(),
        affectsCorpses: z.boolean().nullable(),
        resistable: z.boolean().nullable(),
        burnsTarget: z.boolean().nullable(),
        bleedsTarget: z.boolean().nullable(),
        midas: z.boolean().nullable(),
        skipAnimation: z.boolean().nullable(),
        taxonomy: nullableNonblankString,
      })
      .strict(),
    conditions: z
      .object({
        requiresSourceBuff: z.boolean().nullable(),
        requiredBuff: spellEffectBuffConditionSchema,
        forbiddenBuff: spellEffectBuffConditionSchema,
      })
      .strict(),
    options: z.array(
      z.union([spellEffectItemOptionSchema, spellEffectSpellOptionSchema]),
    ),
  })
  .strict();

const spellAiHintSchema = z
  .object({
    hint: z
      .string()
      .refine((value) => value.trim().length > 0)
      .nullable(),
  })
  .strict();

const spellBuffSchema = z
  .object({
    iconPath: nullableAssetPathSchema,
    smallIconPath: nullableAssetPathSchema,
    timerMode: nullableNonnegativeInteger,
    duration: nullableNonnegativeInteger,
    manaUpkeep: nullableNonnegativeInteger,
    currencyUpkeep: nullableNonnegativeInteger,
    hitLimit: nullableNonnegativeInteger,
    attackLimit: nullableNonnegativeInteger,
    removable: z.boolean().nullable(),
    affectsSelf: z.boolean().nullable(),
    resistable: z.boolean().nullable(),
    detrimental: z.boolean().nullable(),
    stackable: z.boolean().nullable(),
    allowStacking: z.boolean().nullable(),
    stackLimit: nullableNonnegativeInteger,
    descriptions: z.array(
      z
        .object({
          text: z.string().nullable(),
        })
        .strict(),
    ),
    halos: z.array(
      z
        .object({
          spritePath: nullableAssetPathSchema,
          frameCount: nullableNonnegativeInteger,
          frameRate: nullableNonnegativeInteger,
          firstFrame: nullableNonnegativeInteger,
          centered: z.boolean().nullable(),
        })
        .strict(),
    ),
    invisibilityDeclarations: z.array(
      z
        .object({
          amount: nullableNonnegativeInteger,
        })
        .strict(),
    ),
    muteDeclarations: z.array(
      z
        .object({
          amount: nullableNonnegativeInteger,
        })
        .strict(),
    ),
    senseWallsDeclarations: z.array(
      z
        .object({
          enabled: z.boolean().nullable(),
        })
        .strict(),
    ),
    paybackDeclarations: z.array(
      z
        .object({
          secondaryScale: z.boolean().nullable(),
          factor: nullableNumber,
        })
        .strict(),
    ),
    zorkmidAbsorptionDeclarations: z.array(
      z
        .object({
          zorkmidsPerDamage: z.number().int().min(-128).max(127).nullable(),
          damageCap: z.number().int().min(-128).max(127).nullable(),
          maxRatio: nullableNumber,
        })
        .strict(),
    ),
    polymorphDeclarations: z.array(spellBuffPolymorphDeclarationSchema),
    effects: z.array(spellEffectSchema),
    aiHints: z.array(spellAiHintSchema),
    sourceFlags: z.array(sourceFlagSchema),
    modifiers: z.array(statModifierSchema),
    sightModifiers: z.array(z.object({ amount: nullableNumber }).strict()),
    eventHooks: z.array(
      z
        .object({
          kind: z.enum(spellBuffEventHookKinds),
          spellKey: z.string(),
          spellName: z.string(),
          spellId: optionalString,
          chance: nullablePercentageInteger,
          sourceFlags: z.array(sourceFlagSchema),
        })
        .strict(),
    ),
  })
  .strict();

const spellFramePresentationSchema = z
  .object({
    spritePath: nullableAssetPathSchema,
    frameCount: nullableNonnegativeInteger,
    frameRate: nullableNonnegativeInteger,
    firstFrame: nullableNonnegativeInteger,
    centered: z.boolean().nullable(),
    synchronized: z.boolean().nullable(),
    soundEffect: z.string().nullable(),
  })
  .strict();

const spellMineSchema = z
  .object({
    sourceEnabled: z.boolean().nullable(),
    sourceRadius: nullableNonnegativeInteger,
    sourceTimer: nullableNonnegativeInteger,
    sourcePermanence: nullableNonnegativeInteger,
    sourceSpriteDrawOrder: nullableNonnegativeInteger,
    sourceUsesGlints: z.boolean().nullable(),
    sourceGlintDensity: nullableNonnegativeInteger,
    sourceMustBeUnobstructed: z.boolean().nullable(),
    presentation: z
      .object({
        spritePath: nullableAssetPathSchema,
        spriteSeriesPath: nullableAssetPathSchema,
        firstFrame: nullableNonnegativeInteger,
        frameCount: nullableNonnegativeInteger,
        frameRate: nullableNonnegativeInteger,
      })
      .strict(),
  })
  .strict();

const spellItemConsumptionSchema = z
  .object({
    sourceConsumesItem: z.boolean().nullable(),
    sourceItemType: nullableNonblankString,
  })
  .strict();

const spellSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("spell"),
    spellType: z.string(),
    iconPath: nullableAssetPathSchema,
    sourceRadius: nullableNonnegativeInteger,
    sourceCooldownTurns: nullableNonnegativeInteger,
    sourcePerformsMeleeAttack: z.boolean().nullable(),
    sourceWandFlag: z.boolean().nullable(),
    sourceSelfFlag: z.boolean().nullable(),
    sourceNoAnimationFlag: z.boolean().nullable(),
    itemConsumption: spellItemConsumptionSchema.nullable(),
    mine: spellMineSchema.nullable(),
    targetingTemplate: z
      .object({
        sourceTemplateId: z.string().nullable(),
        templateKey: z.string().nullable(),
        templateId: z.string().optional(),
        sourceAnchored: z.boolean().nullable(),
      })
      .strict(),
    manaCosts: z.array(
      z
        .object({
          base: nullableNonnegativeNumber,
          savvyReduction: nullableNonnegativeNumber,
          minimum: nullableNonnegativeNumber,
          sourceLevel: nullableSignedByte,
        })
        .strict(),
    ),
    boozeRequirements: z.array(
      z
        .object({
          sourceValue: nullableSignedByte,
        })
        .strict(),
    ),
    zorkmidRequirements: z.array(
      z
        .object({
          sourceZorkmids: positiveInteger.nullable(),
          sourceZorkmidScaleFactor: nullableNumber,
          sourceSavvyBonus: nullableNumber,
        })
        .strict(),
    ),
    shieldRequirements: z.array(
      z
        .object({
          sourceValue: z.boolean().nullable(),
        })
        .strict(),
    ),
    weaponRequirements: z.array(
      z
        .object({
          sourceValue: z.boolean().nullable(),
        })
        .strict(),
    ),
    animations: z.array(spellFramePresentationSchema),
    impacts: z.array(spellFramePresentationSchema),
    aiHints: z.array(spellAiHintSchema),
    buffs: z.array(spellBuffSchema),
    effects: z.array(spellEffectSchema),
  })
  .strict();

const nullableBoolean = z.boolean().nullable();
const directionalSpriteSchema = z
  .object({
    down: nullableAssetPathSchema,
    left: nullableAssetPathSchema,
    right: nullableAssetPathSchema,
    up: nullableAssetPathSchema,
  })
  .strict();

const monsterSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("monster"),
    taxonomy: z.string(),
    level: nonnegativeInteger,
    depth: nullableNonnegativeInteger,
    special: z.boolean(),
    iconPath: nullableAssetPathSchema,
    paletteName: z.string().nullable(),
    paletteTint: z.number().int().nullable(),
    archetypeLevels: z
      .object({
        fighter: nonnegativeInteger,
        rogue: nonnegativeInteger,
        wizard: nonnegativeInteger,
      })
      .strict(),
    ai: z
      .object({
        aggressiveness: nullableNonnegativeInteger,
        span: nullableNonnegativeInteger,
        invisible: nullableBoolean,
        chicken: nullableBoolean,
        canCharm: nullableBoolean,
        canParalyze: nullableBoolean,
        stealGold: nullableBoolean,
        stealPercentage: nullablePercentageInteger,
      })
      .strict(),
    sight: z
      .object({
        cone: nullableNonnegativeNumber,
        modifier: nullableNonnegativeNumber,
      })
      .strict(),
    movement: z
      .object({
        dig: z
          .object({
            chance: nullablePercentageInteger,
            ambushChance: nullablePercentageInteger,
            blockedChance: nullablePercentageInteger,
            minimumTurns: nullableNonnegativeInteger,
            maximumTurns: nullableNonnegativeInteger,
            minimumDistance: nullableNonnegativeInteger,
          })
          .strict()
          .nullable(),
        dash: z
          .object({
            chance: nullablePercentageInteger,
            speed: nullableNonnegativeInteger,
            minimumDistance: nullableNonnegativeInteger,
            interruptible: nullableBoolean,
          })
          .strict()
          .nullable(),
        charge: z
          .object({
            chance: nullablePercentageInteger,
            range: nullableNonnegativeInteger,
            turns: nullableNonnegativeInteger,
            interruptible: nullableBoolean,
            blocksAction: nullableBoolean,
            targetsSelf: nullableBoolean,
          })
          .strict()
          .nullable(),
      })
      .strict(),
    presentation: z
      .object({
        soundEffects: z
          .object({
            attack: z.string().nullable(),
            death: z.string().nullable(),
            hit: z.string().nullable(),
            spell: z.string().nullable(),
            digIn: z.string().nullable(),
            digOut: z.string().nullable(),
          })
          .strict()
          .nullable(),
        attack: directionalSpriteSchema.nullable(),
        hit: directionalSpriteSchema.nullable(),
        death: z.object({ name: nullableAssetPathSchema }).strict().nullable(),
        cast: z.object({ name: nullableAssetPathSchema }).strict().nullable(),
        beam: directionalSpriteSchema.nullable(),
        morph: z
          .object({
            drink: nullableAssetPathSchema,
            eat: nullableAssetPathSchema,
            femaleLevelUp: nullableAssetPathSchema,
            maleLevelUp: nullableAssetPathSchema,
            longIdle: nullableAssetPathSchema,
            vanish: nullableAssetPathSchema,
          })
          .strict()
          .nullable(),
        dig: z
          .object({
            down: nullableAssetPathSchema,
            up: nullableAssetPathSchema,
          })
          .strict()
          .nullable(),
      })
      .strict(),
    experienceValue: nullableNonnegativeInteger,
    modifiers: z.array(statModifierSchema),
    spellChance: nullablePercentageInteger,
    triggers: z.array(
      z
        .object({
          kind: z.enum(monsterSpellTriggerKinds),
          spellKey: z.string(),
          spellName: z.string(),
          spellId: optionalString,
          chance: nullablePercentageInteger,
          oneChanceIn: z.number().int().positive().nullable(),
        })
        .strict(),
    ),
    drops: z.array(
      z.union([
        z
          .object({
            itemKey: z.string(),
            itemName: z.string(),
            itemId: optionalString,
            chance: percentageInteger,
          })
          .strict(),
        z
          .object({
            dropType: z.string(),
            chance: percentageInteger,
          })
          .strict(),
      ]),
    ),
    inheritsKey: optionalString,
    inheritsName: optionalString,
    inheritsId: optionalString,
  })
  .strict();

const statSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("stat"),
    group: z.string(),
    modifier: z
      .object({
        kind: z.enum(statModifierKinds),
        sourceKey: z.string().min(1),
      })
      .strict()
      .nullable(),
  })
  .strict();

const templateSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("template"),
    affectsPlayer: z.boolean(),
    rows: z.array(z.string()).refine(isValidTemplateRows, {
      message: "Template rows must form a rectangular grid with one anchor.",
    }),
  })
  .strict();

const datasetArtifactSchema = z
  .object({
    schemaVersion: z.literal(3),
    datasetId: z.string(),
    datasetVersion: z.string(),
    language: z.literal("en"),
    sources: z.array(
      z
        .object({
          id: z.string(),
          label: z.string(),
          kind: z.enum(["base", "expansion", "mod", "fixture", "reference"]),
          version: z.string(),
          precedence: z.number().int(),
        })
        .strict(),
    ),
    encrustmentInstabilityEffects: z.array(
      z
        .object({
          name: z.string(),
          spellKey: z.string(),
          spellName: z.string(),
          spellId: optionalString,
          provenance: provenanceSchema,
        })
        .strict(),
    ),
    entities: z
      .object({
        items: z.array(itemSchema),
        recipes: z.array(recipeSchema),
        encrustments: z.array(encrustmentSchema),
        skills: z.array(skillSchema),
        abilities: z.array(abilitySchema),
        spells: z.array(spellSchema),
        monsters: z.array(monsterSchema),
        stats: z.array(statSchema),
        templates: z.array(templateSchema),
      })
      .strict(),
    diagnostics: z
      .object({
        info: nonnegativeInteger,
        warning: nonnegativeInteger,
        error: nonnegativeInteger,
      })
      .strict(),
  })
  .strict();

const searchArtifactSchema = z
  .object({
    schemaVersion: z.literal(2),
    datasetSchemaVersion: z.literal(3),
    datasetId: z.string(),
    language: z.literal("en"),
    documents: z.array(
      z
        .object({
          id: z.string(),
          kind: z.enum(entityKinds),
          name: z.string(),
          aliases: z.array(entitySlugSchema),
          summary: z.string(),
          sourceId: z.string(),
          category: z.string().nullable(),
          statKeys: z.array(z.string()),
          url: entityUrlSchema,
          text: z.string(),
        })
        .strict(),
    ),
  })
  .strict();

const diagnosticSchema = z
  .object({
    id: z.string(),
    severity: z.enum(["info", "warning", "error"]),
    code: z.string(),
    message: z.string(),
    source: z.union([provenanceSchema, sourceLocationSchema]).optional(),
    entityId: optionalString,
    details: z.record(z.string(), patchValueSchema).optional(),
  })
  .strict();

const checksumSchema = z
  .object({ file: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/) })
  .strict();
const outputChecksum = (file: string) =>
  z
    .object({
      file: z.literal(file),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      bytes: nonnegativeInteger,
    })
    .strict();

const artifactManifestSchema = z
  .object({
    schemaVersion: z.literal(2),
    datasetId: z.string(),
    generator: z.string(),
    sourceManifest: z.string(),
    inputs: z.array(checksumSchema),
    outputs: z
      .object({
        artifact: outputChecksum("artifact.json"),
        search: outputChecksum("search.json"),
        diagnostics: outputChecksum("diagnostics.json"),
      })
      .strict(),
  })
  .strict();

let artifactDirectoryCache: string | undefined;
let manifestCache: ArtifactManifest | undefined;

interface LoadedArtifactSet {
  artifact: DatasetArtifact;
  diagnostics: Diagnostic[];
  search: SearchArtifact;
}

let artifactSetCache: LoadedArtifactSet | undefined;

function artifactDirectory(): string {
  if (artifactDirectoryCache) {
    return artifactDirectoryCache;
  }
  const explicitRoot = process.env.DREDMORPEDIA_ARTIFACT_DIRECTORY;
  const candidates = explicitRoot
    ? [path.resolve(explicitRoot)]
    : [
        path.resolve(process.cwd(), "../../data/generated/spike"),
        path.resolve(process.cwd(), "data/generated/spike"),
      ];
  const match = candidates.find((candidate) =>
    existsSync(path.join(candidate, "manifest.json")),
  );
  if (!match) {
    throw new Error(
      explicitRoot
        ? "Generated manifest.json is missing from the configured artifact directory. Regenerate that dataset or correct DREDMORPEDIA_ARTIFACT_DIRECTORY."
        : 'Generated manifest.json is missing. Run "pnpm generate" from the repository root.',
    );
  }
  artifactDirectoryCache = match;
  return match;
}

function readGeneratedText(name: string): string {
  const file = path.join(artifactDirectory(), name);
  if (!existsSync(file)) {
    throw new Error(`Generated ${name} is missing; regenerate the dataset.`);
  }
  return readFileSync(file, "utf8");
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new Error(`Generated ${label} is not valid JSON.`, { cause: error });
  }
}

function validationError(label: string, error: z.ZodError): Error {
  const issue = error.issues[0];
  const location = issue?.path.length ? ` at ${issue.path.join(".")}` : "";
  return new Error(
    `Generated ${label} does not satisfy its schema${location}: ${issue?.message ?? "validation failed"}. Regenerate it with the current pipeline.`,
  );
}

function loadManifest(): ArtifactManifest {
  if (manifestCache) {
    return manifestCache;
  }
  const result = artifactManifestSchema.safeParse(
    parseJson(readGeneratedText("manifest.json"), "manifest.json"),
  );
  if (!result.success) {
    throw validationError("manifest.json", result.error);
  }
  manifestCache = result.data as ArtifactManifest;
  return manifestCache;
}

function readVerifiedOutput(output: keyof ArtifactManifest["outputs"]): string {
  const expected = loadManifest().outputs[output];
  const contents = readGeneratedText(expected.file);
  const actualBytes = Buffer.byteLength(contents);
  const actualSha256 = createHash("sha256").update(contents).digest("hex");
  if (actualBytes !== expected.bytes || actualSha256 !== expected.sha256) {
    throw new Error(
      `Generated ${expected.file} does not match manifest.json; publication may have been interrupted. Regenerate the dataset before starting the web application.`,
    );
  }
  return contents;
}

function allEntities(artifact: DatasetArtifact): NormalizedEntity[] {
  return Object.values(artifact.entities).flat();
}

function assertUnique(values: readonly string[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Generated artifact contains duplicate ${label}.`);
  }
}

function assertUniqueEntityRouteSlugs(artifact: DatasetArtifact): void {
  const routeOwners = new Map<string, string>();
  for (const entity of allEntities(artifact)) {
    for (const slug of [entity.slug, ...entity.slugAliases]) {
      const route = `${entity.kind}:${slug}`;
      const existingOwner = routeOwners.get(route);
      if (existingOwner !== undefined) {
        throw new Error(
          `Generated artifact contains duplicate ${entity.kind} route slug "${slug}" for entities ${existingOwner} and ${entity.id}.`,
        );
      }
      routeOwners.set(route, entity.id);
    }
  }
}

function assertStatModifierReferences(artifact: DatasetArtifact): void {
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const modifierOwners = [
    ...artifact.entities.items.map((entity) => ({
      entity,
      modifiers: entity.modifiers,
    })),
    ...artifact.entities.encrustments.map((entity) => ({
      entity,
      modifiers: entity.modifiers,
    })),
    ...artifact.entities.abilities.map((entity) => ({
      entity,
      modifiers: entity.modifiers,
    })),
    ...artifact.entities.monsters.map((entity) => ({
      entity,
      modifiers: entity.modifiers,
    })),
    ...artifact.entities.spells.flatMap((entity) =>
      entity.buffs.map((buff) => ({ entity, modifiers: buff.modifiers })),
    ),
  ];
  for (const { entity, modifiers } of modifierOwners) {
    for (const modifier of modifiers) {
      if (modifier.statId === undefined) {
        continue;
      }
      const stat = statsById.get(modifier.statId);
      if (
        stat?.modifier?.kind !== modifier.kind ||
        stat.modifier.sourceKey !== modifier.sourceKey
      ) {
        throw new Error(
          `Generated entity ${entity.id} contains a stat modifier with an invalid definition reference.`,
        );
      }
    }
  }
}

function parseArtifact(contents: string): DatasetArtifact {
  const result = datasetArtifactSchema.safeParse(
    parseJson(contents, "artifact.json"),
  );
  if (!result.success) {
    throw validationError("artifact.json", result.error);
  }
  const artifact = result.data as DatasetArtifact;
  if (artifact.datasetId !== loadManifest().datasetId) {
    throw new Error(
      "Generated artifact.json and manifest.json identify different datasets.",
    );
  }
  assertUnique(
    artifact.sources.map((source) => source.id),
    "source IDs",
  );
  assertUnique(
    allEntities(artifact).map((entity) => entity.id),
    "entity IDs",
  );
  assertUniqueEntityRouteSlugs(artifact);
  assertStatModifierReferences(artifact);
  return artifact;
}

function parseSearchArtifact(
  contents: string,
  artifact: DatasetArtifact,
): SearchArtifact {
  const result = searchArtifactSchema.safeParse(
    parseJson(contents, "search.json"),
  );
  if (!result.success) {
    throw validationError("search.json", result.error);
  }
  const search = result.data as SearchArtifact;
  if (
    search.datasetId !== artifact.datasetId ||
    search.datasetSchemaVersion !== artifact.schemaVersion ||
    search.language !== artifact.language ||
    !isDeepStrictEqual(
      search.documents,
      createSearchDocuments(artifact.entities),
    )
  ) {
    throw new Error(
      "Generated search.json is not derived from the loaded artifact.json; regenerate the dataset.",
    );
  }
  assertUnique(
    search.documents.map((document) => document.id),
    "search document IDs",
  );
  return search;
}

function parseDiagnostics(
  contents: string,
  artifact: DatasetArtifact,
): Diagnostic[] {
  const result = z
    .array(diagnosticSchema)
    .safeParse(parseJson(contents, "diagnostics.json"));
  if (!result.success) {
    throw validationError("diagnostics.json", result.error);
  }
  const diagnostics = result.data as Diagnostic[];
  const counts = { info: 0, warning: 0, error: 0 };
  for (const diagnostic of diagnostics) {
    counts[diagnostic.severity] += 1;
  }
  if (!isDeepStrictEqual(counts, artifact.diagnostics)) {
    throw new Error(
      "Generated diagnostics.json counts do not match artifact.json; regenerate the dataset.",
    );
  }
  assertUnique(
    diagnostics.map((diagnostic) => diagnostic.id),
    "diagnostic IDs",
  );
  const diagnosticIds = new Set(diagnostics.map((diagnostic) => diagnostic.id));
  for (const entity of allEntities(artifact)) {
    if (entity.diagnosticIds.some((id) => !diagnosticIds.has(id))) {
      throw new Error(
        `Generated entity ${entity.id} references a missing diagnostic.`,
      );
    }
  }
  return diagnostics;
}

function loadArtifactSet(): LoadedArtifactSet {
  if (artifactSetCache) {
    return artifactSetCache;
  }

  const artifactContents = readVerifiedOutput("artifact");
  const searchContents = readVerifiedOutput("search");
  const diagnosticContents = readVerifiedOutput("diagnostics");
  const artifact = parseArtifact(artifactContents);
  const search = parseSearchArtifact(searchContents, artifact);
  const diagnostics = parseDiagnostics(diagnosticContents, artifact);

  artifactSetCache = { artifact, diagnostics, search };
  return artifactSetCache;
}

export function loadArtifact(): DatasetArtifact {
  return loadArtifactSet().artifact;
}

export function loadSearchArtifact(): SearchArtifact {
  return loadArtifactSet().search;
}

export function loadDiagnostics(): Diagnostic[] {
  return loadArtifactSet().diagnostics;
}
