import Link from "next/link";

import { loadArtifact } from "@/lib/artifact";

const itemPreviewLimit = 24;

export default function HomePage() {
  const artifact = loadArtifact();
  const sourceLabels = new Map(
    artifact.sources.map((source) => [source.id, source.label]),
  );
  const items = artifact.entities.items.slice(0, itemPreviewLimit);
  const counts = artifact.diagnostics;
  const diagnosticCount = counts.error + counts.warning + counts.info;
  const entityCount = Object.values(artifact.entities).reduce(
    (total, entities) => total + entities.length,
    0,
  );
  const fixtureOnly = artifact.sources.every(
    (source) => source.kind === "fixture",
  );

  return (
    <div className="page-stack">
      <section className="hero" aria-labelledby="page-heading">
        <div>
          <p className="eyebrow">
            Deterministic pipeline → static encyclopedia
          </p>
          <h1 id="page-heading" className="hero-title">
            A trustworthy foundation for dense dungeon knowledge.
          </h1>
          <p className="hero-copy">
            Browse normalized records from the active {artifact.datasetVersion}{" "}
            {fixtureOnly ? "fixture" : "local"} dataset with explainable source
            precedence, provenance, diagnostics, and relationships.
          </p>
        </div>
        <dl
          className="artifact-summary"
          aria-label="Generated artifact summary"
        >
          <div>
            <dt>Entities</dt>
            <dd>{entityCount}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{artifact.sources.length}</dd>
          </div>
          <div>
            <dt>Language</dt>
            <dd>{artifact.language.toLocaleUpperCase("en")}</dd>
          </div>
        </dl>
      </section>

      <section
        className="diagnostic-panel"
        aria-labelledby="diagnostics-heading"
      >
        <div>
          <p className="eyebrow">Dataset health</p>
          <h2 id="diagnostics-heading" className="text-lg font-semibold">
            {diagnosticCount === 0
              ? "No import diagnostics reported"
              : "Import diagnostics for this dataset"}
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {diagnosticCount === 0
              ? "The generator did not report any errors, warnings, or informational findings."
              : "Counts come from the active generated artifact, so unsupported or malformed source content remains visible instead of failing silently."}
          </p>
        </div>
        <dl className="diagnostic-counts">
          <div>
            <dt>Errors</dt>
            <dd>{counts.error}</dd>
          </div>
          <div>
            <dt>Warnings</dt>
            <dd>{counts.warning}</dd>
          </div>
          <div>
            <dt>Info</dt>
            <dd>{counts.info}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="item-preview-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Item catalogue</p>
            <h2 id="item-preview-heading" className="section-title">
              Item preview
            </h2>
            <p className="result-count mt-2">
              Showing {items.length} of {artifact.entities.items.length} items
            </p>
          </div>
          <Link
            className="entity-link text-sm font-semibold"
            href="/search/?kind=item"
          >
            Browse and filter all items →
          </Link>
        </div>

        {items.length > 0 ? (
          <ul className="item-grid">
            {items.map((item) => (
              <li key={item.id} className="item-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="category-chip">{item.category}</span>
                  <span className="grid justify-items-end gap-1 text-xs text-muted-foreground">
                    <span>
                      {item.price === null
                        ? "No price"
                        : `${new Intl.NumberFormat("en").format(item.price)} zorkmids`}
                    </span>
                    <span>Quality {item.quality}</span>
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-semibold">
                  <Link className="entity-link" href={`/items/${item.slug}`}>
                    {item.name}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
                <p className="mt-4 text-xs font-medium text-muted-foreground">
                  {sourceLabels.get(item.provenance.sourceId) ??
                    item.provenance.sourceId}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state" role="status">
            <h3 className="font-semibold">No items in this dataset</h3>
            <p>Choose another generated dataset and rebuild the application.</p>
          </div>
        )}
      </section>
    </div>
  );
}
