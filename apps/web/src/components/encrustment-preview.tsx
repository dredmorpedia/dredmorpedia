"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useRef, useState } from "react";

import {
  EncrustmentSummaryCard,
  type EncrustmentSummaryData,
} from "@/components/encrustment-summary-card";
import { RelationshipPreview } from "@/components/relationship-preview";
import { loadEncrustmentPreview } from "@/lib/catalogue-preview-data";

export function EncrustmentPreview({
  children,
  encrustmentId,
  encrustmentSlug,
  previewName,
}: {
  children: ReactNode;
  encrustmentId: string;
  encrustmentSlug: string;
  previewName: string;
}) {
  const requested = useRef(false);
  const [failure, setFailure] = useState(false);
  const [summary, setSummary] = useState<EncrustmentSummaryData | null>(null);
  const requestPreview = useCallback(() => {
    if (requested.current) {
      return;
    }
    requested.current = true;
    setFailure(false);
    void loadEncrustmentPreview(encrustmentId).then(setSummary, () => {
      requested.current = false;
      setFailure(true);
    });
  }, [encrustmentId]);

  const preview = summary ? (
    <EncrustmentSummaryCard summary={summary} variant="preview" />
  ) : failure ? (
    <p className="recipe-preview-status" role="alert">
      Encrustment preview is unavailable.{" "}
      <Link className="entity-link" href={`/encrustments/${encrustmentSlug}`}>
        Open full encrustment details
      </Link>
      .
    </p>
  ) : (
    <p aria-live="polite" className="recipe-preview-status">
      Loading encrustment preview…
    </p>
  );

  return (
    <RelationshipPreview
      onPreviewRequest={requestPreview}
      preview={preview}
      previewName={previewName}
      previewTitle={`Encrustment preview: ${previewName}`}
    >
      {children}
    </RelationshipPreview>
  );
}
