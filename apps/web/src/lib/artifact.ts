import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import {
  createSearchDocuments,
  entityKinds,
  isValidTemplateRows,
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
const optionalString = z.string().optional();

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
  slug: z.string(),
  slugAliases: z.array(z.string()),
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

const statModifierSchema = z
  .object({
    kind: z.enum(statModifierKinds),
    sourceKey: z.string(),
    amount: z.number(),
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
    iconPath: z.string().nullable(),
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
    iconPath: z.string().nullable(),
    loadouts: z.array(
      z
        .object({
          itemKey: optionalString,
          itemName: optionalString,
          itemId: optionalString,
          itemType: optionalString,
          amount: positiveInteger,
          always: z.boolean(),
        })
        .strict(),
    ),
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
    iconPath: z.string().nullable(),
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
  })
  .strict();

const spellBuffSchema = z
  .object({
    iconPath: z.string().nullable(),
    smallIconPath: z.string().nullable(),
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

const spellSchema = z
  .object({
    ...entityBaseShape,
    kind: z.literal("spell"),
    spellType: z.string(),
    iconPath: z.string().nullable(),
    manaCosts: z.array(
      z
        .object({
          base: nullableNonnegativeNumber,
          savvyReduction: nullableNonnegativeNumber,
          minimum: nullableNonnegativeNumber,
        })
        .strict(),
    ),
    buffs: z.array(spellBuffSchema),
    effects: z.array(spellEffectSchema),
  })
  .strict();

const nullableBoolean = z.boolean().nullable();
const directionalSpriteSchema = z
  .object({
    down: z.string().nullable(),
    left: z.string().nullable(),
    right: z.string().nullable(),
    up: z.string().nullable(),
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
    iconPath: z.string().nullable(),
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
        death: z.object({ name: z.string().nullable() }).strict().nullable(),
        cast: z.object({ name: z.string().nullable() }).strict().nullable(),
        beam: directionalSpriteSchema.nullable(),
        morph: z
          .object({
            drink: z.string().nullable(),
            eat: z.string().nullable(),
            femaleLevelUp: z.string().nullable(),
            maleLevelUp: z.string().nullable(),
            longIdle: z.string().nullable(),
            vanish: z.string().nullable(),
          })
          .strict()
          .nullable(),
        dig: z
          .object({ down: z.string().nullable(), up: z.string().nullable() })
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
  .object({ ...entityBaseShape, kind: z.literal("stat"), group: z.string() })
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
          kind: z.enum(["base", "expansion", "mod", "fixture"]),
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
    schemaVersion: z.literal(1),
    datasetSchemaVersion: z.literal(3),
    datasetId: z.string(),
    language: z.literal("en"),
    documents: z.array(
      z
        .object({
          id: z.string(),
          kind: z.enum(entityKinds),
          name: z.string(),
          summary: z.string(),
          sourceId: z.string(),
          category: z.string().nullable(),
          statKeys: z.array(z.string()),
          url: z.string(),
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
let artifactCache: DatasetArtifact | undefined;
let diagnosticsCache: Diagnostic[] | undefined;
let searchCache: SearchArtifact | undefined;

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

export function loadArtifact(): DatasetArtifact {
  if (artifactCache) {
    return artifactCache;
  }
  const result = datasetArtifactSchema.safeParse(
    parseJson(readVerifiedOutput("artifact"), "artifact.json"),
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
  artifactCache = artifact;
  return artifactCache;
}

export function loadSearchArtifact(): SearchArtifact {
  if (searchCache) {
    return searchCache;
  }
  const result = searchArtifactSchema.safeParse(
    parseJson(readVerifiedOutput("search"), "search.json"),
  );
  if (!result.success) {
    throw validationError("search.json", result.error);
  }
  const search = result.data as SearchArtifact;
  const artifact = loadArtifact();
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
  searchCache = search;
  return searchCache;
}

export function loadDiagnostics(): Diagnostic[] {
  if (diagnosticsCache) {
    return diagnosticsCache;
  }
  const result = z
    .array(diagnosticSchema)
    .safeParse(
      parseJson(readVerifiedOutput("diagnostics"), "diagnostics.json"),
    );
  if (!result.success) {
    throw validationError("diagnostics.json", result.error);
  }
  const diagnostics = result.data as Diagnostic[];
  const artifact = loadArtifact();
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
  diagnosticsCache = diagnostics;
  return diagnosticsCache;
}
