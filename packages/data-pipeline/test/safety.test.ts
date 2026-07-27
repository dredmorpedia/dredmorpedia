import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  loadManifest,
  importDataset,
  parsePatchDefinition,
  parseRouteRegistry,
  parseXml,
  resolveWithin,
  writeOutputs,
} from "../src/index";

function captureZodIssues(action: () => unknown): ZodError["issues"] {
  try {
    action();
  } catch (error) {
    if (error instanceof ZodError) {
      return error.issues;
    }
    throw error;
  }
  throw new Error("Expected schema validation to fail.");
}

describe("input safety", () => {
  it("rejects real output paths that overlap a source root", () => {
    const repositoryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-output-boundary-"),
    );
    try {
      const sourceRoot = path.join(repositoryRoot, "source");
      mkdirSync(sourceRoot);
      writeFileSync(path.join(sourceRoot, "itemDB.xml"), "<items />");
      const manifestPath = path.join(repositoryRoot, "manifest.json");
      writeFileSync(
        manifestPath,
        JSON.stringify({
          schemaVersion: 1,
          datasetId: "output-boundary-test",
          sources: [
            {
              id: "fixture",
              label: "Fixture",
              kind: "fixture",
              precedence: 0,
              root: "source",
              files: [{ kind: "items", path: "itemDB.xml" }],
            },
          ],
        }),
      );
      const result = importDataset({ manifestPath, repositoryRoot });

      expect(() => writeOutputs(result, repositoryRoot)).toThrow(
        /overlaps source root/,
      );
      expect(() =>
        writeOutputs(result, path.join(sourceRoot, "generated")),
      ).toThrow(/overlaps source root/);

      const sourceJunction = path.join(repositoryRoot, "source-junction");
      symlinkSync(sourceRoot, sourceJunction, "junction");
      expect(() =>
        writeOutputs(result, path.join(sourceJunction, "generated")),
      ).toThrow(/overlaps source root/);
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("preserves the last published output when the zero-error gate fails", () => {
    const repositoryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-zero-error-output-"),
    );
    try {
      const sourceRoot = path.join(repositoryRoot, "source");
      const outputRoot = path.join(repositoryRoot, "generated");
      mkdirSync(sourceRoot);
      const sourcePath = path.join(sourceRoot, "itemDB.xml");
      writeFileSync(
        sourcePath,
        '<items><item name="Valid Item" type="material" /></items>',
      );
      const manifestPath = path.join(repositoryRoot, "manifest.json");
      writeFileSync(
        manifestPath,
        JSON.stringify({
          schemaVersion: 1,
          datasetId: "zero-error-output-test",
          sources: [
            {
              id: "fixture",
              label: "Fixture",
              kind: "fixture",
              precedence: 0,
              root: "source",
              files: [{ kind: "items", path: "itemDB.xml" }],
            },
          ],
        }),
      );

      const validResult = importDataset({ manifestPath, repositoryRoot });
      expect(validResult.artifact.diagnostics.error).toBe(0);
      writeOutputs(validResult, outputRoot, {
        failOnErrorDiagnostics: true,
      });
      const publishedOutputs = [
        "artifact.json",
        "search.json",
        "diagnostics.json",
        "manifest.json",
      ].map(
        (file) =>
          [file, readFileSync(path.join(outputRoot, file), "utf8")] as const,
      );

      writeFileSync(sourcePath, "<items><item></items>");
      const invalidResult = importDataset({ manifestPath, repositoryRoot });
      expect(invalidResult.artifact.diagnostics.error).toBe(1);
      expect(() =>
        writeOutputs(invalidResult, outputRoot, {
          failOnErrorDiagnostics: true,
        }),
      ).toThrow(
        "Refusing to publish generated output with 1 error diagnostic.",
      );
      expect(existsSync(path.join(outputRoot, "manifest.json"))).toBe(true);
      for (const [file, contents] of publishedOutputs) {
        expect(readFileSync(path.join(outputRoot, file), "utf8")).toBe(
          contents,
        );
      }
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

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

  it("rejects unknown fields throughout source manifests", () => {
    const repositoryRoot = mkdtempSync(
      path.join(tmpdir(), "dredmorpedia-strict-manifest-"),
    );
    try {
      const manifestPath = path.join(repositoryRoot, "manifest.json");
      writeFileSync(
        manifestPath,
        JSON.stringify({
          schemaVersion: 2,
          datasetId: "strict-manifest-test",
          datasetVersion: "1.0.0",
          datasetID: "misspelled-on-purpose",
          sources: [
            {
              id: "fixture",
              label: "Fixture",
              kind: "fixture",
              version: "1.0.0",
              precedence: 0,
              prioritiy: 1,
              root: "source",
              files: [
                {
                  kind: "items",
                  path: "itemDB.xml",
                  databasePath: "misspelled-on-purpose",
                },
              ],
            },
          ],
          patches: [
            {
              order: 0,
              path: "patches/example.json",
              enabled: true,
            },
          ],
        }),
      );

      const issues = captureZodIssues(() =>
        loadManifest(manifestPath, repositoryRoot),
      );

      expect(issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "unrecognized_keys",
            keys: ["databasePath"],
            path: ["sources", 0, "files", 0],
          }),
          expect.objectContaining({
            code: "unrecognized_keys",
            keys: ["prioritiy"],
            path: ["sources", 0],
          }),
          expect.objectContaining({
            code: "unrecognized_keys",
            keys: ["enabled"],
            path: ["patches", 0],
          }),
          expect.objectContaining({
            code: "unrecognized_keys",
            keys: ["datasetID"],
            path: [],
          }),
        ]),
      );

      writeFileSync(
        manifestPath,
        JSON.stringify({
          schemaVersion: 1,
          datasetId: "strict-legacy-manifest-test",
          sources: [
            {
              id: "fixture",
              label: "Fixture",
              kind: "fixture",
              version: "not-supported-by-schema-1",
              precedence: 0,
              root: "source",
              files: [{ kind: "items", path: "itemDB.xml" }],
            },
          ],
        }),
      );
      expect(
        captureZodIssues(() => loadManifest(manifestPath, repositoryRoot)),
      ).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "unrecognized_keys",
            keys: ["version"],
            path: ["sources", 0],
          }),
        ]),
      );
    } finally {
      rmSync(repositoryRoot, { recursive: true, force: true });
    }
  });

  it("rejects unknown fields throughout patch definitions", () => {
    const issues = captureZodIssues(() =>
      parsePatchDefinition(
        JSON.stringify({
          schemaVersion: 1,
          id: "strict-patch",
          reason: "Synthetic strict-schema coverage.",
          reviewedBy: "unexpected",
          appliesTo: {
            datasetId: "synthetic",
            datasetVersion: "1.0.0",
            sourceId: "synthetic-base",
            sourceVersion: "1.0.0",
            datasetID: "misspelled-on-purpose",
          },
          operations: [
            {
              entityKind: "item",
              canonicalKey: "clockwork blade",
              field: "price",
              expectedValue: 155,
              value: 160,
              expectedValu: 155,
            },
          ],
        }),
        "fixtures/synthetic/patches/strict.json",
      ),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["datasetID"],
          path: ["appliesTo"],
        }),
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["expectedValu"],
          path: ["operations", 0],
        }),
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["reviewedBy"],
          path: [],
        }),
      ]),
    );
  });

  it("rejects unknown fields throughout route registries", () => {
    const issues = captureZodIssues(() =>
      parseRouteRegistry(
        JSON.stringify({
          schemaVersion: 1,
          datasetId: "synthetic",
          datasetVersion: "1.0.0",
          datasetID: "misspelled-on-purpose",
          entries: [
            {
              entityKind: "item",
              target: {
                type: "entity-id",
                entityId: "item:clockwork blade",
                id: "misspelled-on-purpose",
              },
              canonicalSlug: "clockwork-blade",
              aliases: [],
              canonicalURL: "misspelled-on-purpose",
            },
            {
              entityKind: "spell",
              target: {
                type: "source-id",
                sourceId: "synthetic-base",
                originalId: "spell-1",
                originalID: "misspelled-on-purpose",
              },
              canonicalSlug: "synthetic-spell",
              aliases: [],
            },
          ],
        }),
        "fixtures/synthetic/routes-strict.json",
      ),
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["id"],
          path: ["entries", 0, "target"],
        }),
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["canonicalURL"],
          path: ["entries", 0],
        }),
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["originalID"],
          path: ["entries", 1, "target"],
        }),
        expect.objectContaining({
          code: "unrecognized_keys",
          keys: ["datasetID"],
          path: [],
        }),
      ]),
    );
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
