import type { Metadata } from "next";

import { EncrustCataloguePage } from "@/components/encrust-catalogue-page";
import { loadArtifact } from "@/lib/artifact";
import {
  createEncrustCatalogueTools,
  encrustCatalogueToolForSegment,
} from "@/lib/encrust-catalogue";

export const dynamicParams = false;

export function generateStaticParams() {
  const artifact = loadArtifact();
  return createEncrustCatalogueTools(
    artifact.entities.encrustments,
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
  const tool = encrustCatalogueToolForSegment(
    createEncrustCatalogueTools(
      artifact.entities.encrustments,
      artifact.entities.items,
    ),
    segment,
  );
  return tool
    ? {
        title: `${tool.label} encrusts`,
        description: `Browse ${tool.label} encrustments in source order.`,
      }
    : { title: "Encrusting tool not found" };
}

export default async function EncrustToolPage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool } = await params;
  return <EncrustCataloguePage toolSegment={tool} />;
}
