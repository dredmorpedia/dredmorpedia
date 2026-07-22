import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  entityRouteSlugs,
  matchesEntityRoute,
  summarizeTemplateRows,
} from "@dredmorpedia/domain";

import { ProvenanceCard } from "@/components/provenance-card";
import { loadArtifact } from "@/lib/artifact";

export const dynamicParams = false;

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function generateStaticParams() {
  return loadArtifact().entities.templates.flatMap((template) =>
    entityRouteSlugs(template).map((slug) => ({ slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = loadArtifact().entities.templates.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  return template
    ? {
        title: template.name,
        description: `Targeting template with ${pluralize(template.rows.length, "row")}.`,
        ...(slug === template.slug
          ? {}
          : { robots: { index: false, follow: true } }),
      }
    : { title: "Targeting template not found" };
}

export default async function TemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const template = artifact.entities.templates.find((entry) =>
    matchesEntityRoute(entry, slug),
  );
  if (!template) {
    notFound();
  }

  const { rowCount, columnCount, affectedTileCount } = summarizeTemplateRows(
    template.rows,
    template.affectsPlayer,
  );
  const isAlias = slug !== template.slug;
  const previewLabel = `${template.name} targeting pattern: ${pluralize(rowCount, "row")} by ${pluralize(columnCount, "column")}; ${pluralize(affectedTileCount, "affected tile")}; anchor is ${template.affectsPlayer ? "affected" : "not affected"}.`;

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/search?kind=template">Templates</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{template.name}</span>
      </nav>

      {isAlias ? (
        <aside className="alias-note" aria-labelledby="alias-heading">
          <div>
            <p className="eyebrow">Alias route</p>
            <h2 id="alias-heading" className="font-semibold">
              This alternate URL resolves to {template.name}
            </h2>
          </div>
          <Link className="entity-link" href={`/templates/${template.slug}`}>
            Open canonical URL
          </Link>
        </aside>
      ) : null}

      <header className="detail-header">
        <div>
          <p className="eyebrow">Targeting template</p>
          <h1 className="detail-title">{template.name}</h1>
          <p className="detail-copy">
            A normalized area-of-effect pattern. The anchor marks the player or
            selected target; highlighted tiles are affected.
          </p>
        </div>
        <dl className="recipe-facts">
          <div>
            <dt>Rows</dt>
            <dd>{rowCount}</dd>
          </div>
          <div>
            <dt>Maximum columns</dt>
            <dd>{columnCount}</dd>
          </div>
          <div>
            <dt>Anchor affected</dt>
            <dd>{template.affectsPlayer ? "Yes" : "No"}</dd>
          </div>
        </dl>
      </header>

      <div className="detail-grid">
        <section
          className="detail-card template-preview-card"
          aria-labelledby="template-pattern-heading"
        >
          <h2 id="template-pattern-heading" className="section-title-sm">
            Affected area
          </h2>
          {template.rows.length > 0 ? (
            <>
              <div
                className="template-preview"
                role="img"
                aria-label={previewLabel}
              >
                <div className="template-pattern" aria-hidden="true">
                  {template.rows.map((row, rowIndex) => (
                    <div className="template-row" key={`${row}:${rowIndex}`}>
                      {[...row].map((cell, columnIndex) => (
                        <span
                          className={[
                            "template-cell",
                            cell === "." ? "template-cell-empty" : "",
                            cell === "@" ? "template-cell-affected" : "",
                            cell === "#" ? "template-cell-anchor" : "",
                            cell === "#" && template.affectsPlayer
                              ? "template-cell-anchor-affected"
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          key={`${columnIndex}:${cell}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <ul className="template-legend" aria-label="Pattern legend">
                <li>
                  <span
                    className="template-cell template-cell-affected"
                    aria-hidden="true"
                  />
                  Affected tile
                </li>
                <li>
                  <span
                    className={`template-cell template-cell-anchor${
                      template.affectsPlayer
                        ? " template-cell-anchor-affected"
                        : ""
                    }`}
                    aria-hidden="true"
                  />
                  Anchor ({template.affectsPlayer ? "affected" : "not affected"}
                  )
                </li>
                <li>
                  <span
                    className="template-cell template-cell-empty"
                    aria-hidden="true"
                  />
                  Unaffected tile
                </li>
              </ul>
            </>
          ) : (
            <div className="empty-state" role="status">
              This template does not contain any normalized rows.
            </div>
          )}
        </section>

        <section
          className="detail-card"
          aria-labelledby="template-facts-heading"
        >
          <h2 id="template-facts-heading" className="section-title-sm">
            Pattern summary
          </h2>
          <dl className="provenance-list">
            <div>
              <dt>Affected tiles</dt>
              <dd>{affectedTileCount}</dd>
            </div>
            <div>
              <dt>Anchor meaning</dt>
              <dd>Player or selected target</dd>
            </div>
            <div>
              <dt>Row widths</dt>
              <dd>
                {template.rows.map((row) => row.length).join(", ") || "None"}
              </dd>
            </div>
          </dl>
        </section>

        <ProvenanceCard
          artifact={artifact}
          entity={template}
          headingId="template-source-heading"
        />
      </div>
    </article>
  );
}
