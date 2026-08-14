import type { EntityKind, SearchDocument } from "@dredmorpedia/domain";
import { describe, expect, it } from "vitest";

import {
  browseKindFor,
  browseKindForSegment,
  browseKinds,
  browsePagePath,
  browsePageSize,
  paginateBrowseDocuments,
} from "../src/lib/browse";

function searchDocument(
  id: number,
  kind: EntityKind = "spell",
): SearchDocument {
  return {
    id: `${kind}:${id}`,
    kind,
    name: `Record ${id}`,
    aliases: [],
    summary: "",
    sourceId: "synthetic",
    category: null,
    statKeys: [],
    craftingSkillLevel: null,
    url: `/${kind}/${id}`,
    text: `record ${id}`,
  };
}

describe("static browse pagination", () => {
  it("defines a catalogue route for every entity kind", () => {
    expect(browseKinds).toHaveLength(9);
    expect(browseKindFor("template").segment).toBe("templates");
    expect(browseKindForSegment("encrustments")?.kind).toBe("encrustment");
    expect(browseKindForSegment("unknown")).toBeUndefined();
    expect(browsePagePath("monster", 3)).toBe("/browse/monsters/3");
  });

  it("keeps each page bounded and reports deterministic totals", () => {
    const documents = [
      ...Array.from({ length: browsePageSize * 2 + 5 }, (_, index) =>
        searchDocument(index),
      ),
      searchDocument(999, "item"),
    ];

    const secondPage = paginateBrowseDocuments(documents, "spell", 2);
    expect(secondPage).toMatchObject({
      page: 2,
      pageCount: 3,
      total: browsePageSize * 2 + 5,
    });
    expect(secondPage?.documents).toHaveLength(browsePageSize);
    expect(secondPage?.documents[0]?.id).toBe(`spell:${browsePageSize}`);
    expect(secondPage?.documents.at(-1)?.id).toBe(
      `spell:${browsePageSize * 2 - 1}`,
    );
  });

  it("keeps an empty kind discoverable and rejects invalid pages", () => {
    expect(paginateBrowseDocuments([], "recipe", 1)).toEqual({
      documents: [],
      page: 1,
      pageCount: 1,
      total: 0,
    });
    expect(paginateBrowseDocuments([], "recipe", 0)).toBeUndefined();
    expect(paginateBrowseDocuments([], "recipe", 2)).toBeUndefined();
    expect(paginateBrowseDocuments([], "recipe", Number.NaN)).toBeUndefined();
  });
});
