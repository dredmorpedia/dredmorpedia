import {
  itemCategoryLabel,
  type DatasetArtifact,
  type Item,
} from "@dredmorpedia/domain";

import type { ItemPreviewData } from "./item-preview-types";
import { itemIconUrl, spellIconUrl } from "./presented-assets";
import { sourceMarker } from "./source-markers";
import {
  signedStatModifierValue,
  statDefinitionForModifier,
  statModifierLabel,
} from "./stat-modifiers";
import { createStatLinkPresentation } from "./stat-presentations";
import { wandChargeRangesSummary } from "./wand-charge-summary";

const modifierOrder = [
  "damage",
  "resistance",
  "primary",
  "secondary",
  "other",
  "random",
] as const;

export function createItemPreviewData(
  item: Item,
  artifact: DatasetArtifact,
  artifactSha256: string,
): ItemPreviewData {
  const source = artifact.sources.find(
    ({ id }) => id === item.provenance.sourceId,
  );
  const engineReference = source?.kind === "reference";
  const facts: ItemPreviewData["facts"] = [
    {
      label: "Value",
      value:
        item.price === null
          ? engineReference
            ? "Not declared"
            : "Unknown"
          : new Intl.NumberFormat("en").format(item.price),
    },
    {
      label: "Quality",
      value: engineReference ? "Not declared" : String(item.quality),
    },
  ];
  if (item.artifacts.length) {
    facts.push({
      label: "Artifact",
      value: item.artifacts
        .map(({ quality }) =>
          quality === null ? "Quality Unavailable" : `Quality ${quality}`,
        )
        .join(", "),
    });
  }
  for (const recovery of item.recoveries) {
    facts.push({
      label: recovery.resource === "life" ? "Health" : "Mana",
      value:
        recovery.amount === null
          ? "Declared"
          : signedStatModifierValue(recovery.amount),
    });
  }
  if (item.chargeRanges.length) {
    facts.push({
      label: "Wand",
      value: wandChargeRangesSummary(item.chargeRanges),
    });
  }
  if (
    item.weaponDeclarations.some(
      ({ canTargetFloor }) => canTargetFloor === true,
    )
  ) {
    facts.push({ label: "Targeting", value: "Can target the floor" });
  }
  const modifiers: ItemPreviewData["modifiers"] = [
    ...item.stats.map((stat) => {
      const definition = artifact.entities.stats.find(
        ({ id }) => id === stat.statId,
      );
      return {
        group: definition?.modifier?.kind ?? ("other" as const),
        label: stat.statName,
        stat: definition
          ? createStatLinkPresentation(definition, artifact, artifactSha256)
          : null,
        value: signedStatModifierValue(stat.amount),
      };
    }),
    ...item.modifiers.map((modifier) => {
      const definition = statDefinitionForModifier(
        modifier,
        artifact.entities.stats,
      );
      return {
        group: modifier.kind,
        label: statModifierLabel(modifier, artifact.entities.stats),
        stat: definition
          ? createStatLinkPresentation(definition, artifact, artifactSha256)
          : null,
        value: signedStatModifierValue(modifier.amount),
      };
    }),
    ...item.armourDeclarations.flatMap(({ randoms }) =>
      randoms !== null && randoms > 0
        ? [
            {
              group: "random" as const,
              label: "Random Stats",
              stat: null,
              value: String(randoms),
            },
          ]
        : [],
    ),
  ];
  modifiers.sort(
    (left, right) =>
      modifierOrder.indexOf(left.group) - modifierOrder.indexOf(right.group),
  );

  return {
    category: itemCategoryLabel(item.category),
    description:
      item.description.length > 240
        ? `${item.description.slice(0, 239).trimEnd()}…`
        : item.description,
    effects: item.triggers.slice(0, 2).map((trigger) => {
      const spell = artifact.entities.spells.find(
        ({ id }) => id === trigger.spellId,
      );
      return {
        iconUrl: spell
          ? spellIconUrl(spell.id, artifact, artifactSha256)
          : null,
        spell: spell ? { name: spell.name, slug: spell.slug } : null,
        trigger: {
          chance: trigger.chance,
          delay: trigger.delay,
          duration: trigger.duration,
          kind: trigger.kind,
          monsterTaxonomy: trigger.monsterTaxonomy,
          spellName: trigger.spellName,
          unresistable: trigger.unresistable,
        },
      };
    }),
    engineReference,
    facts,
    iconUrl: itemIconUrl(item.id, artifact, artifactSha256),
    modifiers,
    name: item.name,
    remainingEffects: Math.max(0, item.triggers.length - 2),
    slug: item.slug,
    sourceMarker: sourceMarker(source),
  };
}
