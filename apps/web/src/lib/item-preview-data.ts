import type { ItemPreviewData } from "./item-preview-types";

const requests = new Map<string, Promise<ItemPreviewData>>();

async function fetchItemPreview(slug: string): Promise<ItemPreviewData> {
  const response = await fetch(`/item-previews/${slug}/summary.json`);
  if (!response.ok) {
    throw new Error(`Item preview returned HTTP ${response.status}.`);
  }
  const payload: unknown = await response.json();
  const { itemPreviewPayloadSchema } = await import("./item-preview-schema");
  const parsed = itemPreviewPayloadSchema.safeParse(payload);
  if (!parsed.success || parsed.data.item.slug !== slug) {
    throw new Error("Item preview returned an invalid payload.");
  }
  return parsed.data.item;
}

export async function loadItemPreview(slug: string): Promise<ItemPreviewData> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Item preview route is invalid.");
  }
  let request = requests.get(slug);
  if (!request) {
    request = fetchItemPreview(slug).catch((error: unknown) => {
      requests.delete(slug);
      throw error;
    });
    requests.set(slug, request);
  }
  return request;
}
