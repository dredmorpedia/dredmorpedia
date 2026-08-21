"use client";

import { Eye } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  const [open, setOpen] = useState(false);
  const openSource = useRef<"focus" | "hover" | "press">("press");
  const hoverOpenTimer = useRef<number | null>(null);
  const hoverCloseTimer = useRef<number | null>(null);
  const pointerFocus = useRef(false);
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
          document.activeElement.closest(".recipe-preview-popup")
        ) {
          // Base UI restores focus to the trigger after Escape. Do not let
          // that restoration immediately open the preview again.
          suppressRestoredFocus.current = true;
        }
        setOpen(nextOpen);
      }}
      open={open}
    >
      <span
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
      >
        {children}
        <PopoverTrigger
          aria-label={`Preview ${summary.name}`}
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
          title={`Preview ${summary.name}`}
        >
          <Eye aria-hidden="true" size={16} />
        </PopoverTrigger>
      </span>
      <PopoverContent
        className="recipe-preview-popup"
        finalFocus={() => openSource.current !== "hover"}
        initialFocus={() => openSource.current !== "hover"}
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
        <PopoverTitle className="sr-only">
          Recipe preview: {summary.name}
        </PopoverTitle>
        <RecipeSummaryCard summary={summary} variant="preview" />
      </PopoverContent>
    </Popover>
  );
}
