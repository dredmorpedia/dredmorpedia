import type {
  DatasetArtifact,
  NormalizedEntity,
  PatchValue,
} from "@dredmorpedia/domain";

function formatPatchValue(value: PatchValue): string {
  if (value === null) {
    return "null";
  }
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export function ProvenanceCard({
  artifact,
  entity,
  headingId,
}: {
  artifact: DatasetArtifact;
  entity: NormalizedEntity;
  headingId: string;
}) {
  const source = artifact.sources.find(
    (entry) => entry.id === entity.provenance.sourceId,
  );

  return (
    <section className="detail-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="section-title-sm">
        Provenance
      </h2>
      <dl className="provenance-list">
        <div>
          <dt>Dataset version</dt>
          <dd>{artifact.datasetVersion}</dd>
        </div>
        <div>
          <dt>Active source</dt>
          <dd>{source?.label ?? entity.provenance.sourceId}</dd>
        </div>
        <div>
          <dt>Source version</dt>
          <dd>{source?.version ?? "Unversioned"}</dd>
        </div>
        <div>
          <dt>Source file</dt>
          <dd>
            {entity.provenance.file}:{entity.provenance.line}
          </dd>
        </div>
        <div>
          <dt>Original ID</dt>
          <dd>{entity.provenance.originalId ?? "Not supplied"}</dd>
        </div>
        <div>
          <dt>Known variants</dt>
          <dd>{entity.variants.length}</dd>
        </div>
      </dl>
      {entity.appliedOverrides.length > 0 ? (
        <div className="override-note">
          <strong>Override applied:</strong>{" "}
          {entity.appliedOverrides[0]?.previous.sourceId} →{" "}
          {entity.provenance.sourceId}
        </div>
      ) : null}
      {entity.appliedPatches.map((patch) => (
        <div className="patch-note" key={`${patch.id}:${patch.file}`}>
          <strong>Reviewed patch: {patch.id}</strong>
          <p>{patch.reason}</p>
          <ul>
            {patch.changes.map((change) => (
              <li key={change.field}>
                <code>{change.field}</code>:{" "}
                {formatPatchValue(change.previousValue)} to{" "}
                {formatPatchValue(change.value)}
              </li>
            ))}
          </ul>
          <small>{patch.file}</small>
        </div>
      ))}
    </section>
  );
}
