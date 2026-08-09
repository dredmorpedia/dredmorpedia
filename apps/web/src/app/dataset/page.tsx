import type { Metadata } from "next";
import Link from "next/link";

import type { PatchValue } from "@dredmorpedia/domain";

import { loadArtifact, loadDiagnostics } from "@/lib/artifact";
import { browseKindFor } from "@/lib/browse";
import {
  allDatasetEntities,
  collectEntitySourceDecisions,
  entityDetailPath,
  groupDiagnosticsByCode,
} from "@/lib/dataset-health";
import { diagnosticCodeLabel, titleCase } from "@/lib/display-labels";

export const metadata: Metadata = {
  title: "Dataset health",
  description:
    "Inspect the active Dredmorpedia dataset sources, import diagnostics, override decisions, and reviewed patches.",
};

function formatPatchValue(value: PatchValue): string {
  if (value === null) {
    return "null";
  }
  return Array.isArray(value) ? value.join(", ") : String(value);
}

export default function DatasetPage() {
  const artifact = loadArtifact();
  const diagnostics = loadDiagnostics();
  const entities = allDatasetEntities(artifact);
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const sourceLabels = new Map(
    artifact.sources.map((source) => [source.id, source.label]),
  );
  const decisions = collectEntitySourceDecisions(artifact);
  const diagnosticGroups = groupDiagnosticsByCode(diagnostics);
  const overrideStepCount = decisions.reduce(
    (total, decision) => total + decision.overrides.length,
    0,
  );
  const patchCount = decisions.reduce(
    (total, decision) => total + decision.patches.length,
    0,
  );

  const sourceLabel = (sourceId: string) =>
    sourceLabels.get(sourceId) ?? sourceId;

  return (
    <div className="page-stack">
      <header>
        <p className="eyebrow">Dataset health</p>
        <h1 className="hero-title">See how this dataset was assembled.</h1>
        <p className="hero-copy">
          Review ordered sources, import findings, and every normalized record
          changed by source precedence or a reviewed patch. This page exposes
          sanitized generated provenance, never the local installation path.
        </p>
      </header>

      <dl className="artifact-summary" aria-label="Dataset health summary">
        <div>
          <dt>Entities</dt>
          <dd>{new Intl.NumberFormat("en").format(entities.length)}</dd>
        </div>
        <div>
          <dt>Source decisions</dt>
          <dd>
            {new Intl.NumberFormat("en").format(overrideStepCount + patchCount)}
          </dd>
        </div>
        <div>
          <dt>Diagnostics</dt>
          <dd>{new Intl.NumberFormat("en").format(diagnostics.length)}</dd>
        </div>
      </dl>

      <section aria-labelledby="dataset-sources-heading">
        <p className="eyebrow">Input order</p>
        <h2 id="dataset-sources-heading" className="section-title">
          Sources
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Lower-precedence sources are applied first. A higher-precedence source
          replaces a matching normalized identity, while the complete decision
          remains in provenance.
        </p>
        <ol className="browse-kind-grid mt-5">
          {artifact.sources.map((source) => (
            <li key={source.id} className="browse-kind-card">
              <div>
                <p className="eyebrow">{titleCase(source.kind)} source</p>
                <h3 className="mt-2 text-xl font-semibold">{source.label}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {source.version}
                </p>
              </div>
              <dl className="health-source-meta">
                <div>
                  <dt>Source ID</dt>
                  <dd>
                    <code>{source.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Precedence</dt>
                  <dd>{source.precedence}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="dataset-diagnostics-heading">
        <p className="eyebrow">Import findings</p>
        <h2 id="dataset-diagnostics-heading" className="section-title">
          Diagnostics
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Findings are grouped by severity and stable diagnostic code. Expand a
          group to inspect exact messages, sanitized source locations, and any
          linked active record.
        </p>

        {diagnosticGroups.length > 0 ? (
          <ul className="browse-result-list mt-5">
            {diagnosticGroups.map((group) => (
              <li
                key={`${group.severity}:${group.code}`}
                className="browse-result-card health-disclosure-card"
              >
                <details open={group.severity === "error"}>
                  <summary className="health-disclosure-summary">
                    <span className={`severity severity-${group.severity}`}>
                      {group.severity}
                    </span>
                    <span>
                      <strong>{diagnosticCodeLabel(group.code)}</strong>
                      <small>
                        {group.diagnostics.length}{" "}
                        {group.diagnostics.length === 1
                          ? "finding"
                          : "findings"}
                      </small>
                    </span>
                  </summary>
                  <ul className="diagnostic-list health-diagnostic-list">
                    {group.diagnostics.map((diagnostic) => {
                      const entity = diagnostic.entityId
                        ? entityById.get(diagnostic.entityId)
                        : undefined;
                      return (
                        <li key={diagnostic.id}>
                          <span
                            aria-hidden="true"
                            className="diagnostic-marker"
                          >
                            •
                          </span>
                          <div className="health-diagnostic-copy">
                            <p>{diagnostic.message}</p>
                            <p className="health-diagnostic-meta">
                              {diagnostic.source ? (
                                <>
                                  {sourceLabel(diagnostic.source.sourceId)} ·{" "}
                                  <code>
                                    {diagnostic.source.file}:
                                    {diagnostic.source.line}:
                                    {diagnostic.source.column}
                                  </code>
                                </>
                              ) : (
                                "No source location"
                              )}
                              {entity ? (
                                <>
                                  {" "}
                                  ·{" "}
                                  <Link
                                    className="entity-link"
                                    href={entityDetailPath(entity)}
                                  >
                                    Open {entity.name}
                                  </Link>
                                </>
                              ) : null}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state mt-5" role="status">
            <h3 className="font-semibold">No import diagnostics</h3>
            <p>
              The generator reported no errors, warnings, or informational
              decisions for this dataset.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="source-decisions-heading">
        <p className="eyebrow">Precedence and review</p>
        <h2 id="source-decisions-heading" className="section-title">
          Source decisions
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          These are the active records with at least one override step or
          reviewed patch. Open a record for its complete provenance alongside
          the encyclopedia details.
        </p>

        {decisions.length > 0 ? (
          <ul className="browse-result-list mt-5">
            {decisions.map((decision) => {
              const definition = browseKindFor(decision.kind);
              const decisionCount =
                decision.overrides.length + decision.patches.length;
              return (
                <li key={decision.id} className="browse-result-card">
                  <article>
                    <p className="eyebrow">{definition.singularLabel}</p>
                    <h3 className="mt-2 text-xl font-semibold">
                      <Link className="entity-link" href={decision.url}>
                        {decision.name}
                      </Link>
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Active source: {sourceLabel(decision.activeSourceId)}
                    </p>

                    <details className="health-decision-details">
                      <summary className="health-decision-summary">
                        Review {decisionCount}{" "}
                        {decisionCount === 1 ? "decision" : "decisions"}
                      </summary>

                      {decision.overrides.length > 0 ? (
                        <ol className="override-list mt-4">
                          {decision.overrides.map((override, index) => (
                            <li
                              className="override-step"
                              key={`${override.previous.sourceId}:${override.replacement.sourceId}:${index}`}
                            >
                              <p className="override-route">
                                <span className="override-step-label">
                                  Override {index + 1}
                                </span>
                                <strong>
                                  {sourceLabel(override.previous.sourceId)}
                                </strong>
                                <span>replaced by</span>
                                <strong>
                                  {sourceLabel(override.replacement.sourceId)}
                                </strong>
                              </p>
                              <dl className="override-sources">
                                <div>
                                  <dt>Previous source</dt>
                                  <dd>
                                    <code>{override.previous.sourceId}</code>
                                    <small>
                                      {override.previous.file}:
                                      {override.previous.line}
                                    </small>
                                  </dd>
                                </div>
                                <div>
                                  <dt>Replacement source</dt>
                                  <dd>
                                    <code>{override.replacement.sourceId}</code>
                                    <small>
                                      {override.replacement.file}:
                                      {override.replacement.line}
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
                      ) : null}

                      {decision.patches.map((patch) => (
                        <div
                          className="patch-note"
                          key={`${patch.id}:${patch.file}`}
                        >
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
                    </details>
                  </article>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="empty-state mt-5" role="status">
            <h3 className="font-semibold">No source decisions</h3>
            <p>
              No active record was overridden or changed by a reviewed patch in
              this dataset.
            </p>
          </div>
        )}
      </section>

      <p className="text-sm leading-6 text-muted-foreground">
        Need the records themselves?{" "}
        <Link href="/browse/">Browse every entity kind</Link> or{" "}
        <Link href="/search/">search the active dataset</Link>.
      </p>
    </div>
  );
}
