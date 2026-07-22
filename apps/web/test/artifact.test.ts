import { createHash } from "node:crypto";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const generatedFixture = path.join(repositoryRoot, "data/generated/spike");
const originalArtifactDirectory = process.env.DREDMORPEDIA_ARTIFACT_DIRECTORY;
let artifactDirectory = "";

function readJson(name: string): Record<string, unknown> {
  return JSON.parse(
    readFileSync(path.join(artifactDirectory, name), "utf8"),
  ) as Record<string, unknown>;
}

function writeOutput(
  name: "artifact.json" | "search.json",
  value: Record<string, unknown>,
  updateChecksum: boolean,
): void {
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(path.join(artifactDirectory, name), contents);
  if (!updateChecksum) {
    return;
  }

  const manifest = readJson("manifest.json") as {
    outputs: Record<string, { bytes: number; sha256: string }>;
  };
  const output = name === "artifact.json" ? "artifact" : "search";
  manifest.outputs[output] = {
    ...manifest.outputs[output],
    bytes: Buffer.byteLength(contents),
    sha256: createHash("sha256").update(contents).digest("hex"),
  };
  writeFileSync(
    path.join(artifactDirectory, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

beforeEach(() => {
  artifactDirectory = mkdtempSync(
    path.join(tmpdir(), "dredmorpedia-web-artifact-"),
  );
  cpSync(generatedFixture, artifactDirectory, { recursive: true });
  process.env.DREDMORPEDIA_ARTIFACT_DIRECTORY = artifactDirectory;
  vi.resetModules();
});

afterEach(() => {
  if (originalArtifactDirectory === undefined) {
    delete process.env.DREDMORPEDIA_ARTIFACT_DIRECTORY;
  } else {
    process.env.DREDMORPEDIA_ARTIFACT_DIRECTORY = originalArtifactDirectory;
  }
  rmSync(artifactDirectory, { force: true, recursive: true });
});

describe("generated artifact loading", () => {
  it("loads a complete checksummed artifact set", async () => {
    const { loadArtifact, loadDiagnostics, loadSearchArtifact } =
      await import("../src/lib/artifact");

    expect(loadArtifact().entities.items).toHaveLength(7);
    expect(loadSearchArtifact().documents).toHaveLength(19);
    expect(loadDiagnostics()).toHaveLength(28);
  });

  it("rejects an output that no longer matches the manifest", async () => {
    const artifact = readJson("artifact.json");
    artifact.datasetId = "tampered-dataset";
    writeOutput("artifact.json", artifact, false);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/does not match manifest\.json/);
  });

  it("rejects a checksummed artifact with a missing collection", async () => {
    const artifact = readJson("artifact.json") as {
      entities: Record<string, unknown>;
    };
    delete artifact.entities.recipes;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/entities\.recipes/);
  });

  it("rejects malformed spell animation metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: { animations: { frameRate: number | null }[] }[];
      };
    };
    const animation = typedArtifact.entities.spells
      .flatMap((spell) => spell.animations)
      .at(0);
    if (!animation) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell animation metadata.",
      );
    }
    animation.frameRate = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/frameRate/);
  });

  it("rejects malformed spell impact metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: { impacts: { frameCount: number | null }[] }[];
      };
    };
    const impact = typedArtifact.entities.spells
      .flatMap((spell) => spell.impacts)
      .at(0);
    if (!impact) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell impact metadata.",
      );
    }
    impact.frameCount = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/frameCount/);
  });

  it("rejects malformed item modifier metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: { modifiers: { amount: number }[] }[];
      };
    };
    const modifier = typedArtifact.entities.items
      .flatMap((item) => item.modifiers)
      .at(0);
    if (!modifier) {
      throw new Error("Synthetic artifact unexpectedly has no item modifier.");
    }
    modifier.amount = Number.POSITIVE_INFINITY;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/modifiers/);
  });

  it("rejects a checksummed search file not derived from the artifact", async () => {
    const search = readJson("search.json") as {
      documents: { text: string }[];
    };
    const firstDocument = search.documents[0];
    if (!firstDocument) {
      throw new Error(
        "Synthetic search fixture unexpectedly has no documents.",
      );
    }
    firstDocument.text = `${firstDocument.text} tampered`;
    writeOutput("search.json", search, true);
    const { loadSearchArtifact } = await import("../src/lib/artifact");

    expect(() => loadSearchArtifact()).toThrow(/not derived/);
  });
});
