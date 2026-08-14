import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import type {
  CraftingPlanItem,
  CraftingPlanRecipe,
} from "@dredmorpedia/domain";

import { CraftingPlanner } from "@/components/crafting-planner";
import { loadArtifact } from "@/lib/artifact";

export const metadata: Metadata = {
  title: "Crafting dependency planner",
  description:
    "Expand Dungeons of Dredmor recipe dependencies and calculate a shareable base-ingredient list.",
};

export default function CraftingGraphPage() {
  const artifact = loadArtifact();
  const items: CraftingPlanItem[] = artifact.entities.items.map(
    ({ id, canonicalKey, slug, name }) => ({ id, canonicalKey, slug, name }),
  );
  const recipes: CraftingPlanRecipe[] = artifact.entities.recipes.map(
    ({ id, canonicalKey, slug, name, tool, inputs, outputs }) => ({
      id,
      canonicalKey,
      slug,
      name,
      tool,
      inputs,
      outputs,
    }),
  );

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Crafting planner</span>
      </nav>

      <header className="detail-header">
        <div>
          <p className="eyebrow">Differentiating tool</p>
          <h1 className="detail-title">Crafting dependency planner</h1>
          <p className="detail-copy">
            Expand selected recipe yields into ordered crafting steps and a
            combined base-ingredient list.
          </p>
        </div>
        <dl className="recipe-facts">
          <div>
            <dt>Dataset</dt>
            <dd>{artifact.datasetVersion}</dd>
          </div>
          <div>
            <dt>Calculation</dt>
            <dd>Local and URL-addressable</dd>
          </div>
          <div>
            <dt>Inferred engine rules</dt>
            <dd>None</dd>
          </div>
        </dl>
      </header>

      <Suspense
        fallback={
          <div className="empty-state" role="status">
            Loading crafting controls…
          </div>
        }
      >
        <CraftingPlanner items={items} recipes={recipes} />
      </Suspense>
    </article>
  );
}
