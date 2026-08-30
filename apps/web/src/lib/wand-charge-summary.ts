import type { ItemChargeRange } from "@dredmorpedia/domain";

export function wandChargeRangeSummary({
  minimum,
  maximum,
}: ItemChargeRange): string {
  if (minimum === null && maximum === null) {
    return "Unavailable";
  }
  if (minimum !== null && minimum === maximum) {
    return `${minimum} ${minimum === 1 ? "charge" : "charges"}`;
  }
  return `${minimum ?? "?"}–${maximum ?? "?"} charges`;
}

export function wandChargeRangesSummary(
  ranges: readonly ItemChargeRange[],
): string {
  return ranges.map(wandChargeRangeSummary).join("; ");
}
