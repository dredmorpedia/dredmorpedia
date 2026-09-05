import { describe, expect, it } from "vitest";

import { catalogueReferenceAccessibleLabel } from "../src/lib/catalogue-reference-labels";
import { encrustmentPreviewAccessibleName } from "../src/lib/catalogue-preview-names";

describe("encrustment summary card", () => {
  it("includes non-unit ingredient quantities in accessible labels", () => {
    expect(
      catalogueReferenceAccessibleLabel({
        amount: 4,
        itemName: "Plastic Ingot",
      }),
    ).toBe("4 × Plastic Ingot");
    expect(
      catalogueReferenceAccessibleLabel({ amount: 1, itemName: "Lederhosen" }),
    ).toBe("Lederhosen");
  });

  it("aggregates repeated inputs in a complete preview name", () => {
    expect(
      encrustmentPreviewAccessibleName(
        {
          name: "Black Pearl Inlay",
          inputs: [
            {
              amount: 1,
              itemId: "item:black-pearl",
              itemKey: "black pearl",
              itemName: "Black Pearl",
            },
            {
              amount: 1,
              itemId: "item:black-pearl",
              itemKey: "black pearl",
              itemName: "Black Pearl",
            },
          ],
          slots: ["chest", "hands"],
        } as Parameters<typeof encrustmentPreviewAccessibleName>[0],
        new Map(),
      ),
    ).toBe("Black Pearl Inlay: 2 × Black Pearl; applies to Chest, Hands");
  });
});
