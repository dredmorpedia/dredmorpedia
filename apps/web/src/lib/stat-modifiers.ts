import type { Stat, StatModifier } from "@dredmorpedia/domain";

import { titleCase } from "@/lib/display-labels";

export function statDefinitionForModifier(
  modifier: StatModifier,
  stats: readonly Stat[],
): Stat | undefined {
  return modifier.statId === undefined
    ? undefined
    : stats.find((stat) => stat.id === modifier.statId);
}

export function statModifierLabel(
  modifier: StatModifier,
  stats: readonly Stat[] = [],
): string {
  const definition = statDefinitionForModifier(modifier, stats);
  if (definition) {
    return definition.name;
  }
  switch (modifier.kind) {
    case "damage":
      return `${titleCase(modifier.sourceKey)} damage`;
    case "resistance":
      return `${titleCase(modifier.sourceKey)} resistance`;
    case "primary":
      return `Primary attribute ${modifier.sourceKey}`;
    case "secondary":
      return `Secondary stat ${modifier.sourceKey}`;
  }
}

export function signedStatModifierValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}
