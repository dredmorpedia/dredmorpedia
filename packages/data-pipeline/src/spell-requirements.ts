import type { EntityProvenance, Spell } from "@dredmorpedia/domain";

import type { NormalizationContext } from "./normalization-context";
import { parseSourceInteger, parseSourceNumber } from "./numeric-lexemes";
import type { XmlRecord } from "./xml-adapter";
import { xmlAttribute, xmlChildren } from "./xml-adapter";

interface SpellRequirementDependencies {
  optionalNumberValue: (
    value: string | undefined,
    context: NormalizationContext,
    location: EntityProvenance,
    field: string,
    currentEntityId: string,
    minimum?: number,
    maximum?: number,
  ) => number | null;
  optionalIntegerValue: (
    value: string | undefined,
    context: NormalizationContext,
    location: EntityProvenance,
    field: string,
    currentEntityId: string,
    minimum?: number,
    maximum?: number,
  ) => number | null;
  optionalBinaryBooleanAttribute: (
    record: XmlRecord,
    name: string,
    context: NormalizationContext,
    location: EntityProvenance,
    field: string,
    currentEntityId: string,
  ) => boolean | null;
  reportUnknownLeafContent: (
    context: NormalizationContext,
    record: XmlRecord,
    elementName: string,
    allowedAttributes: ReadonlySet<string>,
    provenance: EntityProvenance,
    currentEntityId: string,
    includeAttributeValues?: boolean,
  ) => void;
}

const manaRequirementAttributes = new Set([
  "mp",
  "savvyBonus",
  "savvybonus",
  "mincost",
  "level",
]);

const otherShieldRequirementAttributes = [
  "savvyBonus",
  "savvybonus",
  "mincost",
  "level",
  "weapon",
  "booze",
  "zorkmids",
  "zorkmidScaleF",
] as const;

const otherWeaponRequirementAttributes = [
  "savvyBonus",
  "savvybonus",
  "mincost",
  "level",
  "shield",
  "booze",
  "zorkmids",
  "zorkmidScaleF",
] as const;

const otherBoozeRequirementAttributes = [
  "savvyBonus",
  "savvybonus",
  "mincost",
  "level",
  "shield",
  "weapon",
  "zorkmids",
  "zorkmidScaleF",
] as const;

const zorkmidRequirementAttributes = new Set([
  "zorkmids",
  "zorkmidScaleF",
  "savvyBonus",
]);

const otherZorkmidRequirementAttributes = [
  "mp",
  "mincost",
  "level",
  "shield",
  "weapon",
  "booze",
] as const;

function hasAnyAttribute(
  record: XmlRecord,
  attributes: readonly string[],
): boolean {
  return attributes.some(
    (attribute) => xmlAttribute(record, attribute) !== undefined,
  );
}

function signedByteAttribute(
  record: XmlRecord,
  name: string,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
): number | null {
  const value = xmlAttribute(record, name);
  const parsed = value === undefined ? null : parseSourceInteger(value);
  if (parsed !== null && parsed >= -128 && parsed <= 127) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected an integer from -128 to 127 for ${field}; used an unavailable value instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value: value ?? "" },
  });
  return null;
}

function positiveIntegerAttribute(
  record: XmlRecord,
  name: string,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
): number | null {
  const value = xmlAttribute(record, name);
  if (value === undefined) {
    return null;
  }
  const parsed = parseSourceInteger(value);
  if (parsed !== null && parsed >= 1) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected a positive integer for ${field}; used an unavailable value instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return null;
}

function finiteNumberAttribute(
  record: XmlRecord,
  name: string,
  context: NormalizationContext,
  location: EntityProvenance,
  field: string,
  currentEntityId: string,
): number | null {
  const value = xmlAttribute(record, name);
  if (value === undefined) {
    return null;
  }
  const parsed = parseSourceNumber(value);
  if (parsed !== null) {
    return parsed;
  }

  context.diagnostics.push({
    severity: "warning",
    code: "invalid_number",
    message: `Expected a finite number for ${field}; used an unavailable value instead.`,
    source: location,
    entityId: currentEntityId,
    details: { field, value },
  });
  return null;
}

export function parseSpellRequirements(
  record: XmlRecord,
  context: NormalizationContext,
  provenance: EntityProvenance,
  currentEntityId: string,
  dependencies: SpellRequirementDependencies,
): Pick<
  Spell,
  | "manaCosts"
  | "boozeRequirements"
  | "zorkmidRequirements"
  | "shieldRequirements"
  | "weaponRequirements"
> {
  const manaCosts: Spell["manaCosts"] = [];
  const boozeRequirements: Spell["boozeRequirements"] = [];
  const zorkmidRequirements: Spell["zorkmidRequirements"] = [];
  const shieldRequirements: Spell["shieldRequirements"] = [];
  const weaponRequirements: Spell["weaponRequirements"] = [];

  for (const requirements of xmlChildren(record, "requirements")) {
    const requirementProvenance = {
      ...provenance,
      ...context.parsed.locateRecord(requirements),
    };
    const baseText = xmlAttribute(requirements, "mp");
    if (baseText !== undefined) {
      dependencies.reportUnknownLeafContent(
        context,
        requirements,
        "requirements",
        manaRequirementAttributes,
        requirementProvenance,
        currentEntityId,
      );
      manaCosts.push({
        base: dependencies.optionalNumberValue(
          baseText,
          context,
          requirementProvenance,
          "spell mana base cost",
          currentEntityId,
          0,
        ),
        savvyReduction: dependencies.optionalNumberValue(
          xmlAttribute(requirements, "savvyBonus") ??
            xmlAttribute(requirements, "savvybonus"),
          context,
          requirementProvenance,
          "spell mana Savvy reduction",
          currentEntityId,
          0,
        ),
        minimum: dependencies.optionalNumberValue(
          xmlAttribute(requirements, "mincost"),
          context,
          requirementProvenance,
          "spell minimum mana cost",
          currentEntityId,
          0,
        ),
        sourceLevel: dependencies.optionalIntegerValue(
          xmlAttribute(requirements, "level"),
          context,
          requirementProvenance,
          "spell requirement level source value",
          currentEntityId,
          -128,
          127,
        ),
      });
      continue;
    }

    const shieldText = xmlAttribute(requirements, "shield");
    if (
      shieldText !== undefined &&
      !hasAnyAttribute(requirements, otherShieldRequirementAttributes)
    ) {
      dependencies.reportUnknownLeafContent(
        context,
        requirements,
        "requirements",
        new Set(["shield"]),
        requirementProvenance,
        currentEntityId,
      );
      shieldRequirements.push({
        sourceValue: dependencies.optionalBinaryBooleanAttribute(
          requirements,
          "shield",
          context,
          requirementProvenance,
          "spell shield requirement source flag",
          currentEntityId,
        ),
      });
      continue;
    }

    const weaponText = xmlAttribute(requirements, "weapon");
    if (
      weaponText !== undefined &&
      !hasAnyAttribute(requirements, otherWeaponRequirementAttributes)
    ) {
      dependencies.reportUnknownLeafContent(
        context,
        requirements,
        "requirements",
        new Set(["weapon"]),
        requirementProvenance,
        currentEntityId,
      );
      weaponRequirements.push({
        sourceValue: dependencies.optionalBinaryBooleanAttribute(
          requirements,
          "weapon",
          context,
          requirementProvenance,
          "spell weapon requirement source flag",
          currentEntityId,
        ),
      });
      continue;
    }

    const boozeText = xmlAttribute(requirements, "booze");
    if (
      boozeText !== undefined &&
      !hasAnyAttribute(requirements, otherBoozeRequirementAttributes)
    ) {
      dependencies.reportUnknownLeafContent(
        context,
        requirements,
        "requirements",
        new Set(["booze"]),
        requirementProvenance,
        currentEntityId,
      );
      boozeRequirements.push({
        sourceValue: signedByteAttribute(
          requirements,
          "booze",
          context,
          requirementProvenance,
          "spell booze requirement source value",
          currentEntityId,
        ),
      });
      continue;
    }

    const zorkmidsText = xmlAttribute(requirements, "zorkmids");
    const zorkmidScaleText = xmlAttribute(requirements, "zorkmidScaleF");
    if (
      (zorkmidsText !== undefined || zorkmidScaleText !== undefined) &&
      !hasAnyAttribute(requirements, otherZorkmidRequirementAttributes)
    ) {
      dependencies.reportUnknownLeafContent(
        context,
        requirements,
        "requirements",
        zorkmidRequirementAttributes,
        requirementProvenance,
        currentEntityId,
      );
      zorkmidRequirements.push({
        sourceZorkmids: positiveIntegerAttribute(
          requirements,
          "zorkmids",
          context,
          requirementProvenance,
          "spell zorkmid requirement source zorkmids",
          currentEntityId,
        ),
        sourceZorkmidScaleFactor: finiteNumberAttribute(
          requirements,
          "zorkmidScaleF",
          context,
          requirementProvenance,
          "spell zorkmid requirement source zorkmidScaleF",
          currentEntityId,
        ),
        sourceSavvyBonus: finiteNumberAttribute(
          requirements,
          "savvyBonus",
          context,
          requirementProvenance,
          "spell zorkmid requirement source savvyBonus",
          currentEntityId,
        ),
      });
      continue;
    }

    context.diagnostics.push({
      severity: "warning",
      code: "unsupported_spell_requirement",
      message: "This non-mana spell requirement shape remains unsupported.",
      source: requirementProvenance,
      entityId: currentEntityId,
      details: { element: "requirements" },
    });
  }

  return {
    manaCosts,
    boozeRequirements,
    zorkmidRequirements,
    shieldRequirements,
    weaponRequirements,
  };
}
