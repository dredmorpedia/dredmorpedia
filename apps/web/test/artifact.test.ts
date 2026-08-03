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
  name: "artifact.json" | "diagnostics.json" | "search.json",
  value: unknown,
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
  const output =
    name === "artifact.json"
      ? "artifact"
      : name === "search.json"
        ? "search"
        : "diagnostics";
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

    expect(loadArtifact().entities.items).toHaveLength(13);
    expect(loadSearchArtifact().documents).toHaveLength(25);
    expect(loadDiagnostics()).toHaveLength(23);
  });

  it("rejects an output that no longer matches the manifest", async () => {
    const artifact = readJson("artifact.json");
    artifact.datasetId = "tampered-dataset";
    writeOutput("artifact.json", artifact, false);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/does not match manifest\.json/);
  });

  it("rejects tampered diagnostics while loading only the main artifact", async () => {
    const diagnostics = readFileSync(
      path.join(artifactDirectory, "diagnostics.json"),
      "utf8",
    );
    writeFileSync(
      path.join(artifactDirectory, "diagnostics.json"),
      `${diagnostics} `,
    );
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/diagnostics\.json.*manifest\.json/);
    writeFileSync(
      path.join(artifactDirectory, "diagnostics.json"),
      diagnostics,
    );
    expect(loadArtifact().entities.items).toHaveLength(13);
  });

  it("rejects checksummed diagnostic inconsistencies while loading only the main artifact", async () => {
    const diagnostics = JSON.parse(
      readFileSync(path.join(artifactDirectory, "diagnostics.json"), "utf8"),
    ) as unknown[];
    diagnostics.pop();
    writeOutput("diagnostics.json", diagnostics, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/counts do not match/);
  });

  it("rejects a stale checksummed search index while loading only the main artifact", async () => {
    const search = readJson("search.json") as {
      documents: { text: string }[];
    };
    const firstDocument = search.documents[0];
    if (!firstDocument) {
      throw new Error(
        "Synthetic search fixture unexpectedly has no documents.",
      );
    }
    firstDocument.text = `${firstDocument.text} stale`;
    writeOutput("search.json", search, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/not derived/);
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

  it("rejects an unsafe canonical entity slug", async () => {
    const artifact = readJson("artifact.json") as {
      entities: { items: { slug: string }[] };
    };
    const firstItem = artifact.entities.items[0];
    if (!firstItem) {
      throw new Error("Synthetic artifact unexpectedly has no items.");
    }
    firstItem.slug = "../outside";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/entities\.items\.0\.slug/);
  });

  it("rejects an unsafe entity alias slug", async () => {
    const artifact = readJson("artifact.json") as {
      entities: { items: { slugAliases: string[] }[] };
    };
    const firstItem = artifact.entities.items[0];
    if (!firstItem) {
      throw new Error("Synthetic artifact unexpectedly has no items.");
    }
    firstItem.slugAliases.push("Clockwork Blade");
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/slugAliases/);
  });

  it("rejects a canonical-or-alias route collision within an entity kind", async () => {
    const artifact = readJson("artifact.json") as {
      entities: {
        items: { id: string; slug: string; slugAliases: string[] }[];
      };
    };
    const [firstItem, secondItem] = artifact.entities.items;
    if (!firstItem || !secondItem) {
      throw new Error(
        "Synthetic artifact unexpectedly has fewer than two items.",
      );
    }
    secondItem.slugAliases.push(firstItem.slug);
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(
      new RegExp(
        `duplicate item route slug "${firstItem.slug}".*${firstItem.id}.*${secondItem.id}`,
      ),
    );
  });

  it("rejects a traversing entity icon path", async () => {
    const artifact = readJson("artifact.json") as {
      entities: { items: { iconPath: string | null }[] };
    };
    const firstItem = artifact.entities.items[0];
    if (!firstItem) {
      throw new Error("Synthetic artifact unexpectedly has no items.");
    }
    firstItem.iconPath = "../outside.svg";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/entities\.items\.0\.iconPath/);
  });

  it("rejects a Windows drive-relative nested presentation path", async () => {
    const artifact = readJson("artifact.json") as {
      entities: {
        monsters: {
          presentation: {
            attack: { down: string | null } | null;
          };
        }[];
      };
    };
    const monster = artifact.entities.monsters.find(
      (entry) => entry.presentation.attack?.down,
    );
    if (!monster?.presentation.attack) {
      throw new Error(
        "Synthetic artifact unexpectedly has no monster attack presentation.",
      );
    }
    monster.presentation.attack.down = "C:outside.spr";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/presentation\.attack\.down/);
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

  it("rejects malformed spell buff descriptions", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: { buffs: { descriptions: { text: unknown }[] }[] }[];
      };
    };
    const description = typedArtifact.entities.spells
      .flatMap((spell) => spell.buffs)
      .flatMap((buff) => buff.descriptions)
      .at(0);
    if (!description) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell buff description.",
      );
    }
    description.text = 42;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/descriptions/);
  });

  it("rejects malformed spell buff halo metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: { buffs: { halos: { frameRate: number | null }[] }[] }[];
      };
    };
    const halo = typedArtifact.entities.spells
      .flatMap((spell) => spell.buffs)
      .flatMap((buff) => buff.halos)
      .at(0);
    if (!halo) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell buff halo metadata.",
      );
    }
    halo.frameRate = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/halos/);
  });

  it("rejects malformed spell buff invisibility metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          buffs: {
            invisibilityDeclarations: { amount: number | null }[];
          }[];
        }[];
      };
    };
    const declaration = typedArtifact.entities.spells
      .flatMap((spell) => spell.buffs)
      .flatMap((buff) => buff.invisibilityDeclarations)
      .at(0);
    if (!declaration) {
      throw new Error(
        "Synthetic artifact unexpectedly has no buff invisibility declaration.",
      );
    }
    declaration.amount = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/invisibilityDeclarations/);
  });

  it("rejects malformed spell buff mute metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          buffs: {
            muteDeclarations: { amount: number | null }[];
          }[];
        }[];
      };
    };
    const declaration = typedArtifact.entities.spells
      .flatMap((spell) => spell.buffs)
      .flatMap((buff) => buff.muteDeclarations)
      .at(0);
    if (!declaration) {
      throw new Error(
        "Synthetic artifact unexpectedly has no buff mute declaration.",
      );
    }
    declaration.amount = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/muteDeclarations/);
  });

  it("rejects malformed spell buff polymorph metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          buffs: {
            polymorphDeclarations: {
              monsterKey: string | null;
              monsterName: string | null;
            }[];
          }[];
        }[];
      };
    };
    const declaration = typedArtifact.entities.spells
      .flatMap((spell) => spell.buffs)
      .flatMap((buff) => buff.polymorphDeclarations)
      .at(0);
    if (!declaration) {
      throw new Error(
        "Synthetic artifact unexpectedly has no buff polymorph declaration.",
      );
    }
    declaration.monsterName = null;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/polymorphDeclarations/);
  });

  it("rejects spell buffs without their required nested effect collection", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          buffs: {
            effects?: unknown[];
          }[];
        }[];
      };
    };
    const buff = typedArtifact.entities.spells
      .flatMap((spell) => spell.buffs)
      .at(0);
    if (!buff) {
      throw new Error("Synthetic artifact unexpectedly has no spell buff.");
    }
    delete buff.effects;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/effects/);
  });

  it("rejects malformed spell AI hint metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: { aiHints: { hint: string | null }[] }[];
      };
    };
    const aiHint = typedArtifact.entities.spells
      .flatMap((spell) => spell.aiHints)
      .at(0);
    if (!aiHint) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell AI hint metadata.",
      );
    }
    aiHint.hint = "";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/aiHints/);
  });

  it("rejects malformed spell effect option metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            options: { kind: string; amount?: number | null }[];
          }[];
        }[];
      };
    };
    const itemOption = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .flatMap((effect) => effect.options)
      .find((option) => option.kind === "item");
    if (!itemOption) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell item-list option.",
      );
    }
    itemOption.amount = 0;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/options/);
  });

  it("rejects malformed direct spell effect item-target metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            itemTarget: {
              itemKey: string | null;
              itemName: string | null;
            };
          }[];
        }[];
      };
    };
    const targetedEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.itemTarget.itemKey !== null);
    if (!targetedEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no direct spell item target.",
      );
    }
    targetedEffect.itemTarget.itemName = null;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/itemTarget/);
  });

  it("rejects malformed summon monster-target metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            monsterTarget: {
              monsterKey: string | null;
              monsterName: string | null;
            };
          }[];
        }[];
      };
    };
    const targetedEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.monsterTarget.monsterKey !== null);
    if (!targetedEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no summon monster target.",
      );
    }
    targetedEffect.monsterTarget.monsterName = null;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/monsterTarget/);
  });

  it("rejects malformed named buff-removal metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            removedBuff: {
              spellKey: string | null;
              spellName: string | null;
            };
          }[];
        }[];
      };
    };
    const targetedEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.removedBuff.spellKey !== null);
    if (!targetedEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no named buff-removal target.",
      );
    }
    targetedEffect.removedBuff.spellName = null;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/removedBuff/);
  });

  it("rejects malformed spell effect control metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            controls: { chancePercent: number | null };
          }[];
        }[];
      };
    };
    const controlledEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.controls.chancePercent !== null);
    if (!controlledEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect control metadata.",
      );
    }
    controlledEffect.controls.chancePercent = 101;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/controls/);
  });

  it("rejects a negative spell effect duration", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            controls: { durationTurns: number | null };
          }[];
        }[];
      };
    };
    const durationEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.controls.durationTurns !== null);
    if (!durationEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect duration metadata.",
      );
    }
    durationEffect.controls.durationTurns = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/durationTurns/);
  });

  it("rejects malformed spell effect after metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            controls: { after: boolean | null };
          }[];
        }[];
      };
    };
    const controlledEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.controls.after !== null);
    if (!controlledEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect after metadata.",
      );
    }
    controlledEffect.controls.after = 1 as unknown as boolean;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/controls/);
  });

  it("rejects malformed spell effect bleed metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            controls: { bleedsTarget: boolean | null };
          }[];
        }[];
      };
    };
    const controlledEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.controls.bleedsTarget !== null);
    if (!controlledEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect bleed metadata.",
      );
    }
    controlledEffect.controls.bleedsTarget = 1 as unknown as boolean;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/controls/);
  });

  it("rejects malformed spell effect skip-animation metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            controls: { skipAnimation: boolean | null };
          }[];
        }[];
      };
    };
    const controlledEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.controls.skipAnimation !== null);
    if (!controlledEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect skip-animation metadata.",
      );
    }
    controlledEffect.controls.skipAnimation = 1 as unknown as boolean;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/controls/);
  });

  it("rejects malformed spell effect presentation metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            presentation: { centered: boolean | null } | null;
          }[];
        }[];
      };
    };
    const presentedEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.presentation !== null);
    if (!presentedEffect?.presentation) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect presentation metadata.",
      );
    }
    presentedEffect.presentation.centered = 1 as unknown as boolean;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/presentation/);
  });

  it("rejects an unsafe created-object sprite path", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            createdObjectSpritePath: string | null;
          }[];
        }[];
      };
    };
    const createdObjectEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.createdObjectSpritePath !== null);
    if (!createdObjectEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no created-object sprite metadata.",
      );
    }
    createdObjectEffect.createdObjectSpritePath = "../outside.spr";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/createdObjectSpritePath/);
  });

  it("rejects malformed spell effect graphics-regeneration metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            regenerateGraphics: boolean | null;
          }[];
        }[];
      };
    };
    const digEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.regenerateGraphics !== null);
    if (!digEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no graphics-regeneration metadata.",
      );
    }
    digEffect.regenerateGraphics = 1 as unknown as boolean;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/regenerateGraphics/);
  });

  it("rejects malformed spell effect Midas metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            controls: { midas: boolean | null };
          }[];
        }[];
      };
    };
    const midasEffect = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .find((effect) => effect.controls.midas !== null);
    if (!midasEffect) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect Midas metadata.",
      );
    }
    midasEffect.controls.midas = 1 as unknown as boolean;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/midas/);
  });

  it("rejects malformed spell effect condition metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            conditions: {
              requiredBuff: {
                spellKey: string | null;
                spellName: string | null;
              };
            };
          }[];
        }[];
      };
    };
    const condition = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .map((effect) => effect.conditions.requiredBuff)
      .find((entry) => entry.spellKey !== null);
    if (!condition) {
      throw new Error(
        "Synthetic artifact unexpectedly has no named spell effect condition.",
      );
    }
    condition.spellName = null;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/conditions/);
  });

  it("rejects malformed spell effect damage metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        spells: {
          effects: {
            damage: { factor: number | null }[];
          }[];
        }[];
      };
    };
    const damage = typedArtifact.entities.spells
      .flatMap((spell) => spell.effects)
      .flatMap((effect) => effect.damage)
      .find((entry) => entry.factor !== null);
    if (!damage) {
      throw new Error(
        "Synthetic artifact unexpectedly has no spell effect damage metadata.",
      );
    }
    damage.factor = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/damage/);
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

  it("rejects malformed item artifact metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: { artifacts: { quality: number | null }[] }[];
      };
    };
    const itemArtifact = typedArtifact.entities.items
      .flatMap((item) => item.artifacts)
      .at(0);
    if (!itemArtifact) {
      throw new Error(
        "Synthetic artifact unexpectedly has no item artifact metadata.",
      );
    }
    itemArtifact.quality = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/artifacts/);
  });

  it("rejects malformed item armour metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: { armourDeclarations: { randoms: number | null }[] }[];
      };
    };
    const armour = typedArtifact.entities.items
      .flatMap((item) => item.armourDeclarations)
      .at(0);
    if (!armour) {
      throw new Error(
        "Synthetic artifact unexpectedly has no item armour metadata.",
      );
    }
    armour.randoms = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/armourDeclarations/);
  });

  it("rejects malformed item weapon metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: { weaponDeclarations: { thrownPath: string | null }[] }[];
      };
    };
    const weapon = typedArtifact.entities.items
      .flatMap((item) => item.weaponDeclarations)
      .at(0);
    if (!weapon) {
      throw new Error(
        "Synthetic artifact unexpectedly has no item weapon metadata.",
      );
    }
    weapon.thrownPath = "";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/weaponDeclarations/);
  });

  it("rejects malformed item macguffin metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: { macguffinDeclarations: { consumable: unknown }[] }[];
      };
    };
    const declaration = typedArtifact.entities.items
      .flatMap((item) => item.macguffinDeclarations)
      .at(0);
    if (!declaration) {
      throw new Error(
        "Synthetic artifact unexpectedly has no item macguffin metadata.",
      );
    }
    declaration.consumable = "0";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/macguffinDeclarations/);
  });

  it("rejects malformed item toolkit metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: {
          toolkitDeclarations: {
            slotBounds: { slot: number }[];
          }[];
        }[];
      };
    };
    const slotBounds = typedArtifact.entities.items
      .flatMap((item) => item.toolkitDeclarations)
      .flatMap((declaration) => declaration.slotBounds)
      .at(0);
    if (!slotBounds) {
      throw new Error(
        "Synthetic artifact unexpectedly has no toolkit slot metadata.",
      );
    }
    slotBounds.slot = 0;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/toolkitDeclarations/);
  });

  it("rejects malformed item recovery metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: { recoveries: { amount: number | null }[] }[];
      };
    };
    const recovery = typedArtifact.entities.items
      .flatMap((item) => item.recoveries)
      .at(0);
    if (!recovery) {
      throw new Error(
        "Synthetic artifact unexpectedly has no item recovery metadata.",
      );
    }
    recovery.amount = -1;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/recoveries/);
  });

  it("rejects an inverted item charge range", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: {
          chargeRanges: { minimum: number | null; maximum: number | null }[];
        }[];
      };
    };
    const range = typedArtifact.entities.items
      .flatMap((item) => item.chargeRanges)
      .at(0);
    if (!range) {
      throw new Error(
        "Synthetic artifact unexpectedly has no item charge metadata.",
      );
    }
    range.minimum = 5;
    range.maximum = 2;
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/minimum must not exceed maximum/);
  });

  it("rejects malformed item trap metadata", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: { traps: { targetsCaster: unknown }[] }[];
      };
    };
    const trap = typedArtifact.entities.items
      .flatMap((item) => item.traps)
      .at(0);
    if (!trap) {
      throw new Error(
        "Synthetic artifact unexpectedly has no item trap metadata.",
      );
    }
    trap.targetsCaster = "yes";
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/traps/);
  });

  it("rejects malformed spell-trigger source flags", async () => {
    const artifact = readJson("artifact.json");
    const typedArtifact = artifact as unknown as {
      entities: {
        items: {
          triggers: { sourceFlags: { sourceKey: string; value: unknown }[] }[];
        }[];
      };
    };
    const trigger = typedArtifact.entities.items
      .flatMap((item) => item.triggers)
      .at(0);
    if (!trigger) {
      throw new Error("Synthetic artifact unexpectedly has no item trigger.");
    }
    trigger.sourceFlags = [{ sourceKey: "after", value: 1 }];
    writeOutput("artifact.json", artifact, true);
    const { loadArtifact } = await import("../src/lib/artifact");

    expect(() => loadArtifact()).toThrow(/sourceFlags/);
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

  it("rejects a search document without its required alias list", async () => {
    const search = readJson("search.json") as {
      documents: { aliases?: string[] }[];
    };
    const firstDocument = search.documents[0];
    if (!firstDocument) {
      throw new Error(
        "Synthetic search fixture unexpectedly has no documents.",
      );
    }
    delete firstDocument.aliases;
    writeOutput("search.json", search, true);
    const { loadSearchArtifact } = await import("../src/lib/artifact");

    expect(() => loadSearchArtifact()).toThrow(/documents\.0\.aliases/);
  });

  it("rejects an unsafe search-document URL before derivation checks", async () => {
    const search = readJson("search.json") as {
      documents: { url: string }[];
    };
    const firstDocument = search.documents[0];
    if (!firstDocument) {
      throw new Error(
        "Synthetic search fixture unexpectedly has no documents.",
      );
    }
    firstDocument.url = "javascript:alert(1)";
    writeOutput("search.json", search, true);
    const { loadSearchArtifact } = await import("../src/lib/artifact");

    expect(() => loadSearchArtifact()).toThrow(/documents\.0\.url/);
  });
});
