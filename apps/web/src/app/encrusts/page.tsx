import type { Metadata } from "next";

import { EncrustCataloguePage } from "@/components/encrust-catalogue-page";

export const metadata: Metadata = {
  title: "Encrusts",
  description:
    "Browse Dungeons of Dredmor encrustments by toolkit with ingredients, applicability, direct outcomes, and declared instability.",
};

export default function EncrustsPage() {
  return <EncrustCataloguePage redirectToStoredView />;
}
