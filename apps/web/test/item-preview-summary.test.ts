import { describe, expect, it, vi } from "vitest";

import { loadArtifact, loadArtifactSha256 } from "../src/lib/artifact";
import { itemPreviewPayloadSchema } from "../src/lib/item-preview-schema";
import { createItemPreviewData } from "../src/lib/item-preview-summary";

vi.mock("../src/lib/presented-assets", () => ({
  itemIconUrl: () => null,
  spellIconUrl: () => null,
  uiIconUrl: () => null,
}));

describe("item preview summaries", () => {
  it("preserves all modifiers, artifact distinction, and declared wand ranges", () => {
    const artifact = loadArtifact();
    const item = structuredClone(
      artifact.entities.items.find(({ name }) => name === "Clockwork Blade")!,
    );
    item.quality = 11;
    item.artifacts = [{ quality: 3 }];
    item.chargeRanges = [{ minimum: 2, maximum: 4 }];
    const summary = createItemPreviewData(item, artifact, loadArtifactSha256());
    expect(summary.facts).toEqual(
      expect.arrayContaining([
        { label: "Quality", value: "11" },
        { label: "Artifact", value: "Quality 3" },
        { label: "Wand", value: "2–4 charges" },
      ]),
    );
    expect(summary.modifiers).toHaveLength(
      item.stats.length + item.modifiers.length,
    );
    expect(summary.modifiers.length).toBeGreaterThan(6);
    expect(
      itemPreviewPayloadSchema.safeParse({ schemaVersion: 1, item: summary })
        .success,
    ).toBe(true);
    expect(summary).not.toHaveProperty("iconPath");
    expect(summary).not.toHaveProperty("provenance");
  });

  it("bounds prose and effects with explicit overflow while keeping trigger qualifiers", () => {
    const artifact = loadArtifact();
    const item = structuredClone(
      artifact.entities.items.find(({ name }) => name === "Training Cuirass")!,
    );
    item.description = "x".repeat(400);
    const summary = createItemPreviewData(item, artifact, loadArtifactSha256());
    expect(summary.description).toHaveLength(240);
    expect(summary.effects).toHaveLength(2);
    expect(summary.remainingEffects).toBe(item.triggers.length - 2);
    expect(summary.effects[0]!.trigger).toMatchObject({
      chance: 25,
      monsterTaxonomy: "Animal",
      kind: "melee-target",
    });
    expect(summary.modifiers).toContainEqual({
      group: "random",
      label: "Random Stats",
      stat: null,
      value: "1",
    });
  });

  it("keeps engine references visibly separate and does not invent quality", () => {
    const artifact = structuredClone(loadArtifact());
    const item = artifact.entities.items.find(
      ({ name }) => name === "Brass Ingot",
    )!;
    artifact.sources.find(({ id }) => id === item.provenance.sourceId)!.kind =
      "reference";
    item.price = null;
    const summary = createItemPreviewData(item, artifact, loadArtifactSha256());
    expect(summary.engineReference).toBe(true);
    expect(summary.facts).toEqual([
      { label: "Value", value: "Not declared" },
      { label: "Quality", value: "Not declared" },
    ]);
  });
});
