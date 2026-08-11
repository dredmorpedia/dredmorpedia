import { compareCodeUnits } from "./ordering";
import type { Monster, MonsterArchetypeLevels, StatModifier } from "./types";

export const monsterPrimaryAttributeDefinitions = [
  {
    key: "burliness",
    label: "Burliness",
    sourceKey: "0",
    coefficients: { fighter: 2, rogue: 1, wizard: 1 },
  },
  {
    key: "sagacity",
    label: "Sagacity",
    sourceKey: "1",
    coefficients: { fighter: 1, rogue: 1, wizard: 2 },
  },
  {
    key: "nimbleness",
    label: "Nimbleness",
    sourceKey: "2",
    coefficients: { fighter: 1, rogue: 2, wizard: 1 },
  },
  {
    key: "caddishness",
    label: "Caddishness",
    sourceKey: "3",
    coefficients: { fighter: 2, rogue: 2, wizard: 1 },
  },
  {
    key: "stubbornness",
    label: "Stubbornness",
    sourceKey: "4",
    coefficients: { fighter: 2, rogue: 1, wizard: 2 },
  },
  {
    key: "savvy",
    label: "Savvy",
    sourceKey: "5",
    coefficients: { fighter: 1, rogue: 2, wizard: 2 },
  },
] as const;

export type MonsterPrimaryAttributeKey =
  (typeof monsterPrimaryAttributeDefinitions)[number]["key"];

export interface MonsterPrimaryAttributeValue {
  key: MonsterPrimaryAttributeKey;
  label: string;
  base: number;
  modifier: number;
  total: number;
}

export function calculateMonsterPrimaryAttributes(
  levels: MonsterArchetypeLevels,
  modifiers: readonly StatModifier[],
): MonsterPrimaryAttributeValue[] {
  return monsterPrimaryAttributeDefinitions.map((definition) => {
    const base =
      levels.fighter * definition.coefficients.fighter +
      levels.rogue * definition.coefficients.rogue +
      levels.wizard * definition.coefficients.wizard;
    const modifier = modifiers.reduce(
      (effectiveAmount, candidate) =>
        candidate.kind === "primary" &&
        candidate.sourceKey === definition.sourceKey
          ? candidate.amount
          : effectiveAmount,
      0,
    );

    return {
      key: definition.key,
      label: definition.label,
      base,
      modifier,
      total: base + modifier,
    };
  });
}

const armourAffectedDamageKeys = new Set(["blasting", "crushing", "slashing"]);

export interface MonsterRequiredArmourBreakdown {
  archetypeContribution: number;
  mundaneDamageModifiers: number;
  requiredArmour: number;
}

export interface MonsterRequiredArmourRanking extends MonsterRequiredArmourBreakdown {
  monsterId: string;
  monsterName: string;
  monsterSlug: string;
}

type MonsterRequiredArmourInput = Pick<
  Monster,
  "id" | "name" | "slug" | "archetypeLevels" | "modifiers"
>;

/**
 * Preserves the required-armour calculation used by the historical Meta view.
 * This compatibility formula is documented separately and must not be treated
 * as independent proof of the game's runtime combat rules.
 */
export function calculateMonsterRequiredArmour(
  levels: MonsterArchetypeLevels,
  modifiers: readonly StatModifier[],
): MonsterRequiredArmourBreakdown {
  const archetypeContribution = Math.floor(
    (levels.fighter * 2 + levels.rogue + levels.wizard - 5) / 3,
  );
  const mundaneDamageModifiers = modifiers.reduce(
    (total, modifier) =>
      modifier.kind === "damage" &&
      armourAffectedDamageKeys.has(modifier.sourceKey)
        ? total + modifier.amount
        : total,
    0,
  );

  return {
    archetypeContribution,
    mundaneDamageModifiers,
    requiredArmour: archetypeContribution + mundaneDamageModifiers,
  };
}

export function rankMonstersByRequiredArmour(
  monsters: readonly MonsterRequiredArmourInput[],
): MonsterRequiredArmourRanking[] {
  return monsters
    .map((monster) => ({
      monsterId: monster.id,
      monsterName: monster.name,
      monsterSlug: monster.slug,
      ...calculateMonsterRequiredArmour(
        monster.archetypeLevels,
        monster.modifiers,
      ),
    }))
    .sort(
      (left, right) =>
        right.requiredArmour - left.requiredArmour ||
        compareCodeUnits(left.monsterName, right.monsterName) ||
        compareCodeUnits(left.monsterId, right.monsterId),
    )
    .slice(0, 10);
}
