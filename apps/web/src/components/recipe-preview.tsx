"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useRef, useState } from "react";

import { RelationshipPreview } from "@/components/relationship-preview";
import {
  RecipeSummaryCard,
  type RecipeSummaryData,
} from "@/components/recipe-summary-card";
import { loadRecipePreview } from "@/lib/catalogue-preview-data";

export function RecipePreview({
  children,
  previewName,
  recipeId,
  recipeSlug,
}: {
  children: ReactNode;
  previewName: string;
  recipeId: string;
  recipeSlug: string;
}) {
  const requested = useRef(false);
  const [failure, setFailure] = useState(false);
  const [summary, setSummary] = useState<RecipeSummaryData | null>(null);
  const requestPreview = useCallback(() => {
    if (requested.current) {
      return;
    }
    requested.current = true;
    setFailure(false);
    void loadRecipePreview(recipeId).then(setSummary, () => {
      requested.current = false;
      setFailure(true);
    });
  }, [recipeId]);

  const preview = summary ? (
    <RecipeSummaryCard summary={summary} variant="preview" />
  ) : failure ? (
    <p className="recipe-preview-status" role="alert">
      Recipe preview is unavailable.{" "}
      <Link className="entity-link" href={`/recipes/${recipeSlug}`}>
        Open full recipe details
      </Link>
      .
    </p>
  ) : (
    <p aria-live="polite" className="recipe-preview-status">
      Loading recipe preview…
    </p>
  );

  return (
    <RelationshipPreview
      onPreviewRequest={requestPreview}
      preview={preview}
      previewName={previewName}
      previewTitle={`Recipe preview: ${previewName}`}
    >
      {children}
    </RelationshipPreview>
  );
}
