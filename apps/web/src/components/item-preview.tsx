"use client";

import Link from "next/link";
import { type ReactNode, useCallback, useRef, useState } from "react";

import { ItemPreviewCard } from "@/components/item-preview-card";
import { RelationshipPreview } from "@/components/relationship-preview";
import { loadItemPreview } from "@/lib/item-preview-data";
import type { ItemPreviewData } from "@/lib/item-preview-types";

export function ItemPreview({
  children,
  itemName,
  itemSlug,
}: {
  children: ReactNode;
  itemName: string;
  itemSlug: string;
}) {
  const requested = useRef(false);
  const [failure, setFailure] = useState(false);
  const [summary, setSummary] = useState<ItemPreviewData | null>(null);
  const requestPreview = useCallback(() => {
    if (requested.current) return;
    requested.current = true;
    setFailure(false);
    void loadItemPreview(itemSlug).then(setSummary, () => {
      requested.current = false;
      setFailure(true);
    });
  }, [itemSlug]);

  return (
    <RelationshipPreview
      onPreviewRequest={requestPreview}
      previewName={itemName}
      previewTitle={`Item preview: ${itemName}`}
      preview={
        summary ? (
          <ItemPreviewCard summary={summary} />
        ) : failure ? (
          <p className="recipe-preview-status" role="alert">
            Item preview is unavailable.{" "}
            <Link className="entity-link" href={`/items/${itemSlug}`}>
              Open full item details
            </Link>
            .
          </p>
        ) : (
          <p aria-live="polite" className="recipe-preview-status">
            Loading item preview…
          </p>
        )
      }
    >
      {children}
    </RelationshipPreview>
  );
}
