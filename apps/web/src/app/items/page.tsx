import type { Metadata } from "next";

import { ItemCataloguePage } from "@/components/item-catalogue-page";

export const metadata: Metadata = {
  title: "Items",
  description:
    "Browse Dungeons of Dredmor items by familiar category with visible stats and crafting relationships.",
};

export default function ItemsPage() {
  return <ItemCataloguePage page={1} redirectToStoredView />;
}
