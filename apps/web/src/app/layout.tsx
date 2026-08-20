import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { loadArtifact } from "@/lib/artifact";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dredmorpedia",
    template: "%s | Dredmorpedia",
  },
  description:
    "A fast, accessible encyclopedia and toolset for Dungeons of Dredmor.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const artifact = loadArtifact();
  const syntheticDataset = artifact.datasetId.startsWith("synthetic-");

  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="app-root">
          <header className="site-header">
            <div className="header-top-row">
              <Link href="/" className="brand" aria-label="Dredmorpedia home">
                <span aria-hidden="true" className="brand-mark">
                  D
                </span>
                <span>
                  <span className="block text-base font-bold tracking-wide">
                    Dredmorpedia
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Local encyclopedia
                  </span>
                </span>
              </Link>
              <div className="header-actions">
                <nav aria-label="Utility navigation" className="utility-nav">
                  <Link href="/search">Search</Link>
                  <Link href="/tools/">Tools</Link>
                  <Link href="/dataset/">Dataset</Link>
                </nav>
                <span className="status-badge">
                  {syntheticDataset ? "Synthetic dataset" : "Local dataset"}
                </span>
              </div>
            </div>
            <nav aria-label="Primary navigation" className="primary-nav">
              <Link href="/items/">Items</Link>
              <Link href="/crafts/">Crafts</Link>
              <Link href="/browse/encrustments/1/">Encrusts</Link>
              <Link href="/browse/skills/1/">Skills</Link>
              <Link href="/browse/spells/1/">Spells</Link>
              <Link href="/browse/monsters/1/">Monsters</Link>
              <Link href="/browse/stats/1/">Stats</Link>
              <Link href="/browse/templates/1/">Templates</Link>
              <Link href="/meta/required-armour-by-monster/">Meta</Link>
            </nav>
          </header>
          <main id="main-content" className="site-main" tabIndex={-1}>
            {children}
          </main>
          <footer className="site-footer">
            {syntheticDataset
              ? "This preview contains independently authored fixtures and no official game data."
              : "This local preview uses generated data that is not approved for publication."}
          </footer>
        </div>
      </body>
    </html>
  );
}
