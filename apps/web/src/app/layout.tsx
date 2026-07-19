import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Dredmorpedia Architecture Spike",
    template: "%s | Dredmorpedia",
  },
  description:
    "A synthetic-data architecture spike for the modern Dredmorpedia encyclopedia.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div className="app-root">
          <header className="site-header">
            <Link href="/" className="brand" aria-label="Dredmorpedia home">
              <span aria-hidden="true" className="brand-mark">
                D
              </span>
              <span>
                <span className="block text-base font-bold tracking-wide">
                  Dredmorpedia
                </span>
                <span className="block text-xs text-muted-foreground">
                  Architecture spike
                </span>
              </span>
            </Link>
            <span className="status-badge">Synthetic data only</span>
          </header>
          <main id="main-content" className="site-main">
            {children}
          </main>
          <footer className="site-footer">
            This preview contains independently authored fixtures and no
            official game data.
          </footer>
        </div>
      </body>
    </html>
  );
}
