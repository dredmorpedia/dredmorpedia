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
  const overrideHeadingId = `${headingId}-overrides`;

  const getSourceLabel = (sourceId: string) =>
    artifact.sources.find((entry) => entry.id === sourceId)?.label ?? sourceId;

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
        <section
          className="override-history"
          aria-labelledby={overrideHeadingId}
        >
          <h3 id={overrideHeadingId} className="override-history-title">
            Override history
          </h3>
          <ol className="override-list">
            {entity.appliedOverrides.map((override, index) => (
              <li
                className="override-step"
                key={`${override.previous.sourceId}:${override.replacement.sourceId}:${index}`}
              >
                <p className="override-route">
                  <span className="override-step-label">Step {index + 1}</span>
                  <strong>{getSourceLabel(override.previous.sourceId)}</strong>
                  <span>replaced by</span>
                  <strong>
                    {getSourceLabel(override.replacement.sourceId)}
                  </strong>
                </p>
                <dl className="override-sources">
                  <div>
                    <dt>Previous source</dt>
                    <dd>
                      <code>{override.previous.sourceId}</code>
                      <small>
                        {override.previous.file}:{override.previous.line}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Replacement source</dt>
                    <dd>
                      <code>{override.replacement.sourceId}</code>
                      <small>
                        {override.replacement.file}:{override.replacement.line}
                      </small>
                    </dd>
                  </div>
                </dl>
                <div className="override-fields">
                  <strong>Changed fields</strong>
                  {override.changedFields.length > 0 ? (
                    <ul>
                      {override.changedFields.map((field) => (
                        <li key={field}>
                          <code>{field}</code>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No normalized fields changed.</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
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
