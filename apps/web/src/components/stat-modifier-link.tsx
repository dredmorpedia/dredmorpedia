import Link from "next/link";

import type { Stat, StatModifier } from "@dredmorpedia/domain";

import {
  statDefinitionForModifier,
  statModifierLabel,
} from "@/lib/stat-modifiers";

export function StatModifierLink({
  modifier,
  stats,
}: {
  modifier: StatModifier;
  stats: readonly Stat[];
}) {
  const definition = statDefinitionForModifier(modifier, stats);
  return definition ? (
    <Link className="entity-link" href={`/stats/${definition.slug}`}>
      {definition.name}
    </Link>
  ) : (
    statModifierLabel(modifier, stats)
  );
}
