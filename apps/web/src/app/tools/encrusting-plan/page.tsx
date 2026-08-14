import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import type {
  CraftingPlanItem,
  CraftingPlanRecipe,
} from "@dredmorpedia/domain";

import {
  EncrustmentPlanner,
  type EncrustmentPlannerEntry,
} from "@/components/encrustment-planner";
import { loadArtifact } from "@/lib/artifact";

export const metadata: Metadata = {
  title: "Encrustment ingredient planner",
  description:
    "Calculate direct encrustment ingredients and expand their crafting dependencies into a shareable shopping list.",
};

export default function EncrustingPlanPage() {
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
  const encrustments: EncrustmentPlannerEntry[] =
    artifact.entities.encrustments.map(
      ({
        id,
        canonicalKey,
        slug,
        name,
        inputs,
        tool,
        hidden,
        skillLevel,
        slots,
        instability,
      }) => ({
        id,
        canonicalKey,
        slug,
        name,
        inputs,
        tool,
        hidden,
        skillLevel,
        slots,
        instability,
      }),
    );

  return (
    <article className="detail-page">
      <nav aria-label="Breadcrumb" className="breadcrumb">
        <Link href="/">Home</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Encrustment planner</span>
      </nav>

      <header className="detail-header">
        <div>
          <p className="eyebrow">Differentiating tool</p>
          <h1 className="detail-title">Encrustment ingredient planner</h1>
          <p className="detail-copy">
            Multiply an encrustment&apos;s declared inputs, expand craftable
            ingredients, and build a combined base-ingredient list.
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
            <dt>Application rules</dt>
            <dd>Not inferred</dd>
          </div>
        </dl>
      </header>

      <Suspense
        fallback={
          <div className="empty-state" role="status">
            Loading encrustment controls…
          </div>
        }
      >
        <EncrustmentPlanner
          items={items}
          recipes={recipes}
          encrustments={encrustments}
        />
      </Suspense>
    </article>
  );
}
