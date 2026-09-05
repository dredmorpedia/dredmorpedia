"use client";

import { Eye } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

export function RelationshipPreview({
  children,
  onPreviewRequest,
  preview,
  previewName,
  previewTitle,
}: {
  children: ReactNode;
  onPreviewRequest?: () => void;
  preview: ReactNode;
  previewName: string;
  previewTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const openSource = useRef<"focus" | "hover" | "press">("press");
  const hoverOpenTimer = useRef<number | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const pointerFocus = useRef(false);
  const previewContainer = useRef<HTMLDivElement>(null);
  const suppressRestoredFocus = useRef(false);

  function clearHoverOpen() {
    if (hoverOpenTimer.current !== null) {
      window.clearTimeout(hoverOpenTimer.current);
      hoverOpenTimer.current = null;
    }
  }

  function clearHoverClose() {
    if (hoverCloseTimer.current !== null) {
      window.clearTimeout(hoverCloseTimer.current);
      hoverCloseTimer.current = null;
    }
  }

  function beginMousePreview() {
    clearHoverClose();
    if (open) {
      return;
    }
    clearHoverOpen();
    hoverOpenTimer.current = window.setTimeout(() => {
      openSource.current = "hover";
      setOpen(true);
    }, 200);
  }

  function endMousePreview() {
    clearHoverOpen();
    if (openSource.current !== "hover") {
      return;
    }
    clearHoverClose();
    hoverCloseTimer.current = window.setTimeout(() => {
      setOpen(false);
    }, 200);
  }

  useEffect(
    () => () => {
      if (hoverOpenTimer.current !== null) {
        window.clearTimeout(hoverOpenTimer.current);
      }
      if (hoverCloseTimer.current !== null) {
        window.clearTimeout(hoverCloseTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (open) {
      onPreviewRequest?.();
    }
  }, [onPreviewRequest, open]);

  useEffect(() => {
    if (!open || openSource.current === "hover") {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const container = previewContainer.current;
      const target = container?.querySelector<HTMLElement>(
        "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
      );
      if (target && !container?.contains(document.activeElement)) {
        target.focus();
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open, preview]);

  return (
    <Popover
      onOpenChange={(nextOpen, eventDetails) => {
        if (nextOpen && eventDetails.reason === "trigger-press") {
          openSource.current = "press";
        }
        if (
          !nextOpen &&
          eventDetails.reason === "escape-key" &&
          document.activeElement instanceof Element &&
          document.activeElement.closest(".relationship-preview-popup")
        ) {
          // Base UI restores focus to the trigger after Escape. Do not let
          // that restoration immediately open the preview again.
          suppressRestoredFocus.current = true;
        }
        setOpen(nextOpen);
      }}
      open={open}
    >
      <div
        aria-label={previewName}
        className="recipe-relationship-primary recipe-preview-target"
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            beginMousePreview();
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") {
            endMousePreview();
          }
        }}
        role="group"
      >
        {children}
        <PopoverTrigger
          aria-label={`Preview ${previewName}`}
          className="recipe-preview-trigger"
          onFocus={() => {
            if (suppressRestoredFocus.current) {
              suppressRestoredFocus.current = false;
              return;
            }
            if (pointerFocus.current) {
              return;
            }
            openSource.current = "focus";
            setOpen(true);
          }}
          onPointerDown={() => {
            clearHoverOpen();
            openSource.current = "press";
            pointerFocus.current = true;
            window.setTimeout(() => {
              pointerFocus.current = false;
            });
          }}
          title={`Preview ${previewName}`}
        >
          <Eye aria-hidden="true" size={16} />
        </PopoverTrigger>
      </div>
      <PopoverContent
        className="recipe-preview-popup relationship-preview-popup"
        finalFocus={() => openSource.current !== "hover"}
        initialFocus={() => {
          if (openSource.current === "hover") {
            return false;
          }
          return (
            previewContainer.current?.querySelector<HTMLElement>(
              "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
            ) ?? true
          );
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") {
            clearHoverClose();
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") {
            endMousePreview();
          }
        }}
      >
        <PopoverTitle className="sr-only">{previewTitle}</PopoverTitle>
        <div ref={previewContainer}>{preview}</div>
      </PopoverContent>
    </Popover>
  );
}
