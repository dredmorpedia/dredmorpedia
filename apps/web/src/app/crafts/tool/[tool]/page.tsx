import type { Metadata } from "next";

import { CraftCataloguePage } from "@/components/craft-catalogue-page";
import { loadArtifact } from "@/lib/artifact";
import {
  craftCatalogueToolForSegment,
  createCraftCatalogueTools,
} from "@/lib/craft-catalogue";

export const dynamicParams = false;

export function generateStaticParams() {
  const artifact = loadArtifact();
  return createCraftCatalogueTools(
    artifact.entities.recipes,
    artifact.entities.items,
  ).map((tool) => ({ tool: tool.segment }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>;
}): Promise<Metadata> {
  const { tool: segment } = await params;
  const artifact = loadArtifact();
  const tool = craftCatalogueToolForSegment(
    createCraftCatalogueTools(
      artifact.entities.recipes,
      artifact.entities.items,
    ),
    segment,
  );
  return tool
    ? {
        title: `${tool.label} crafts`,
        description: `Browse ${tool.label} recipes in source order.`,
      }
    : { title: "Crafting tool not found" };
}

export default async function CraftToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  return <CraftCataloguePage toolSegment={tool} />;
}
