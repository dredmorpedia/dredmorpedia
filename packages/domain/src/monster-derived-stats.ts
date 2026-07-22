import type { MonsterArchetypeLevels, StatModifier } from "./types";

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
    const modifier = modifiers
      .filter(
        (candidate) =>
          candidate.kind === "primary" &&
          candidate.sourceKey === definition.sourceKey,
      )
      .reduce((total, candidate) => total + candidate.amount, 0);

    return {
      key: definition.key,
      label: definition.label,
      base,
      modifier,
      total: base + modifier,
    };
  });
}
