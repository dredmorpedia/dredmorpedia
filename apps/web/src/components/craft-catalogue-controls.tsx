"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  CatalogueDisplayControls,
  type CatalogueLayout,
  type CatalogueSettingOption,
} from "@/components/catalogue-display-controls";
import {
  craftCatalogueToolPath,
  defaultCraftCatalogueView,
  type CraftCataloguePageSize,
  type CraftCatalogueSort,
  type CraftCatalogueTool,
  type CraftCatalogueView,
} from "@/lib/craft-catalogue";

export interface CraftCatalogueNavigationEntry extends CraftCatalogueTool {
  href: string;
  iconUrl: string | null;
}

interface StoredCraftPreferences extends CraftCatalogueView {
  toolLayout: CatalogueLayout;
}

interface CraftCatalogueControlsProps {
  activeTool: Pick<CraftCatalogueTool, "segment" | "tag">;
  activeView: CraftCatalogueView;
  redirectToStoredView?: boolean;
  tools: readonly CraftCatalogueNavigationEntry[];
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
    description: "Keep every crafting-tool name visible.",
  },
];

const sortOptions: readonly CatalogueSettingOption<CraftCatalogueSort>[] = [
  {
    value: "game",
    label: "Game order",
    description: "Source and XML order, matching the preserved catalogue.",
  },
  {
    value: "name",
    label: "Name (A–Z)",
    description: "Alphabetical by displayed English recipe name.",
  },
  {
    value: "skill",
    label: "First output level",
    description:
      "Lowest declared source level first; no skill name is inferred.",
  },
];

const pageSizeOptions: readonly CatalogueSettingOption<CraftCataloguePageSize>[] =
  [
    { value: 24, label: "24" },
    { value: 36, label: "36 (default)" },
    { value: "all", label: "All for this tool" },
  ];

const storageKey = "dredmorpedia:craft-catalogue-preferences:v1";
const preferenceListeners = new Set<() => void>();
let preferenceSnapshot: StoredCraftPreferences | null | undefined;

function isPageSize(value: unknown): value is CraftCataloguePageSize {
  return value === 24 || value === 36 || value === "all";
}

function isSort(value: unknown): value is CraftCatalogueSort {
  return ["game", "name", "skill"].includes(String(value));
}

function readStoredPreferences(): StoredCraftPreferences | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    ) as Partial<StoredCraftPreferences> | null;
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

function getPreferenceSnapshot(): StoredCraftPreferences | null {
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

function storePreferences(preferences: StoredCraftPreferences): void {
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

function ToolNavigationItem({
  activeToolTag,
  candidate,
}: {
  activeToolTag: string;
  candidate: CraftCatalogueNavigationEntry;
}) {
  return (
    <li>
      <Link
        aria-current={candidate.tag === activeToolTag ? "page" : undefined}
        aria-label={`${candidate.label}, ${candidate.count} ${
          candidate.count === 1 ? "recipe" : "recipes"
        }`}
        href={candidate.href}
        title={candidate.label}
      >
        {candidate.iconUrl ? (
          // The visible detailed label and link title identify the toolkit.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            height={48}
            src={candidate.iconUrl}
            title={candidate.label}
            width={48}
          />
        ) : (
          <span aria-hidden="true" className="catalogue-art-placeholder">
            ?
          </span>
        )}
        <span className="craft-tool-label">{candidate.label}</span>
        <small>{candidate.count}</small>
      </Link>
    </li>
  );
}

export function CraftCatalogueControls({
  activeTool,
  activeView,
  redirectToStoredView = false,
  tools,
}: CraftCatalogueControlsProps) {
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
    const storedPath = craftCatalogueToolPath(activeTool, 1, storedPreferences);
    const currentPath = craftCatalogueToolPath(activeTool, 1, activeView);
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
    router.push(craftCatalogueToolPath(activeTool, 1, view));
  }

  function resetView() {
    setDraftSort(defaultCraftCatalogueView.sort);
    setDraftPageSize(defaultCraftCatalogueView.pageSize);
    clearPreferences();
    setOpen(false);
    router.push(craftCatalogueToolPath(activeTool));
  }

  return (
    <>
      <CatalogueDisplayControls
        description="Choose how recipes are arranged. Preferences stay in this browser."
        layout={toolLayout}
        layoutLabel="Tool display"
        layoutLegend="Tool chooser"
        layoutName="craft-tool-layout"
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
        pageSizeLegend="Recipes per page"
        pageSizeName="craft-page-size"
        pageSizeOptions={pageSizeOptions}
        sort={draftSort}
        sortLegend="Recipe order"
        sortName="recipe-order"
        sortOptions={sortOptions}
        title="Craft display settings"
      />

      <nav
        aria-label="Crafting tools"
        className="craft-tool-nav"
        data-layout={toolLayout}
      >
        <ul className="craft-tool-list">
          {tools.map((candidate) => (
            <ToolNavigationItem
              activeToolTag={activeTool.tag}
              candidate={candidate}
              key={candidate.tag}
            />
          ))}
        </ul>
      </nav>
    </>
  );
}
