interface CatalogueContextBarProps {
  headingId: string;
  iconTitle: string;
  iconUrl: string | null;
  kindLabel: string;
  label: string;
}

export function CatalogueContextBar({
  headingId,
  iconTitle,
  iconUrl,
  kindLabel,
  label,
}: CatalogueContextBarProps) {
  return (
    <header className="catalogue-context-bar">
      <span aria-hidden="true" className="catalogue-context-art">
        {iconUrl ? (
          // The adjacent heading names the active group; the title identifies its art.
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="" height={40} src={iconUrl} title={iconTitle} width={40} />
        ) : (
          <span className="catalogue-art-placeholder">?</span>
        )}
      </span>
      <span className="catalogue-context-copy">
        <span className="catalogue-context-kind">{kindLabel}</span>
        <h2 id={headingId}>{label}</h2>
      </span>
    </header>
  );
}
