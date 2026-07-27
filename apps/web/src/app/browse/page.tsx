import type { Metadata } from "next";
import Link from "next/link";

import { loadSearchArtifact } from "@/lib/artifact";
import { browseKinds, browsePagePath } from "@/lib/browse";

export const metadata: Metadata = {
  title: "Browse",
  description:
    "Browse every record type in the active Dredmorpedia dataset through static catalogue pages.",
};

export default function BrowsePage() {
  const search = loadSearchArtifact();
  const counts = new Map(
    browseKinds.map((definition) => [
      definition.kind,
      search.documents.filter((document) => document.kind === definition.kind)
        .length,
    ]),
  );

  return (
    <div className="page-stack">
      <header>
        <p className="eyebrow">Dataset directory</p>
        <h1 className="hero-title">Browse every corner of Dredmorpedia.</h1>
        <p className="hero-copy">
          These server-rendered catalogues link to every record in the active
          dataset. They remain useful without JavaScript and keep each page
          bounded to avoid the legacy application&apos;s all-record document.
        </p>
      </header>

      <section aria-labelledby="record-types-heading">
        <h2 id="record-types-heading" className="section-title">
          Record types
        </h2>
        <ul className="browse-kind-grid mt-5">
          {browseKinds.map((definition) => {
            const count = counts.get(definition.kind) ?? 0;
            return (
              <li key={definition.kind} className="browse-kind-card">
                <div>
                  <h3 className="text-xl font-semibold">
                    <Link
                      className="entity-link"
                      href={browsePagePath(definition.kind, 1)}
                    >
                      {definition.label}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {definition.description}
                  </p>
                </div>
                <p className="result-count">
                  {new Intl.NumberFormat("en").format(count)}{" "}
                  {count === 1 ? "record" : "records"}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
