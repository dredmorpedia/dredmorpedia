import { Hammer } from "lucide-react";

export function CatalogueToolMarker({
  iconUrl,
  label,
  relationLabel,
}: {
  iconUrl: string | null;
  label: string;
  relationLabel: string;
}) {
  return (
    <span
      aria-label={`${relationLabel}: ${label}`}
      className="recipe-summary-tool-marker"
      role="img"
      title={label}
    >
      {iconUrl ? (
        <>
          {/* The labelled wrapper names this decorative toolkit image. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="" height={40} src={iconUrl} width={40} />
        </>
      ) : (
        <Hammer aria-hidden="true" size={22} strokeWidth={1.8} />
      )}
    </span>
  );
}
