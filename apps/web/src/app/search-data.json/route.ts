import { loadSearchArtifact } from "@/lib/artifact";

export const dynamic = "force-static";

export function GET() {
  return Response.json(loadSearchArtifact(), {
    headers: {
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
