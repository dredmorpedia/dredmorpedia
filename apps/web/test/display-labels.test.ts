import { describe, expect, it } from "vitest";

import { titleCase } from "../src/lib/display-labels";

describe("display labels", () => {
  it("converts source-token separators to spaces", () => {
    expect(titleCase("melee-power")).toBe("Melee Power");
    expect(titleCase("spell_effect")).toBe("Spell Effect");
    expect(titleCase("monster type")).toBe("Monster Type");
  });

  it("does not emit empty words for repeated or surrounding separators", () => {
    expect(titleCase("__monster--type__")).toBe("Monster Type");
    expect(titleCase("  monster\t\ntype  ")).toBe("Monster Type");
    expect(titleCase("")).toBe("");
  });

  it("preserves source casing after the first character", () => {
    expect(titleCase("XML_spell")).toBe("XML Spell");
  });
});
