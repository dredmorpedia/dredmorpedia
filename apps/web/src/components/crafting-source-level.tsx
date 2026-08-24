import { StatPresentationLink } from "@/components/stat-presentation-link";
import type { StatLinkPresentation } from "@/lib/stat-presentation-types";

export function CraftingSourceLevel({
  level,
  stats,
}: {
  level: number;
  stats: readonly StatLinkPresentation[];
}) {
  if (level <= 0) {
    return <span className="crafting-source-level">No requirement</span>;
  }

  if (stats.length === 0) {
    return (
      <span className="crafting-source-level">
        Source level <strong>{level}</strong>
      </span>
    );
  }

  return (
    <span className="crafting-source-level">
      {stats.map((stat) => (
        <span
          className="crafting-source-stat"
          key={stat.slug}
          title={`${stat.label}: source level ${level}`}
        >
          <StatPresentationLink display="icon" presentation={stat} />
          <span className="sr-only">source level</span>
          <strong>{level}</strong>
        </span>
      ))}
    </span>
  );
}
