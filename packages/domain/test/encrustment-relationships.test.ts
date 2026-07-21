import { describe, expect, it } from "vitest";

import { itemEncrustmentRelationships, type Encrustment } from "../src/index";

function encrustment(name: string, inputItemIds: string[]): Encrustment {
  const provenance = {
    sourceId: "synthetic-base",
    file: "fixtures/synthetic/base/encrustDB.xml",
    line: 2,
    column: 3,
    originalName: name,
  };
  return {
    id: `encrustment:${name.toLocaleLowerCase("en")}`,
    kind: "encrustment",
    canonicalKey: name.toLocaleLowerCase("en"),
    slug: name.toLocaleLowerCase("en").replaceAll(" ", "-"),
    slugAliases: [],
    name,
    description: "Synthetic relationship fixture.",
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
    tool: "smithing",
    hidden: false,
    skillLevel: 2,
    inputs: inputItemIds.map((itemId) => ({
      itemKey: itemId.slice("item:".length),
      itemName: itemId.slice("item:".length),
      itemId,
      amount: 1,
    })),
    slots: ["weapon"],
    instability: 5,
  };
}

describe("item encrustment relationships", () => {
  it("finds and deterministically sorts encrustments using an item", () => {
    const first = encrustment("Bright Polish", ["item:brass ingot"]);
    const second = encrustment("Adamant Polish", [
      "item:brass ingot",
      "item:brass ingot",
    ]);
    const unrelated = encrustment("Cloth Polish", ["item:cloth scrap"]);

    expect(
      itemEncrustmentRelationships(
        [first, unrelated, second],
        "item:brass ingot",
      ),
    ).toMatchObject([
      { encrustment: { name: "Adamant Polish" }, inputAmount: 2 },
      { encrustment: { name: "Bright Polish" }, inputAmount: 1 },
    ]);
  });
});
