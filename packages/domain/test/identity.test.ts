import { describe, expect, it } from "vitest";

import { canonicalKey, entityId, slugify } from "../src/index";

describe("stable identity", () => {
  it("normalizes canonical keys without coupling them to routes", () => {
    expect(canonicalKey("  Clockwork   Blade ")).toBe("clockwork blade");
    expect(entityId("item", "Clockwork Blade")).toBe("item:clockwork blade");
  });

  it("creates deterministic URL-safe slugs", () => {
    expect(slugify("Clockwork Blade +1")).toBe("clockwork-blade-1");
    expect(slugify("Żółć")).toBe("zo-c");
  });
});
