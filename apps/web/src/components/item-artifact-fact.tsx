import type { ItemArtifactMetadata } from "@dredmorpedia/domain";

export function ItemArtifactFact({
  artifacts,
}: {
  artifacts: readonly ItemArtifactMetadata[];
}) {
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="item-artifact-fact">
      <dt>Artifact</dt>
      <dd>
        {artifacts
          .map(({ quality }) =>
            quality === null ? "Quality Unavailable" : `Quality ${quality}`,
          )
          .join(", ")}
      </dd>
    </div>
  );
}
