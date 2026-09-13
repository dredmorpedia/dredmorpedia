import { loadArtifact, loadArtifactSha256 } from "@/lib/artifact";
import { createItemPreviewData } from "@/lib/item-preview-summary";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return loadArtifact().entities.items.map(({ slug }) => ({ slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const artifact = loadArtifact();
  const item = artifact.entities.items.find((item) => item.slug === slug);
  if (!item) {
    return new Response(null, { status: 404 });
  }
  return Response.json(
    {
      schemaVersion: 1,
      item: createItemPreviewData(item, artifact, loadArtifactSha256()),
    },
    { headers: { "Cache-Control": "public, max-age=0, must-revalidate" } },
  );
}
