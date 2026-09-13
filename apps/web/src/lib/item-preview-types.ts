import type { StatModifierKind } from "@dredmorpedia/domain";

import type { ItemTriggerPresentation } from "@/components/item-trigger-effect";
import type { SourceMarker } from "./source-markers";
import type { StatLinkPresentation } from "./stat-presentation-types";

export interface ItemPreviewData {
  category: string;
  description: string;
  effects: {
    iconUrl: string | null;
    spell: { name: string; slug: string } | null;
    trigger: ItemTriggerPresentation;
  }[];
  engineReference: boolean;
  facts: { label: string; value: string }[];
  iconUrl: string | null;
  modifiers: {
    group: StatModifierKind | "other" | "random";
    label: string;
    stat: StatLinkPresentation | null;
    value: string;
  }[];
  name: string;
  remainingEffects: number;
  slug: string;
  sourceMarker: SourceMarker | null;
}
