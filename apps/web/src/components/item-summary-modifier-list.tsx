import type { ReactNode } from "react";

import type {
  DatasetArtifact,
  Item,
  StatModifierKind,
} from "@dredmorpedia/domain";

import {
  StatDefinitionLink,
  StatModifierLink,
} from "@/components/stat-modifier-link";
import { signedStatModifierValue } from "@/lib/stat-modifiers";

interface ItemSummaryModifierEntry {
  group: StatModifierKind | "other";
  key: string;
  term: ReactNode;
  value: string;
}

const modifierGroupOrder = [
  "damage",
  "resistance",
  "primary",
  "secondary",
  "other",
] as const;

const modifierGroupLabels: Record<(typeof modifierGroupOrder)[number], string> =
  {
    damage: "Damage modifiers",
    resistance: "Resistance modifiers",
    primary: "Primary stat modifiers",
    secondary: "Secondary stat modifiers",
    other: "Other item stats",
  };

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
  item,
}: {
  artifact: DatasetArtifact;
  artifactSha256: string;
  item: Item;
}) {
  const statsById = new Map(
    artifact.entities.stats.map((stat) => [stat.id, stat]),
  );
  const entries: ItemSummaryModifierEntry[] = [
    ...item.stats.map<ItemSummaryModifierEntry>((stat, index) => {
      const definition = stat.statId ? statsById.get(stat.statId) : undefined;
      return {
        group: definition?.modifier?.kind ?? "other",
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
    ...item.modifiers.map<ItemSummaryModifierEntry>((modifier, index) => ({
      group: modifier.kind,
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
  const rows = modifierGroupOrder.flatMap((group) => {
    const groupedEntries = entries.filter((entry) => entry.group === group);
    return groupedEntries.length > 0
      ? [{ entries: groupedEntries, group }]
      : [];
  });
  const randomStatEntries: ItemSummaryModifierEntry[] =
    item.armourDeclarations.flatMap(({ randoms }, index) =>
      randoms !== null && randoms > 0
        ? [
            {
              group: "other",
              key: `random-stats:${index}`,
              term: "Random Stats",
              value: String(randoms),
            },
          ]
        : [],
    );

  if (rows.length === 0 && randomStatEntries.length === 0) {
    return null;
  }

  return (
    <div
      aria-label="Item modifiers"
      className="item-summary-modifier-block"
      role="group"
    >
      {rows.map(({ entries: rowEntries, group }) => (
        <dl
          aria-label={modifierGroupLabels[group]}
          className="item-summary-modifiers"
          data-stat-group={group}
          key={group}
        >
          <ModifierEntries entries={rowEntries} />
        </dl>
      ))}
      {randomStatEntries.length > 0 ? (
        <dl
          aria-label="Random stats"
          className="item-summary-modifiers item-summary-modifiers-random"
          data-stat-group="random"
        >
          <ModifierEntries entries={randomStatEntries} />
        </dl>
      ) : null}
    </div>
  );
}
