"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  CatalogueDisplayControls,
  type CatalogueLayout,
  type CatalogueSettingOption,
} from "@/components/catalogue-display-controls";
import {
  CatalogueToolNavigation,
  type CatalogueToolNavigationEntry,
} from "@/components/catalogue-tool-navigation";
import {
  defaultEncrustCatalogueView,
  encrustCatalogueToolPath,
  type EncrustCataloguePageSize,
  type EncrustCatalogueSort,
  type EncrustCatalogueTool,
  type EncrustCatalogueView,
} from "@/lib/encrust-catalogue";

export interface EncrustCatalogueNavigationEntry
  extends EncrustCatalogueTool, CatalogueToolNavigationEntry {}

interface StoredEncrustPreferences extends EncrustCatalogueView {
  toolLayout: CatalogueLayout;
}

interface EncrustCatalogueControlsProps {
  activeTool: Pick<EncrustCatalogueTool, "segment" | "tag">;
  activeView: EncrustCatalogueView;
  redirectToStoredView?: boolean;
  tools: readonly EncrustCatalogueNavigationEntry[];
}

const layoutOptions: readonly CatalogueSettingOption<CatalogueLayout>[] = [
  {
    value: "compact",
    label: "Compact icons",
    description: "A quick strip with counts and image titles.",
  },
  {
    value: "expanded",
    label: "Detailed tools",
    description: "Keep every encrusting-tool name visible.",
  },
];

const sortOptions: readonly CatalogueSettingOption<EncrustCatalogueSort>[] = [
  {
    value: "game",
    label: "Game order",
    description: "Source and XML order, matching the preserved catalogue.",
  },
  {
    value: "name",
    label: "Name (A–Z)",
    description: "Alphabetical by displayed English encrustment name.",
  },
  {
    value: "skill",
    label: "Required source level",
    description: "Lowest declared source level first; no skill is inferred.",
  },
  {
    value: "instability",
    label: "Instability",
    description: "Lowest declared instability value first.",
  },
];

const pageSizeOptions: readonly CatalogueSettingOption<EncrustCataloguePageSize>[] =
  [
    { value: 12, label: "12" },
    { value: 24, label: "24" },
    { value: "all", label: "All for this tool (default)" },
  ];

const storageKey = "dredmorpedia:encrust-catalogue-preferences:v1";
const preferenceListeners = new Set<() => void>();
let preferenceSnapshot: StoredEncrustPreferences | null | undefined;

function isPageSize(value: unknown): value is EncrustCataloguePageSize {
  return value === 12 || value === 24 || value === "all";
}

function isSort(value: unknown): value is EncrustCatalogueSort {
  return ["game", "name", "skill", "instability"].includes(String(value));
}

function readStoredPreferences(): StoredEncrustPreferences | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    ) as Partial<StoredEncrustPreferences> | null;
    if (
      !parsed ||
      !isSort(parsed.sort) ||
      !isPageSize(parsed.pageSize) ||
      (parsed.toolLayout !== "compact" && parsed.toolLayout !== "expanded")
    ) {
      return null;
    }
    return {
      sort: parsed.sort,
      pageSize: parsed.pageSize,
      toolLayout: parsed.toolLayout,
    };
  } catch {
    return null;
  }
}

function getPreferenceSnapshot(): StoredEncrustPreferences | null {
  preferenceSnapshot ??= readStoredPreferences();
  return preferenceSnapshot;
}

function subscribeToPreferences(listener: () => void): () => void {
  preferenceListeners.add(listener);
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) {
      preferenceSnapshot = readStoredPreferences();
      listener();
    }
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    preferenceListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function notifyPreferenceListeners(): void {
  for (const listener of preferenceListeners) {
    listener();
  }
}

function storePreferences(preferences: StoredEncrustPreferences): void {
  preferenceSnapshot = preferences;
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // A blocked storage API must not prevent the catalogue from working.
  }
  notifyPreferenceListeners();
}

function clearPreferences(): void {
  preferenceSnapshot = null;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    // A blocked storage API must not prevent the reset navigation.
  }
  notifyPreferenceListeners();
}

export function EncrustCatalogueControls({
  activeTool,
  activeView,
  redirectToStoredView = false,
  tools,
}: EncrustCatalogueControlsProps) {
  const router = useRouter();
  const storedPreferences = useSyncExternalStore(
    subscribeToPreferences,
    getPreferenceSnapshot,
    () => null,
  );
  const toolLayout = storedPreferences?.toolLayout ?? "compact";
  const [draftSort, setDraftSort] = useState(activeView.sort);
  const [draftPageSize, setDraftPageSize] = useState(activeView.pageSize);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!storedPreferences || !redirectToStoredView) {
      return;
    }
    const storedPath = encrustCatalogueToolPath(
      activeTool,
      1,
      storedPreferences,
    );
    const currentPath = encrustCatalogueToolPath(activeTool, 1, activeView);
    if (storedPath !== currentPath) {
      router.replace(storedPath);
    }
  }, [activeTool, activeView, redirectToStoredView, router, storedPreferences]);

  function updateToolLayout(layout: CatalogueLayout) {
    storePreferences({
      sort: activeView.sort,
      pageSize: activeView.pageSize,
      toolLayout: layout,
    });
  }

  function applyView() {
    const view = { sort: draftSort, pageSize: draftPageSize };
    storePreferences({ ...view, toolLayout });
    setOpen(false);
    router.push(encrustCatalogueToolPath(activeTool, 1, view));
  }

  function resetView() {
    setDraftSort(defaultEncrustCatalogueView.sort);
    setDraftPageSize(defaultEncrustCatalogueView.pageSize);
    clearPreferences();
    setOpen(false);
    router.push(encrustCatalogueToolPath(activeTool));
  }

  return (
    <>
      <CatalogueDisplayControls
        description="Choose how encrustments are arranged. Preferences stay in this browser."
        layout={toolLayout}
        layoutLabel="Tool display"
        layoutLegend="Tool chooser"
        layoutName="encrust-tool-layout"
        layoutOptions={layoutOptions}
        onApply={applyView}
        onLayoutChange={updateToolLayout}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) {
            setDraftSort(activeView.sort);
            setDraftPageSize(activeView.pageSize);
          }
        }}
        onPageSizeChange={setDraftPageSize}
        onReset={resetView}
        onSortChange={setDraftSort}
        open={open}
        pageSize={draftPageSize}
        pageSizeLegend="Encrustments per page"
        pageSizeName="encrust-page-size"
        pageSizeOptions={pageSizeOptions}
        sort={draftSort}
        sortLegend="Encrustment order"
        sortName="encrustment-order"
        sortOptions={sortOptions}
        title="Encrust display settings"
      />

      <CatalogueToolNavigation
        activeToolTag={activeTool.tag}
        anchorId="encrusting-tools"
        ariaLabel="Encrusting tools"
        entries={tools}
        itemNounPlural="encrustments"
        itemNounSingular="encrustment"
        layout={toolLayout}
        returnLabel="encrusting tools"
      />
    </>
  );
}
