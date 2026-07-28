import { compareCodeUnits } from "./ordering";
import type { Encrustment } from "./types";

export interface ItemEncrustmentRelationship {
  encrustment: Encrustment;
  inputAmount: number;
}

export function itemEncrustmentRelationships(
  encrustments: readonly Encrustment[],
  itemId: string,
): ItemEncrustmentRelationship[] {
  return encrustments
    .map((encrustment) => ({
      encrustment,
      inputAmount: encrustment.inputs.reduce(
        (total, reference) =>
          reference.itemId === itemId ? total + reference.amount : total,
        0,
      ),
    }))
    .filter((relationship) => relationship.inputAmount > 0)
    .sort(
      (left, right) =>
        compareCodeUnits(
          left.encrustment.canonicalKey,
          right.encrustment.canonicalKey,
        ) || compareCodeUnits(left.encrustment.id, right.encrustment.id),
    );
}
