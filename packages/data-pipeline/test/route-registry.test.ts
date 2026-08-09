import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { importDataset } from "../src/import-dataset";
import { writeOutputs } from "../src/output";
import { parseRouteRegistry } from "../src/route-registry";
import { sha256 } from "../src/serialization";

const temporaryDirectories: string[] = [];
const datasetId = "route-lineage-test";
const sourceId = "route-lineage-source";

type RegistryEntry = {
  entityKind: "item";
  target: {
    type: "source-id";
    sourceId: string;
    originalId: string;
  };
  status: "active" | "tombstone";
  canonicalSlug: string;
  aliases: string[];
};

function createRepository(): string {
  const root = mkdtempSync(path.join(tmpdir(), "dredmorpedia-route-lineage-"));
  temporaryDirectories.push(root);
  mkdirSync(path.join(root, "source"));
  return root;
}

function entry(
  originalId: string,
  status: RegistryEntry["status"],
  canonicalSlug: string,
  aliases: string[] = [],
): RegistryEntry {
  return {
    entityKind: "item",
    target: { type: "source-id", sourceId, originalId },
    status,
    canonicalSlug,
    aliases,
  };
}

function writeItems(root: string, items: { id: string; name: string }[]): void {
  writeFileSync(
    path.join(root, "source", "itemDB.xml"),
    `<?xml version="1.0"?><items>${items
      .map(
        (item) =>
          `<item id="${item.id}" name="${item.name}" type="material" />`,
      )
      .join("")}</items>`,
  );
}

function writeRegistry(root: string, file: string, value: unknown): string {
  const json = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(path.join(root, file), json);
  return sha256(json);
}

function writeManifest(
  root: string,
  datasetVersion: string,
  routeRegistry?: string,
  previousRouteRegistry?: string,
): string {
  const manifestPath = path.join(root, `manifest-${datasetVersion}.json`);
  writeFileSync(
    manifestPath,
    JSON.stringify({
      schemaVersion: 2,
      datasetId,
      datasetVersion,
      ...(routeRegistry ? { routeRegistry } : {}),
      ...(previousRouteRegistry ? { previousRouteRegistry } : {}),
      sources: [
        {
          id: sourceId,
          label: "Route lineage source",
          kind: "fixture",
          version: datasetVersion,
          precedence: 0,
          root: "source",
          files: [{ kind: "items", path: "itemDB.xml" }],
        },
      ],
      patches: [],
    }),
  );
  return manifestPath;
}

function registry(
  datasetVersion: string,
  lineage:
    | { type: "root" }
    | { type: "inherited"; datasetVersion: string; sha256: string },
  entries: RegistryEntry[],
): unknown {
  return {
    schemaVersion: 2,
    datasetId,
    datasetVersion,
    lineage,
    entries,
  };
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("published route registry lifecycle", () => {
  it("preserves insertion, deletion tombstones, and stable-identity reappearance", () => {
    const root = createRepository();
    const firstHash = writeRegistry(
      root,
      "routes-1.json",
      registry("1.0.0", { type: "root" }, [
        entry("shared-wand", "active", "shared-wand", ["old-shared-wand"]),
      ]),
    );
    writeItems(root, [{ id: "shared-wand", name: "Original Wand" }]);
    const first = importDataset({
      manifestPath: writeManifest(root, "1.0.0", "routes-1.json"),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });
    expect(first.artifact.diagnostics.error).toBe(0);
    expect(first.artifact.entities.items[0]?.slug).toBe("shared-wand");

    writeItems(root, [{ id: "new-shared-wand", name: "Shared Wand" }]);
    const secondHash = writeRegistry(
      root,
      "routes-2.json",
      registry(
        "2.0.0",
        { type: "inherited", datasetVersion: "1.0.0", sha256: firstHash },
        [
          entry("shared-wand", "tombstone", "shared-wand", ["old-shared-wand"]),
          entry("new-shared-wand", "active", "shared-wand-new"),
        ],
      ),
    );
    const deletion = importDataset({
      manifestPath: writeManifest(
        root,
        "2.0.0",
        "routes-2.json",
        "routes-1.json",
      ),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });

    expect(deletion.artifact.diagnostics.error).toBe(0);
    expect(deletion.artifact.entities.items).toMatchObject([
      { id: "item:shared wand", slug: "shared-wand-new" },
    ]);

    writeItems(root, [
      { id: "shared-wand", name: "Returned Wand" },
      { id: "new-shared-wand", name: "Shared Wand" },
    ]);
    writeRegistry(
      root,
      "routes-3.json",
      registry(
        "3.0.0",
        {
          type: "inherited",
          datasetVersion: "2.0.0",
          sha256: secondHash,
        },
        [
          entry("shared-wand", "active", "shared-wand", ["old-shared-wand"]),
          entry("new-shared-wand", "active", "shared-wand-new"),
        ],
      ),
    );
    const reappearance = importDataset({
      manifestPath: writeManifest(
        root,
        "3.0.0",
        "routes-3.json",
        "routes-2.json",
      ),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });

    expect(reappearance.artifact.diagnostics.error).toBe(0);
    expect(
      reappearance.artifact.entities.items.map((item) => ({
        name: item.name,
        slug: item.slug,
        aliases: item.slugAliases,
      })),
    ).toEqual([
      {
        name: "Returned Wand",
        slug: "shared-wand",
        aliases: ["old-shared-wand"],
      },
      {
        name: "Shared Wand",
        slug: "shared-wand-new",
        aliases: ["new-shared-wand"],
      },
    ]);
  });

  it("fails publication when the current registry is missing", () => {
    const root = createRepository();
    writeItems(root, [{ id: "shared-wand", name: "Shared Wand" }]);
    const result = importDataset({
      manifestPath: writeManifest(root, "1.0.0"),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "route_registry_publication_missing",
      }),
    );
    expect(() =>
      writeOutputs(result, path.join(root, "output"), {
        failOnErrorDiagnostics: true,
      }),
    ).toThrow(/Refusing to publish/);

    writeRegistry(root, "routes-v1.json", {
      schemaVersion: 1,
      datasetId,
      datasetVersion: "1.0.0",
      entries: [
        {
          entityKind: "item",
          target: { type: "entity-id", entityId: "item:shared wand" },
          canonicalSlug: "shared-wand",
          aliases: [],
        },
      ],
    });
    const legacy = importDataset({
      manifestPath: writeManifest(root, "1.0.0", "routes-v1.json"),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });
    expect(legacy.diagnostics).toContainEqual(
      expect.objectContaining({ code: "route_registry_publication_schema" }),
    );
  });

  it("rejects missing, mismatched, and stale predecessor state atomically", () => {
    const root = createRepository();
    writeItems(root, [{ id: "new-wand", name: "New Wand" }]);
    const predecessorHash = writeRegistry(
      root,
      "routes-1.json",
      registry("1.0.0", { type: "root" }, [
        entry("old-wand", "active", "old-wand", ["former-old-wand"]),
      ]),
    );

    writeRegistry(
      root,
      "routes-missing.json",
      registry(
        "2.0.0",
        {
          type: "inherited",
          datasetVersion: "1.0.0",
          sha256: predecessorHash,
        },
        [entry("new-wand", "active", "new-wand")],
      ),
    );
    const missing = importDataset({
      manifestPath: writeManifest(root, "2.0.0", "routes-missing.json"),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });
    expect(missing.diagnostics).toContainEqual(
      expect.objectContaining({ code: "route_registry_predecessor_missing" }),
    );

    writeRegistry(
      root,
      "routes-mismatched.json",
      registry(
        "2.0.0",
        {
          type: "inherited",
          datasetVersion: "1.0.0",
          sha256: "0".repeat(64),
        },
        [entry("new-wand", "active", "new-wand")],
      ),
    );
    const mismatched = importDataset({
      manifestPath: writeManifest(
        root,
        "2.0.0",
        "routes-mismatched.json",
        "routes-1.json",
      ),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });
    expect(mismatched.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "route_registry_predecessor_mismatch",
      }),
    );

    writeRegistry(
      root,
      "routes-stale.json",
      registry(
        "2.0.0",
        {
          type: "inherited",
          datasetVersion: "1.0.0",
          sha256: predecessorHash,
        },
        [entry("new-wand", "active", "new-wand")],
      ),
    );
    const stale = importDataset({
      manifestPath: writeManifest(
        root,
        "2.0.0",
        "routes-stale.json",
        "routes-1.json",
      ),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });
    expect(stale.diagnostics).toContainEqual(
      expect.objectContaining({ code: "route_registry_inheritance_stale" }),
    );
    expect(stale.artifact.entities.items[0]?.slug).toBe("new-wand");
    expect(stale.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "route_registry_applied" }),
    );

    writeRegistry(
      root,
      "routes-stale-alias.json",
      registry(
        "2.0.0",
        {
          type: "inherited",
          datasetVersion: "1.0.0",
          sha256: predecessorHash,
        },
        [
          entry("old-wand", "tombstone", "old-wand", []),
          entry("new-wand", "active", "new-wand"),
        ],
      ),
    );
    const staleAlias = importDataset({
      manifestPath: writeManifest(
        root,
        "2.0.0",
        "routes-stale-alias.json",
        "routes-1.json",
      ),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });
    expect(staleAlias.diagnostics).toContainEqual(
      expect.objectContaining({ code: "route_registry_inheritance_stale" }),
    );
  });

  it("rejects conflicting owners and a tombstone without inherited history", () => {
    expect(() =>
      parseRouteRegistry(
        JSON.stringify(
          registry("2.0.0", { type: "root" }, [
            entry("first", "active", "claimed-route"),
            entry("second", "active", "claimed-route"),
          ]),
        ),
        "routes-conflict.json",
      ),
    ).toThrow(/more than one registry owner/);

    const root = createRepository();
    writeItems(root, [
      { id: "new-wand", name: "New Wand" },
      { id: "unregistered-wand", name: "Unregistered Wand" },
    ]);
    const predecessorHash = writeRegistry(
      root,
      "routes-1.json",
      registry("1.0.0", { type: "root" }, [
        entry("new-wand", "active", "new-wand"),
      ]),
    );
    writeRegistry(
      root,
      "routes-2.json",
      registry(
        "2.0.0",
        {
          type: "inherited",
          datasetVersion: "1.0.0",
          sha256: predecessorHash,
        },
        [
          entry("new-wand", "tombstone", "new-wand"),
          entry("never-published", "tombstone", "unused-route"),
        ],
      ),
    );
    const result = importDataset({
      manifestPath: writeManifest(
        root,
        "2.0.0",
        "routes-2.json",
        "routes-1.json",
      ),
      repositoryRoot: root,
      requirePublishedRoutes: true,
    });

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "route_registry_tombstone_uninherited",
      }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "route_registry_tombstone_active" }),
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "route_registry_entity_unregistered" }),
    );
  });
});
