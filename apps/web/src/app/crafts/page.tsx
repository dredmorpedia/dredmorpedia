import type { Metadata } from "next";

import { CraftCataloguePage } from "@/components/craft-catalogue-page";

export const metadata: Metadata = {
  title: "Crafts",
  description:
    "Browse Dungeons of Dredmor recipes by crafting tool with ingredients, output art, and source levels.",
};

export default function CraftsPage() {
  return <CraftCataloguePage redirectToStoredView />;
}
