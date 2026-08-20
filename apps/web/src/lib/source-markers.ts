import type { SourceSummary } from "@dredmorpedia/domain";

export interface SourceMarker {
  fullLabel: string;
  shortLabel: string;
}

const officialExpansionLabels = new Map([
  ["official-expansion-1", "RotDG"],
  ["official-expansion-2", "YHTNTEP"],
  ["official-expansion-3", "CotW"],
]);

function initials(label: string): string {
  const words = label.match(/[\p{L}\p{N}]+/gu) ?? [];
  const shortLabel = words
    .map((word) => word[0])
    .join("")
    .toLocaleUpperCase("en");
  return shortLabel.slice(0, 7) || "Extra";
}

export function sourceMarker(
  source: Pick<SourceSummary, "id" | "kind" | "label"> | undefined,
): SourceMarker | null {
  if (!source || source.kind === "base" || source.kind === "reference") {
    return null;
  }
  return {
    fullLabel: source.label,
    shortLabel:
      officialExpansionLabels.get(source.id) ??
      (source.kind === "mod" ? "Mod" : initials(source.label)),
  };
}
