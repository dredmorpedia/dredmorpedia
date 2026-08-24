import type { DatasetArtifact, Stat } from "@dredmorpedia/domain";

import { uiIconUrl } from "./presented-assets";
import type { StatLinkPresentation } from "./stat-presentation-types";

export function createStatLinkPresentation(
  stat: Stat,
  artifact: DatasetArtifact | undefined,
  artifactSha256: string | undefined,
): StatLinkPresentation {
  return {
    iconUrl:
      stat.iconAssetId && artifact && artifactSha256
        ? uiIconUrl(stat.iconAssetId, artifact, artifactSha256)
        : null,
    label: stat.name,
    slug: stat.slug,
  };
}
