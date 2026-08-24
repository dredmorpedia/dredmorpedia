import {
  canonicalKey,
  type DatasetArtifact,
  type Stat,
} from "@dredmorpedia/domain";

import type { StatLinkPresentation } from "./stat-presentation-types";
import { createStatLinkPresentation } from "./stat-presentations";

const sourceStatKeysByTool = new Map<string, readonly string[]>([
  ["lathe", ["23"]],
  ["grinder", ["21", "20"]],
  ["alchemy", ["21"]],
  ["still", ["21"]],
  ["ingot", ["19", "20"]],
  ["smithing", ["19"]],
  ["tinkerer", ["20"]],
]);

export function craftingSourceStatKeysForTool(tool: string): readonly string[] {
  return sourceStatKeysByTool.get(canonicalKey(tool)) ?? [];
}

export function craftingSourceStatPresentations({
  artifact,
  artifactSha256,
  stats,
  tool,
}: {
  artifact: DatasetArtifact;
  artifactSha256: string;
  stats: readonly Stat[];
  tool: string;
}): StatLinkPresentation[] {
  return craftingSourceStatKeysForTool(tool).flatMap((sourceKey) => {
    const stat = stats.find(
      (entry) =>
        entry.modifier?.kind === "secondary" &&
        entry.modifier.sourceKey === sourceKey,
    );
    return stat
      ? [createStatLinkPresentation(stat, artifact, artifactSha256)]
      : [];
  });
}
