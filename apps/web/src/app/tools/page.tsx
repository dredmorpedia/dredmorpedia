import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Open Dredmorpedia's item comparison and dependency-planning tools.",
};

const tools = [
  {
    href: "/tools/item-compare/",
    name: "Item comparison",
    description:
      "Compare up to three items through exact source facts and a shareable URL.",
  },
  {
    href: "/tools/crafting-graph/",
    name: "Crafting dependency planner",
    description:
      "Expand recipe yields into ordered steps and a combined base-ingredient list.",
  },
  {
    href: "/tools/encrusting-plan/",
    name: "Encrustment ingredient planner",
    description:
      "Combine encrustment ingredients and their crafting dependencies into one shopping list.",
  },
] as const;

export default function ToolsPage() {
  return (
    <div className="page-stack">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Tools</span>
      </nav>
      <header>
        <p className="eyebrow">Player utilities</p>
        <h1 className="hero-title">Tools for planning a build.</h1>
        <p className="hero-copy">
          These focused utilities extend the encyclopedia. The core game records
          remain available through the direct navigation above.
        </p>
      </header>
      <section aria-labelledby="tools-heading">
        <h2 id="tools-heading" className="section-title">
          Available tools
        </h2>
        <ul className="browse-kind-grid mt-5">
          {tools.map((tool) => (
            <li key={tool.href} className="browse-kind-card">
              <div>
                <h3 className="text-xl font-semibold">
                  <Link className="entity-link" href={tool.href}>
                    {tool.name}
                  </Link>
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {tool.description}
                </p>
              </div>
              <p className="result-count">Interactive tool</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
