"use client";

import type { ReactNode } from "react";

import {
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
  return (
    <RelationshipPreview
      preview={<EncrustmentSummaryCard summary={summary} variant="preview" />}
      previewName={summary.name}
      previewTitle={`Encrustment preview: ${summary.name}`}
    >
      {children}
    </RelationshipPreview>
  );
}
