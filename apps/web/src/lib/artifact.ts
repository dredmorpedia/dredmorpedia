import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  itemTriggerKinds,
  statModifierKinds,
  type DatasetArtifact,
  type Diagnostic,
  type SearchArtifact,
} from "@dredmorpedia/domain";

const itemTriggerKindSet: ReadonlySet<string> = new Set(itemTriggerKinds);
const statModifierKindSet: ReadonlySet<string> = new Set(statModifierKinds);

function generatedFile(name: string): string {
  const explicitRoot = process.env.DREDMORPEDIA_ARTIFACT_DIRECTORY;
  const candidates = [
    ...(explicitRoot ? [path.resolve(explicitRoot, name)] : []),
    path.resolve(process.cwd(), "../../data/generated/spike", name),
    path.resolve(process.cwd(), "data/generated/spike", name),
  ];
  const match = candidates.find(existsSync);
  if (!match) {
    throw new Error(
      `Generated ${name} is missing. Run \"pnpm generate\" from the repository root.`,
    );
  }
  return match;
}

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(generatedFile(name), "utf8")) as unknown;
}

let artifactCache: DatasetArtifact | undefined;
let diagnosticsCache: Diagnostic[] | undefined;
let searchCache: SearchArtifact | undefined;

function hasValidSpellTrigger(trigger: unknown): boolean {
  return (
    trigger !== null &&
    typeof trigger === "object" &&
    "kind" in trigger &&
    typeof trigger.kind === "string" &&
    itemTriggerKindSet.has(trigger.kind) &&
    "spellKey" in trigger &&
    typeof trigger.spellKey === "string" &&
    "spellName" in trigger &&
    typeof trigger.spellName === "string" &&
    "chance" in trigger &&
    (trigger.chance === null ||
      (typeof trigger.chance === "number" &&
        Number.isInteger(trigger.chance) &&
        trigger.chance >= 0 &&
        trigger.chance <= 100)) &&
    "delay" in trigger &&
    typeof trigger.delay === "number" &&
    Number.isInteger(trigger.delay) &&
    trigger.delay >= 0 &&
    "duration" in trigger &&
    typeof trigger.duration === "number" &&
    Number.isInteger(trigger.duration) &&
    trigger.duration >= 0 &&
    "unresistable" in trigger &&
    typeof trigger.unresistable === "boolean" &&
    "monsterTaxonomy" in trigger &&
    (trigger.monsterTaxonomy === null ||
      typeof trigger.monsterTaxonomy === "string") &&
    (!("spellId" in trigger) || typeof trigger.spellId === "string")
  );
}

function hasValidStatModifier(modifier: unknown): boolean {
  return (
    modifier !== null &&
    typeof modifier === "object" &&
    "kind" in modifier &&
    typeof modifier.kind === "string" &&
    statModifierKindSet.has(modifier.kind) &&
    "sourceKey" in modifier &&
    typeof modifier.sourceKey === "string" &&
    "amount" in modifier &&
    typeof modifier.amount === "number" &&
    Number.isFinite(modifier.amount)
  );
}

function hasValidRoutedEntity(value: unknown): boolean {
  return (
    value !== null &&
    typeof value === "object" &&
    "id" in value &&
    typeof value.id === "string" &&
    "canonicalKey" in value &&
    typeof value.canonicalKey === "string" &&
    "slug" in value &&
    typeof value.slug === "string" &&
    "slugAliases" in value &&
    Array.isArray(value.slugAliases) &&
    value.slugAliases.every((alias: unknown) => typeof alias === "string") &&
    "name" in value &&
    typeof value.name === "string" &&
    "description" in value &&
    typeof value.description === "string" &&
    "diagnosticIds" in value &&
    Array.isArray(value.diagnosticIds) &&
    value.diagnosticIds.every(
      (diagnosticId: unknown) => typeof diagnosticId === "string",
    )
  );
}

function hasValidItems(value: unknown): boolean {
  if (value === null || typeof value !== "object" || !("items" in value)) {
    return false;
  }
  if (!Array.isArray(value.items)) {
    return false;
  }
  return value.items.every((item) => {
    if (
      item === null ||
      typeof item !== "object" ||
      !("quality" in item) ||
      typeof item.quality !== "number" ||
      !Number.isInteger(item.quality) ||
      item.quality < 0 ||
      !("triggers" in item) ||
      !Array.isArray(item.triggers)
    ) {
      return false;
    }
    return item.triggers.every(hasValidSpellTrigger);
  });
}

function hasValidEncrustments(value: unknown): boolean {
  if (
    value === null ||
    typeof value !== "object" ||
    !("encrustments" in value) ||
    !Array.isArray(value.encrustments)
  ) {
    return false;
  }
  return value.encrustments.every(
    (encrustment) =>
      encrustment !== null &&
      typeof encrustment === "object" &&
      "tool" in encrustment &&
      typeof encrustment.tool === "string" &&
      "hidden" in encrustment &&
      typeof encrustment.hidden === "boolean" &&
      "skillLevel" in encrustment &&
      typeof encrustment.skillLevel === "number" &&
      Number.isInteger(encrustment.skillLevel) &&
      encrustment.skillLevel >= 0 &&
      "slots" in encrustment &&
      Array.isArray(encrustment.slots) &&
      encrustment.slots.every((slot: unknown) => typeof slot === "string") &&
      "instability" in encrustment &&
      typeof encrustment.instability === "number" &&
      Number.isInteger(encrustment.instability) &&
      "modifiers" in encrustment &&
      Array.isArray(encrustment.modifiers) &&
      encrustment.modifiers.every(hasValidStatModifier) &&
      "powers" in encrustment &&
      Array.isArray(encrustment.powers) &&
      encrustment.powers.every(
        (power: unknown) =>
          power !== null &&
          typeof power === "object" &&
          "name" in power &&
          typeof power.name === "string" &&
          "chance" in power &&
          (power.chance === null ||
            (typeof power.chance === "number" &&
              Number.isFinite(power.chance) &&
              power.chance >= 0 &&
              power.chance <= 1)),
      ) &&
      "appearanceDescriptors" in encrustment &&
      Array.isArray(encrustment.appearanceDescriptors) &&
      encrustment.appearanceDescriptors.every(
        (descriptor: unknown) => typeof descriptor === "string",
      ) &&
      "inputs" in encrustment &&
      Array.isArray(encrustment.inputs) &&
      encrustment.inputs.every(
        (input: unknown) =>
          input !== null &&
          typeof input === "object" &&
          "itemKey" in input &&
          typeof input.itemKey === "string" &&
          "itemName" in input &&
          typeof input.itemName === "string" &&
          "amount" in input &&
          typeof input.amount === "number" &&
          Number.isInteger(input.amount) &&
          input.amount >= 1 &&
          (!("itemId" in input) || typeof input.itemId === "string"),
      ),
  );
}

function hasValidEncrustmentInstabilityEffects(value: unknown): boolean {
  if (
    value === null ||
    typeof value !== "object" ||
    !("encrustmentInstabilityEffects" in value) ||
    !Array.isArray(value.encrustmentInstabilityEffects)
  ) {
    return false;
  }
  return value.encrustmentInstabilityEffects.every(
    (effect) =>
      effect !== null &&
      typeof effect === "object" &&
      "name" in effect &&
      typeof effect.name === "string" &&
      "spellKey" in effect &&
      typeof effect.spellKey === "string" &&
      "spellName" in effect &&
      typeof effect.spellName === "string" &&
      (!("spellId" in effect) || typeof effect.spellId === "string") &&
      "provenance" in effect &&
      effect.provenance !== null &&
      typeof effect.provenance === "object" &&
      "sourceId" in effect.provenance &&
      typeof effect.provenance.sourceId === "string" &&
      "file" in effect.provenance &&
      typeof effect.provenance.file === "string" &&
      "line" in effect.provenance &&
      typeof effect.provenance.line === "number" &&
      Number.isInteger(effect.provenance.line) &&
      effect.provenance.line >= 1 &&
      "column" in effect.provenance &&
      typeof effect.provenance.column === "number" &&
      Number.isInteger(effect.provenance.column) &&
      effect.provenance.column >= 1,
  );
}

function hasValidSpells(value: unknown): boolean {
  if (
    value === null ||
    typeof value !== "object" ||
    !("spells" in value) ||
    !Array.isArray(value.spells)
  ) {
    return false;
  }
  return value.spells.every(
    (spell) =>
      spell !== null &&
      typeof spell === "object" &&
      "id" in spell &&
      typeof spell.id === "string" &&
      "canonicalKey" in spell &&
      typeof spell.canonicalKey === "string" &&
      "slug" in spell &&
      typeof spell.slug === "string" &&
      "slugAliases" in spell &&
      Array.isArray(spell.slugAliases) &&
      spell.slugAliases.every((alias: unknown) => typeof alias === "string") &&
      "name" in spell &&
      typeof spell.name === "string" &&
      "description" in spell &&
      typeof spell.description === "string" &&
      "spellType" in spell &&
      typeof spell.spellType === "string" &&
      "diagnosticIds" in spell &&
      Array.isArray(spell.diagnosticIds) &&
      spell.diagnosticIds.every(
        (diagnosticId: unknown) => typeof diagnosticId === "string",
      ) &&
      "effects" in spell &&
      Array.isArray(spell.effects) &&
      spell.effects.every(
        (effect: unknown) =>
          effect !== null &&
          typeof effect === "object" &&
          "type" in effect &&
          typeof effect.type === "string" &&
          (!("spellKey" in effect) || typeof effect.spellKey === "string") &&
          (!("spellName" in effect) || typeof effect.spellName === "string") &&
          (!("spellId" in effect) || typeof effect.spellId === "string") &&
          (!("statKey" in effect) || typeof effect.statKey === "string") &&
          (!("statName" in effect) || typeof effect.statName === "string") &&
          (!("statId" in effect) || typeof effect.statId === "string") &&
          (!("amount" in effect) ||
            (typeof effect.amount === "number" &&
              Number.isFinite(effect.amount))),
      ),
  );
}

function hasValidSkills(value: unknown): boolean {
  if (
    value === null ||
    typeof value !== "object" ||
    !("skills" in value) ||
    !Array.isArray(value.skills)
  ) {
    return false;
  }
  return value.skills.every(
    (skill) =>
      hasValidRoutedEntity(skill) &&
      skill !== null &&
      typeof skill === "object" &&
      "archetype" in skill &&
      typeof skill.archetype === "string" &&
      "loadouts" in skill &&
      Array.isArray(skill.loadouts) &&
      skill.loadouts.every(
        (loadout: unknown) =>
          loadout !== null &&
          typeof loadout === "object" &&
          (("itemKey" in loadout && typeof loadout.itemKey === "string") ||
            ("itemType" in loadout && typeof loadout.itemType === "string")) &&
          (!("itemName" in loadout) || typeof loadout.itemName === "string") &&
          (!("itemId" in loadout) || typeof loadout.itemId === "string") &&
          "amount" in loadout &&
          typeof loadout.amount === "number" &&
          Number.isInteger(loadout.amount) &&
          loadout.amount >= 1 &&
          "always" in loadout &&
          typeof loadout.always === "boolean",
      ) &&
      "loadoutItemKeys" in skill &&
      Array.isArray(skill.loadoutItemKeys) &&
      skill.loadoutItemKeys.every(
        (itemKey: unknown) => typeof itemKey === "string",
      ) &&
      "abilityIds" in skill &&
      Array.isArray(skill.abilityIds) &&
      skill.abilityIds.every(
        (abilityId: unknown) => typeof abilityId === "string",
      ),
  );
}

function hasValidAbilities(value: unknown): boolean {
  if (
    value === null ||
    typeof value !== "object" ||
    !("abilities" in value) ||
    !Array.isArray(value.abilities)
  ) {
    return false;
  }
  return value.abilities.every(
    (ability) =>
      hasValidRoutedEntity(ability) &&
      ability !== null &&
      typeof ability === "object" &&
      "skillKey" in ability &&
      typeof ability.skillKey === "string" &&
      (!("skillId" in ability) || typeof ability.skillId === "string") &&
      "level" in ability &&
      typeof ability.level === "number" &&
      Number.isInteger(ability.level) &&
      ability.level >= 0 &&
      "startSkill" in ability &&
      typeof ability.startSkill === "boolean" &&
      "modifiers" in ability &&
      Array.isArray(ability.modifiers) &&
      ability.modifiers.every(hasValidStatModifier) &&
      "triggers" in ability &&
      Array.isArray(ability.triggers) &&
      ability.triggers.every(hasValidSpellTrigger) &&
      "spellKeys" in ability &&
      Array.isArray(ability.spellKeys) &&
      ability.spellKeys.every(
        (spellKey: unknown) => typeof spellKey === "string",
      ) &&
      "spellIds" in ability &&
      Array.isArray(ability.spellIds) &&
      ability.spellIds.every((spellId: unknown) => typeof spellId === "string"),
  );
}

export function loadArtifact(): DatasetArtifact {
  if (artifactCache) {
    return artifactCache;
  }
  const parsed = readJson("artifact.json");
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("schemaVersion" in parsed) ||
    parsed.schemaVersion !== 3 ||
    !("datasetVersion" in parsed) ||
    typeof parsed.datasetVersion !== "string" ||
    !hasValidEncrustmentInstabilityEffects(parsed) ||
    !("entities" in parsed) ||
    !hasValidItems(parsed.entities) ||
    !hasValidEncrustments(parsed.entities) ||
    !hasValidSkills(parsed.entities) ||
    !hasValidAbilities(parsed.entities) ||
    !hasValidSpells(parsed.entities)
  ) {
    throw new Error(
      "Generated artifact does not satisfy schema version 3; regenerate it with the current pipeline.",
    );
  }
  artifactCache = parsed as DatasetArtifact;
  return artifactCache;
}

export function loadSearchArtifact(): SearchArtifact {
  if (searchCache) {
    return searchCache;
  }
  const parsed = readJson("search.json");
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !("schemaVersion" in parsed) ||
    parsed.schemaVersion !== 1 ||
    !("datasetSchemaVersion" in parsed) ||
    parsed.datasetSchemaVersion !== 3 ||
    !("documents" in parsed) ||
    !Array.isArray(parsed.documents)
  ) {
    throw new Error(
      "Generated search artifact does not satisfy schema version 1.",
    );
  }
  searchCache = parsed as SearchArtifact;
  return searchCache;
}

export function loadDiagnostics(): Diagnostic[] {
  if (diagnosticsCache) {
    return diagnosticsCache;
  }
  const parsed = readJson("diagnostics.json");
  if (!Array.isArray(parsed)) {
    throw new Error("Generated diagnostics must be an array.");
  }
  diagnosticsCache = parsed as Diagnostic[];
  return diagnosticsCache;
}
