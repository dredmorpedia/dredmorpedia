import { ChevronDown, ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

export function ExpandableCatalogueList({
  className,
  initialCount,
  items,
  noun,
}: {
  className: string;
  initialCount: number;
  items: readonly ReactNode[];
  noun: string;
}) {
  const visibleItems = items.slice(0, initialCount);
  const additionalItems = items.slice(initialCount);

  return (
    <>
      <ul className={className}>{visibleItems}</ul>
      {additionalItems.length > 0 ? (
        <details className="catalogue-overflow-details">
          <summary>
            <span className="catalogue-overflow-show">
              <ChevronDown aria-hidden="true" size={14} />
              Show {additionalItems.length} more {noun}
              {additionalItems.length === 1 ? "" : "s"}
            </span>
            <span className="catalogue-overflow-hide">
              <ChevronUp aria-hidden="true" size={14} />
              Hide additional {noun}s
            </span>
          </summary>
          <ul className={className}>{additionalItems}</ul>
        </details>
      ) : null}
    </>
  );
}
