import { describe, expect, it } from "vitest";

import { loadArtifact, loadDiagnostics } from "../src/lib/artifact";
import {
  allDatasetEntities,
  collectEntitySourceDecisions,
  entityDetailPath,
  groupDiagnosticsByCode,
} from "../src/lib/dataset-health";

describe("dataset health summaries", () => {
  it("collects linked override and patch decisions from every entity kind", () => {
    const artifact = loadArtifact();
    const decisions = collectEntitySourceDecisions(artifact);

    expect(allDatasetEntities(artifact)).toHaveLength(29);
    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      id: "item:clockwork blade",
      kind: "item",
      name: "Clockwork Blade",
      url: "/items/clockwork-blade/",
      activeSourceId: "synthetic-override",
    });
    expect(decisions[0]?.overrides).toHaveLength(2);
    expect(decisions[0]?.patches).toHaveLength(1);
    expect(entityDetailPath(artifact.entities.templates[0]!)).toBe(
      "/templates/small-cross/",
    );
  });

  it("groups diagnostics by stable severity and code", () => {
    const groups = groupDiagnosticsByCode(loadDiagnostics());

    expect(groups[0]).toMatchObject({
      severity: "error",
      code: "invalid_xml",
    });
    expect(groups[0]?.diagnostics).toHaveLength(1);

    const dangling = groups.find(
      (group) =>
        group.severity === "warning" && group.code === "dangling_reference",
    );
    expect(dangling?.diagnostics).toHaveLength(13);

    const duplicate = groups.find(
      (group) => group.severity === "info" && group.code === "duplicate_entity",
    );
    expect(duplicate?.diagnostics).toHaveLength(2);

    const independentDeclarations = groups.find(
      (group) =>
        group.severity === "info" &&
        group.code === "independent_named_declaration",
    );
    expect(independentDeclarations?.diagnostics).toHaveLength(2);
  });
});
