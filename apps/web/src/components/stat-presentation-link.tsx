import Link from "next/link";

import type { StatLinkPresentation } from "@/lib/stat-presentation-types";

type StatLinkDisplay = "icon" | "icon-label" | "label";

export function StatPresentationLink({
  display = "label",
  label,
  presentation,
}: {
  display?: StatLinkDisplay;
  label?: string | undefined;
  presentation: StatLinkPresentation;
}) {
  const iconOnly = display === "icon" && presentation.iconUrl !== null;
  return (
    <Link
      aria-label={iconOnly ? presentation.label : undefined}
      className="entity-link stat-definition-link"
      href={`/stats/${presentation.slug}`}
      title={presentation.label}
    >
      {presentation.iconUrl ? (
        // Keep the interface art at its native size, matching the game and legacy UI.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          className="stat-icon"
          height={16}
          src={presentation.iconUrl}
          title={presentation.label}
          width={16}
        />
      ) : null}
      <span className={iconOnly ? "sr-only" : undefined}>
        {label ?? presentation.label}
      </span>
    </Link>
  );
}
