import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

import type { DatasetArtifact, Item } from "@dredmorpedia/domain";

import {
  StatDefinitionLink,
  StatModifierLink,
} from "@/components/stat-modifier-link";
import { signedStatModifierValue } from "@/lib/stat-modifiers";

interface ItemSummaryModifierEntry {
  key: string;
  term: ReactNode;
  value: string;
}

function ModifierEntries({
  entries,
}: {
  entries: readonly ItemSummaryModifierEntry[];
}) {
  return entries.map((entry) => (
    <div key={entry.key}>
      <dt>{entry.term}</dt>
      <dd>{entry.value}</dd>
    </div>
  ));
}

export function ItemSummaryModifierList({
  artifact,
  artifactSha256,
  initialCount = 6,
  item,
}: {
  artifact: DatasetArtifact;
  artifactSha256: string;
  initialCount?: number;
  item: Item;
}) {
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const entries: ItemSummaryModifierEntry[] = [
    ...item.stats.map((stat, index) => {
      const definition = stat.statId ? statsById.get(stat.statId) : undefined;
      return {
        key: `stat:${stat.statKey}:${index}`,
        term: definition ? (
          <StatDefinitionLink
            artifact={artifact}
            artifactSha256={artifactSha256}
            display="icon"
            label={stat.statName}
            stat={definition}
          />
        ) : (
          stat.statName
        ),
        value: signedStatModifierValue(stat.amount),
      };
    }),
    ...item.modifiers.map((modifier, index) => ({
      key: `modifier:${modifier.kind}:${modifier.sourceKey}:${index}`,
      term: (
        <StatModifierLink
          artifact={artifact}
          artifactSha256={artifactSha256}
          display="icon"
          modifier={modifier}
          stats={artifact.entities.stats}
        />
      ),
      value: signedStatModifierValue(modifier.amount),
    })),
  ];

  if (entries.length === 0) {
    return null;
  }

  const visibleEntries = entries.slice(0, initialCount);
  const additionalEntries = entries.slice(initialCount);

  return (
    <div className="item-summary-modifier-block">
      <dl className="item-summary-modifiers" aria-label="Item modifiers">
        <ModifierEntries entries={visibleEntries} />
      </dl>
      {additionalEntries.length > 0 ? (
        <details className="catalogue-overflow-details item-summary-modifier-overflow">
          <summary>
            <span className="catalogue-overflow-show">
              <ChevronDown aria-hidden="true" size={14} />
              Show {additionalEntries.length} more stat
              {additionalEntries.length === 1 ? "" : "s"}
            </span>
            <span className="catalogue-overflow-hide">
              <ChevronUp aria-hidden="true" size={14} />
              Hide additional stats
            </span>
          </summary>
          <dl
            aria-label="Additional item modifiers"
            className="item-summary-modifiers item-summary-modifiers-additional"
          >
            <ModifierEntries entries={additionalEntries} />
          </dl>
        </details>
      ) : null}
    </div>
  );
}
