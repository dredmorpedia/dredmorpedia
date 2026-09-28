import { afterEach, describe, expect, it } from "vitest";

import { staticDataUrl } from "../src/lib/static-data-url";

const originalBasePath = process.env.NEXT_PUBLIC_BASE_PATH;

afterEach(() => {
  if (originalBasePath === undefined) {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
  } else {
    process.env.NEXT_PUBLIC_BASE_PATH = originalBasePath;
  }
});

describe("static data URLs", () => {
  it("uses root paths when the host has no subpath", () => {
    delete process.env.NEXT_PUBLIC_BASE_PATH;
    expect(staticDataUrl("/search-data.json")).toBe("/search-data.json");
    process.env.NEXT_PUBLIC_BASE_PATH = "/";
    expect(staticDataUrl("/catalogue-previews.json")).toBe(
      "/catalogue-previews.json",
    );
  });

  it("normalizes the configured hosting prefix", () => {
    process.env.NEXT_PUBLIC_BASE_PATH = "dredmorpedia/";
    expect(staticDataUrl("/search-data.json")).toBe(
      "/dredmorpedia/search-data.json",
    );
    process.env.NEXT_PUBLIC_BASE_PATH = "/dredmorpedia";
    expect(staticDataUrl("/item-previews/test/summary.json")).toBe(
      "/dredmorpedia/item-previews/test/summary.json",
    );
  });
});
