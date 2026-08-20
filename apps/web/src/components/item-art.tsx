import type { DatasetArtifact, Item } from "@dredmorpedia/domain";

import { itemIconUrl } from "@/lib/presented-assets";

export function ItemArt({
  item,
  artifact,
  artifactSha256,
  size,
}: {
  item: Item;
  artifact: DatasetArtifact;
  artifactSha256: string;
  size: number;
}) {
  const url = itemIconUrl(item.id, artifact, artifactSha256);
  return url ? (
    // Entity names are supplied by adjacent visible text.
    // eslint-disable-next-line @next/next/no-img-element
    <img alt="" height={size} src={url} title={item.name} width={size} />
  ) : (
    <span
      aria-hidden="true"
      className="catalogue-art-placeholder"
      style={{ height: size, width: size }}
    >
      ?
    </span>
  );
}
