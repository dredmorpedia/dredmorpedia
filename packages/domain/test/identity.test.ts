import { describe, expect, it } from "vitest";

import {
  allocateEntityRoutes,
  canonicalKey,
  entityId,
  slugify,
  type Item,
} from "../src/index";

function routeItem(name: string, originalId: string): Item {
  const provenance = {
    sourceId: "synthetic-routes",
    file: "synthetic/itemDB.xml",
    line: 2,
    column: 3,
    originalName: name,
    originalId,
  };
  return {
    id: entityId("item", name),
    kind: "item",
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description: "Synthetic route fixture.",
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
    category: "wand",
    price: null,
    iconPath: null,
    stats: [],
  };
}

describe("stable identity", () => {
  it("normalizes canonical keys without coupling them to routes", () => {
    expect(canonicalKey("  Clockwork   Blade ")).toBe("clockwork blade");
    expect(entityId("item", "Clockwork Blade")).toBe("item:clockwork blade");
  });

  it("creates deterministic URL-safe slugs", () => {
    expect(slugify("Clockwork Blade +1")).toBe("clockwork-blade-1");
    expect(slugify("Żółć")).toBe("zo-c");
  });

  it("allocates deterministic unique routes and source-ID aliases", () => {
    const symbolic = routeItem("Training Wand +1", "training-wand-plus");
    const numeric = routeItem("Training Wand 1", "training-wand-one");

    const forward = allocateEntityRoutes([symbolic, numeric]);
    const reverse = allocateEntityRoutes([numeric, symbolic]);

    expect(forward).toEqual(reverse);
    expect(new Set(forward.entities.map((entity) => entity.slug)).size).toBe(2);
    expect(
      forward.entities.some((entity) => entity.slug === "training-wand-1"),
    ).toBe(true);
    expect(
      forward.entities.some((entity) =>
        /^training-wand-1-[a-z0-9]{7}$/.test(entity.slug),
      ),
    ).toBe(true);
    expect(
      forward.entities.flatMap((entity) => entity.slugAliases).sort(),
    ).toEqual(["training-wand-one", "training-wand-plus"]);
    expect(forward.slugCollisions).toHaveLength(1);
  });

  it("omits aliases claimed by another entity or canonical route", () => {
    const first = routeItem("First Wand", "second-wand");
    const second = routeItem("Second Wand", "second-wand");
    const result = allocateEntityRoutes([first, second]);

    expect(result.entities.flatMap((entity) => entity.slugAliases)).toEqual([]);
    expect(result.aliasConflicts).toHaveLength(1);
    expect(result.aliasConflicts[0]?.conflictingEntityIds).toEqual([
      "item:first wand",
      "item:second wand",
    ]);
  });
});
