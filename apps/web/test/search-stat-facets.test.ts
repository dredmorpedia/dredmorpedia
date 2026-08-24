import type { SearchDocument, Stat } from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import { createSearchStatFilterOptions } from "../src/lib/search-stat-facets";

function stat(id: string, name: string, modifier: Stat["modifier"]): Stat {
  const provenance = {
    sourceId: "synthetic-reference",
    file: "reference/statDB.xml",
    line: 1,
    column: 1,
    originalName: name,
  };
  return {
    id,
    kind: "stat",
    canonicalKey: name.toLocaleLowerCase("en"),
    slug: name.toLocaleLowerCase("en").replaceAll(" ", "-"),
    slugAliases: [],
    name,
    description: "",
    group: modifier?.kind ?? "other",
    iconAssetId: null,
    modifier,
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
  };
}

function document(id: string, statKeys: string[]): SearchDocument {
  return {
    id,
    kind: "ability",
    name: id,
    aliases: [],
    summary: "",
    sourceId: "synthetic-base",
    category: null,
    statKeys,
    craftingSkillLevel: null,
    url: `/abilities/${id}`,
    text: id,
  };
}

describe("cross-entity search stat facets", () => {
  it("offers only used definitions and collapses their stable aliases", () => {
    const meleePower = stat("stat:melee power", "Melee Power", {
      kind: "secondary",
      sourceKey: "2",
    });
    const unused = stat("stat:unused", "Unused Stat", {
      kind: "primary",
      sourceKey: "5",
    });

    expect(
      createSearchStatFilterOptions(
        [meleePower, unused],
        [
          document("measured-strike", ["melee power", "modifier:secondary:2"]),
          document("unmapped-ward", ["modifier:resistance:toxic"]),
        ],
      ),
    ).toEqual([
      {
        value: "melee power",
        label: "Melee Power",
        aliases: ["melee power", "modifier:secondary:2", "stat:melee power"],
      },
      {
        value: "modifier:resistance:toxic",
        label: "Toxic resistance",
        aliases: ["modifier:resistance:toxic"],
      },
    ]);
  });
});
