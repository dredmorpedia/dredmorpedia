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
    quality: 0,
    iconPath: null,
    stats: [],
    triggers: [],
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

  it("pins registered canonical routes and historical aliases", () => {
    const symbolic = routeItem("Training Wand +1", "training-wand-plus");
    const numeric = routeItem("Training Wand 1", "training-wand-one");
    const reservation = {
      entityId: numeric.id,
      canonicalSlug: "training-wand-1",
      aliases: ["old-training-wand"],
    };

    const forward = allocateEntityRoutes([symbolic, numeric], [reservation]);
    const reverse = allocateEntityRoutes([numeric, symbolic], [reservation]);

    expect(forward).toEqual(reverse);
    expect(
      forward.entities.find((entity) => entity.id === numeric.id),
    ).toMatchObject({
      slug: "training-wand-1",
      slugAliases: ["old-training-wand", "training-wand-one"],
    });
    expect(
      forward.entities.find((entity) => entity.id === symbolic.id)?.slug,
    ).toMatch(/^training-wand-1-[a-z0-9]{7}$/);
  });

  it("keeps a registered alias when an automatic source alias conflicts", () => {
    const first = routeItem("First Wand", "reserved-alias");
    const second = routeItem("Second Wand", "second-wand-id");
    const result = allocateEntityRoutes(
      [first, second],
      [
        {
          entityId: second.id,
          canonicalSlug: "second-wand",
          aliases: ["reserved-alias"],
        },
      ],
    );

    expect(
      result.entities.find((entity) => entity.id === second.id)?.slugAliases,
    ).toEqual(["reserved-alias", "second-wand-id"]);
    expect(
      result.entities.find((entity) => entity.id === first.id)?.slugAliases,
    ).toEqual([]);
    expect(result.aliasConflicts).toMatchObject([
      {
        entityId: first.id,
        alias: "reserved-alias",
        conflictingEntityIds: [first.id, second.id],
      },
    ]);
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
