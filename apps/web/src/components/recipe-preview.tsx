"use client";

import type { ReactNode } from "react";

import { RelationshipPreview } from "@/components/relationship-preview";
import {
  RecipeSummaryCard,
  type RecipeSummaryData,
} from "@/components/recipe-summary-card";

export function RecipePreview({
  children,
  summary,
}: {
  children: ReactNode;
  summary: RecipeSummaryData;
}) {
  return (
    <RelationshipPreview
      preview={<RecipeSummaryCard summary={summary} variant="preview" />}
      previewName={summary.name}
      previewTitle={`Recipe preview: ${summary.name}`}
    >
      {children}
    </RelationshipPreview>
  );
}
