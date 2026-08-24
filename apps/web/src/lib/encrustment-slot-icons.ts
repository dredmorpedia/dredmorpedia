import {
  canonicalKey,
  type DatasetArtifact,
  type PresentedUiAssetId,
} from "@dredmorpedia/domain";

import { titleCase } from "./display-labels";
import { uiIconUrl } from "./presented-assets";

export interface EncrustmentSlotPresentation {
  iconUrl: string | null;
  key: string;
  label: string;
}

export const encrustmentSlotIconIds = {
  neck: "encrust-slot-neck",
  chest: "encrust-slot-chest",
  waist: "encrust-slot-waist",
  feet: "encrust-slot-feet",
  ranged: "encrust-slot-ranged",
  hands: "encrust-slot-hands",
  head: "encrust-slot-head",
  legs: "encrust-slot-legs",
  ring: "encrust-slot-ring",
  shield: "encrust-slot-shield",
  weapon: "encrust-slot-weapon",
} as const satisfies Record<string, PresentedUiAssetId>;

export function encrustmentSlotPresentation(
  slot: string,
  artifact: DatasetArtifact,
  artifactSha256: string,
): EncrustmentSlotPresentation {
  const key = canonicalKey(slot);
  const iconId = encrustmentSlotIconIds[
    key as keyof typeof encrustmentSlotIconIds
  ] as PresentedUiAssetId | undefined;
  return {
    iconUrl: iconId ? uiIconUrl(iconId, artifact, artifactSha256) : null,
    key,
    label: titleCase(slot),
  };
}
