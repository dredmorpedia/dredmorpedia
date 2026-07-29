import type { StatModifier } from "@dredmorpedia/domain";

import { titleCase } from "@/lib/display-labels";

export function statModifierLabel(modifier: StatModifier): string {
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
