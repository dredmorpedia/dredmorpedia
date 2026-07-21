import { ItemExplorer, type ExplorerItem } from "@/components/item-explorer";
import { loadArtifact } from "@/lib/artifact";

export default function HomePage() {
  const artifact = loadArtifact();
  const sourceLabels = new Map(
    artifact.sources.map((source) => [source.id, source.label]),
  );
  const items: ExplorerItem[] = artifact.entities.items.map((item) => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    category: item.category,
    sourceLabel:
      sourceLabels.get(item.provenance.sourceId) ?? item.provenance.sourceId,
    price: item.price,
    quality: item.quality,
  }));
  const counts = artifact.diagnostics;
  const entityCount = Object.values(artifact.entities).reduce(
    (total, entities) => total + entities.length,
    0,
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
            Browse normalized items with explainable source precedence,
            provenance, diagnostics, and stat relationships. The public build
            remains powered by legal synthetic fixtures.
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
          <p className="eyebrow">Visible failure state</p>
          <h2 id="diagnostics-heading" className="text-lg font-semibold">
            Fixture diagnostics are intentionally present
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            The malformed XML, dangling reference, missing asset, unmodeled
            encrustment effect, unknown element, and precedence collision are
            evidence—not silent failures.
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

      <ItemExplorer items={items} />
    </div>
  );
}
