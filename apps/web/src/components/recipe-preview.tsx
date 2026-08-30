"use client";

import type { ReactNode } from "react";

import { RelationshipPreview } from "@/components/relationship-preview";
import {
  RecipeSummaryCard,
  type RecipeSummaryData,
  recipeSummaryAccessibleName,
} from "@/components/recipe-summary-card";

export function RecipePreview({
  children,
  summary,
}: {
  children: ReactNode;
  summary: RecipeSummaryData;
}) {
  const accessibleName = recipeSummaryAccessibleName(summary);
  return (
    <RelationshipPreview
      preview={<RecipeSummaryCard summary={summary} variant="preview" />}
      previewName={accessibleName}
      previewTitle={`Recipe preview: ${accessibleName}`}
    >
      {children}
    </RelationshipPreview>
  );
}
