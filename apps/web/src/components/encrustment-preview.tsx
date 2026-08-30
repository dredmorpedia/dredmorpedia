"use client";

import type { ReactNode } from "react";

import {
  encrustmentSummaryAccessibleName,
  EncrustmentSummaryCard,
  type EncrustmentSummaryData,
} from "@/components/encrustment-summary-card";
import { RelationshipPreview } from "@/components/relationship-preview";

export function EncrustmentPreview({
  children,
  summary,
}: {
  children: ReactNode;
  summary: EncrustmentSummaryData;
}) {
  const accessibleName = encrustmentSummaryAccessibleName(summary);
  return (
    <RelationshipPreview
      preview={<EncrustmentSummaryCard summary={summary} variant="preview" />}
      previewName={accessibleName}
      previewTitle={`Encrustment preview: ${accessibleName}`}
    >
      {children}
    </RelationshipPreview>
  );
}
