import { describe, expect, it } from "vitest";

import { applyMonsterInheritance, type Monster } from "../src/index";

function monster(name: string, inheritsKey?: string): Monster {
  const canonicalKey = name.toLocaleLowerCase("en");
  const provenance = {
    sourceId: "synthetic-base",
    file: "base/monDB.xml",
    line: 1,
    column: 1,
    originalName: name,
  };

  return {
    id: `monster:${canonicalKey}`,
    kind: "monster",
    canonicalKey,
    slug: canonicalKey.replaceAll(" ", "-"),
    name,
    description: "",
    taxonomy: inheritsKey ? "" : "Animal",
    level: 1,
    iconPath: inheritsKey ? null : "assets/synthetic.svg",
    ...(inheritsKey ? { inheritsKey, inheritsName: "Parent" } : {}),
    provenance,
    variants: [provenance],
    appliedOverrides: [],
    diagnosticIds: [],
  };
}

describe("monster inheritance", () => {
  it("inherits stable fields through the domain layer", () => {
    const parent = monster("Parent");
    const child = monster("Child", parent.canonicalKey);
    const result = applyMonsterInheritance([child, parent]);
    const resolvedChild = result.monsters.find(
      (entry) => entry.name === "Child",
    );

    expect(result.issues).toEqual([]);
    expect(resolvedChild?.taxonomy).toBe("Animal");
    expect(resolvedChild?.iconPath).toBe("assets/synthetic.svg");
    expect(resolvedChild?.inheritsId).toBe(parent.id);
  });
});
