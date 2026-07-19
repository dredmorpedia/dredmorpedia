import path from "node:path";

import { describe, expect, it } from "vitest";

import { parseXml, resolveWithin } from "../src/index";

describe("input safety", () => {
  it("rejects path traversal before filesystem access", () => {
    expect(() =>
      resolveWithin(path.resolve("fixtures/synthetic"), "../legacy.xml"),
    ).toThrow(/Unsafe relative path/);
  });

  it("rejects XML document type declarations", () => {
    const result = parseXml({
      xml: '<!DOCTYPE items [<!ENTITY unsafe SYSTEM "file:///secret">]><items />',
      sourceId: "test",
      file: "test.xml",
    });

    expect(result).toMatchObject({
      ok: false,
      diagnostic: { code: "disallowed_doctype", severity: "error" },
    });
  });
});
