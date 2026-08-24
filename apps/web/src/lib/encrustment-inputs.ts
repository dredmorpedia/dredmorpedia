import type { ItemReference } from "@dredmorpedia/domain";

export function aggregateEncrustmentInputs(
  inputs: readonly ItemReference[],
): ItemReference[] {
  const aggregated: ItemReference[] = [];
  const indexByKey = new Map<string, number>();
  for (const input of inputs) {
    const key = `${input.itemId ?? "unresolved"}:${input.itemKey}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      indexByKey.set(key, aggregated.length);
      aggregated.push({ ...input });
    } else {
      const existing = aggregated[existingIndex]!;
      aggregated[existingIndex] = {
        ...existing,
        amount: existing.amount + input.amount,
      };
    }
  }
  return aggregated;
}
