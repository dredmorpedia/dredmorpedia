import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  loadManifest,
  parsePatchDefinition,
  parseRouteRegistry,
  parseXml,
  resolveWithin,
} from "../src/index";

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

  it("rejects patch targets that are not canonical keys", () => {
    expect(() =>
      parsePatchDefinition(
        JSON.stringify({
          schemaVersion: 1,
          id: "invalid-target",
          reason: "Synthetic invalid patch target.",
          appliesTo: {
            datasetId: "synthetic",
            datasetVersion: "1.0.0",
            sourceId: "synthetic-base",
            sourceVersion: "1.0.0",
          },
          operations: [
            {
              entityKind: "item",
              canonicalKey: "Clockwork Blade",
              field: "price",
              expectedValue: 155,
              value: 160,
            },
          ],
        }),
        "fixtures/synthetic/patches/invalid.json",
      ),
    ).toThrow(/already-normalized canonical key/);
  });

  it("rejects route-registry entries that are not normalized slugs", () => {
    expect(() =>
      parseRouteRegistry(
        JSON.stringify({
          schemaVersion: 1,
          datasetId: "synthetic",
          datasetVersion: "1.0.0",
          entries: [
            {
              entityKind: "item",
              target: { type: "entity-id", entityId: "item:test" },
              canonicalSlug: "Not Normalized",
              aliases: [],
            },
          ],
        }),
        "fixtures/synthetic/routes.json",
      ),
    ).toThrow(/normalized URL slug/);
  });

  it("rejects manifest patch paths outside the repository root", () => {
    const repositoryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-patch-path-"),
    );
    try {
      const sourceRoot = path.join(repositoryRoot, "source");
      mkdirSync(sourceRoot);
      writeFileSync(path.join(sourceRoot, "itemDB.xml"), "<items />");
      const manifestPath = path.join(repositoryRoot, "manifest.json");
      writeFileSync(
        manifestPath,
        JSON.stringify({
          schemaVersion: 2,
          datasetId: "patch-path-test",
          datasetVersion: "1.0.0",
          sources: [
            {
              id: "fixture",
              label: "Fixture",
              kind: "fixture",
              version: "1.0.0",
              precedence: 0,
              root: "source",
              files: [{ kind: "items", path: "itemDB.xml" }],
            },
          ],
          patches: [{ order: 0, path: "../outside.json" }],
        }),
      );

      expect(() => loadManifest(manifestPath, repositoryRoot)).toThrow(
        /Unsafe relative path/,
      );
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("rejects manifest route-registry paths outside the repository root", () => {
    const repositoryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-route-path-"),
    );
    try {
      const sourceRoot = path.join(repositoryRoot, "source");
      mkdirSync(sourceRoot);
      writeFileSync(path.join(sourceRoot, "itemDB.xml"), "<items />");
      const manifestPath = path.join(repositoryRoot, "manifest.json");
      writeFileSync(
        manifestPath,
        JSON.stringify({
          schemaVersion: 2,
          datasetId: "route-path-test",
          datasetVersion: "1.0.0",
          routeRegistry: "../outside-routes.json",
          sources: [
            {
              id: "fixture",
              label: "Fixture",
              kind: "fixture",
              version: "1.0.0",
              precedence: 0,
              root: "source",
              files: [{ kind: "items", path: "itemDB.xml" }],
            },
          ],
          patches: [],
        }),
      );

      expect(() => loadManifest(manifestPath, repositoryRoot)).toThrow(
        /Unsafe relative path/,
      );
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });
});
