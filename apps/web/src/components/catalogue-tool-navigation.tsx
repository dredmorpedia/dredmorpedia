"use client";

import Link from "next/link";
import { ArrowUp } from "lucide-react";

import type { CatalogueLayout } from "@/components/catalogue-display-controls";
import { useFloatingCatalogueTab } from "@/components/use-floating-catalogue-tab";

export interface CatalogueToolNavigationEntry {
  count: number;
  href: string;
  iconUrl: string | null;
  label: string;
  tag: string;
}

export function CatalogueToolNavigation({
  activeToolTag,
  anchorId,
  ariaLabel,
  entries,
  itemNounPlural,
  itemNounSingular,
  layout,
  returnLabel,
}: {
  activeToolTag: string;
  anchorId: string;
  ariaLabel: string;
  entries: readonly CatalogueToolNavigationEntry[];
  itemNounPlural: string;
  itemNounSingular: string;
  layout: CatalogueLayout;
  returnLabel: string;
}) {
  const { floating, sentinelRef } = useFloatingCatalogueTab();

  return (
    <>
      <nav
        aria-label={ariaLabel}
        className="craft-tool-nav"
        data-layout={layout}
        id={anchorId}
      >
        <ul className="craft-tool-list">
          {entries.map((candidate) => {
            const active = candidate.tag === activeToolTag;
            const floatingActive = active && floating;
            return (
              <li
                className={active ? "catalogue-active-tab-slot" : undefined}
                key={candidate.tag}
              >
                <Link
                  aria-current={active ? "page" : undefined}
                  aria-label={
                    floatingActive
                      ? `Back to ${returnLabel}; current tool: ${candidate.label}`
                      : `${candidate.label}, ${candidate.count} ${
                          candidate.count === 1
                            ? itemNounSingular
                            : itemNounPlural
                        }`
                  }
                  data-floating={floatingActive ? "" : undefined}
                  href={floatingActive ? `#${anchorId}` : candidate.href}
                  title={
                    floatingActive
                      ? `Back to ${returnLabel} — ${candidate.label}`
                      : candidate.label
                  }
                >
                  <span aria-hidden="true" className="catalogue-floating-arrow">
                    <ArrowUp size={16} strokeWidth={2.2} />
                  </span>
                  {candidate.iconUrl ? (
                    // The visible detailed label and link title identify the toolkit.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      height={48}
                      src={candidate.iconUrl}
                      title={candidate.label}
                      width={48}
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="catalogue-art-placeholder"
                    >
                      ?
                    </span>
                  )}
                  <span className="craft-tool-label">{candidate.label}</span>
                  <small>{candidate.count}</small>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <span
        aria-hidden="true"
        className="catalogue-floating-sentinel"
        ref={sentinelRef}
      />
    </>
  );
}
