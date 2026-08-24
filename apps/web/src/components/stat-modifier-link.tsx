import type { DatasetArtifact, Stat, StatModifier } from "@dredmorpedia/domain";

import { StatPresentationLink } from "@/components/stat-presentation-link";
import {
  statDefinitionForModifier,
  statModifierLabel,
} from "@/lib/stat-modifiers";
import { createStatLinkPresentation } from "@/lib/stat-presentations";

type StatLinkDisplay = "icon" | "icon-label" | "label";

export function StatIcon({
  artifact,
  artifactSha256,
  stat,
}: {
  artifact: DatasetArtifact;
  artifactSha256: string;
  stat: Stat;
}) {
  const presentation = createStatLinkPresentation(
    stat,
    artifact,
    artifactSha256,
  );
  return presentation.iconUrl ? (
    // Keep the interface art at its native size, matching the game and legacy UI.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt=""
      aria-hidden="true"
      className="stat-icon"
      height={16}
      src={presentation.iconUrl}
      title={stat.name}
      width={16}
    />
  ) : null;
}

export function StatDefinitionLink({
  artifact,
  artifactSha256,
  display = "label",
  label,
  stat,
}: {
  artifact?: DatasetArtifact | undefined;
  artifactSha256?: string | undefined;
  display?: StatLinkDisplay;
  label?: string;
  stat: Stat;
}) {
  return (
    <StatPresentationLink
      display={display}
      label={label}
      presentation={createStatLinkPresentation(stat, artifact, artifactSha256)}
    />
  );
}

export function StatModifierLink({
  artifact,
  artifactSha256,
  display = "label",
  modifier,
  stats,
}: {
  artifact?: DatasetArtifact | undefined;
  artifactSha256?: string | undefined;
  display?: StatLinkDisplay;
  modifier: StatModifier;
  stats: readonly Stat[];
}) {
  const definition = statDefinitionForModifier(modifier, stats);
  return definition ? (
    <StatDefinitionLink
      artifact={artifact}
      artifactSha256={artifactSha256}
      display={display}
      stat={definition}
    />
  ) : (
    statModifierLabel(modifier, stats)
  );
}
