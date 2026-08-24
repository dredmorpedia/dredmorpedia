"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";

import {
  CatalogueDisplayControls,
  type CatalogueLayout,
  type CatalogueSettingOption,
} from "@/components/catalogue-display-controls";
import { useFloatingCatalogueTab } from "@/components/use-floating-catalogue-tab";
import {
  defaultItemCatalogueView,
  itemCatalogueCategoryPath,
  itemCatalogueGroupOrder,
  type ItemCatalogueCategory,
  type ItemCataloguePageSize,
  type ItemCatalogueSort,
  type ItemCatalogueView,
} from "@/lib/item-catalogue";

export interface ItemCatalogueNavigationEntry extends ItemCatalogueCategory {
  href: string;
  iconUrl: string | null;
  representativeName: string;
}

interface StoredCataloguePreferences extends ItemCatalogueView {
  categoryLayout: CatalogueLayout;
}

interface ItemCatalogueControlsProps {
  activeCategory: Pick<ItemCatalogueCategory, "key" | "segment">;
  activeView: ItemCatalogueView;
  categories: readonly ItemCatalogueNavigationEntry[];
  redirectToStoredView?: boolean;
}

const layoutOptions: readonly CatalogueSettingOption<CatalogueLayout>[] = [
  {
    value: "compact",
    label: "Compact icons",
    description: "A quick, legacy-like strip with counts and image titles.",
  },
  {
    value: "expanded",
    label: "Detailed categories",
    description: "Keep every category name visible.",
  },
];

const sortOptions: readonly CatalogueSettingOption<ItemCatalogueSort>[] = [
  {
    value: "game",
    label: "Game order",
    description: "Source and XML order, matching the preserved catalogue.",
  },
  {
    value: "name",
    label: "Name (A–Z)",
    description: "Alphabetical by displayed English name.",
  },
  {
    value: "quality",
    label: "Quality (low to high)",
    description: "A view preference, not a dungeon-availability claim.",
  },
  {
    value: "price",
    label: "Value (low to high)",
    description: "Unknown source values appear last.",
  },
];

const pageSizeOptions: readonly CatalogueSettingOption<ItemCataloguePageSize>[] =
  [
    { value: 24, label: "24" },
    { value: 36, label: "36 (default)" },
    { value: "all", label: "All in this category" },
  ];

function CategoryNavigationItem({
  activeCategoryKey,
  candidate,
  floating,
}: {
  activeCategoryKey: string;
  candidate: ItemCatalogueNavigationEntry;
  floating: boolean;
}) {
  const active = candidate.key === activeCategoryKey;
  const floatingActive = active && floating;
  return (
    <li className={active ? "catalogue-active-tab-slot" : undefined}>
      <Link
        aria-current={active ? "page" : undefined}
        aria-label={
          floatingActive
            ? `Back to item categories; current category: ${candidate.label}`
            : `${candidate.label}, ${candidate.count} ${
                candidate.count === 1 ? "item" : "items"
              }`
        }
        data-floating={floatingActive ? "" : undefined}
        href={floatingActive ? "#item-categories" : candidate.href}
        title={
          floatingActive
            ? `Back to item categories — ${candidate.label}`
            : `${candidate.label} — represented by ${candidate.representativeName}`
        }
      >
        <span aria-hidden="true" className="catalogue-floating-arrow">
          <ArrowUp size={16} strokeWidth={2.2} />
        </span>
        {candidate.iconUrl ? (
          // The title identifies which representative game item supplies the category art.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            height={40}
            src={candidate.iconUrl}
            title={candidate.representativeName}
            width={40}
          />
        ) : (
          <span aria-hidden="true" className="catalogue-art-placeholder">
            ?
          </span>
        )}
        <span className="item-category-label">{candidate.label}</span>
        <small>{candidate.count}</small>
      </Link>
    </li>
  );
}

const storageKey = "dredmorpedia:item-catalogue-preferences:v1";
const preferenceListeners = new Set<() => void>();
let preferenceSnapshot: StoredCataloguePreferences | null | undefined;

function isPageSize(value: unknown): value is ItemCataloguePageSize {
  return value === 24 || value === 36 || value === "all";
}

function isSort(value: unknown): value is ItemCatalogueSort {
  return ["game", "name", "quality", "price"].includes(String(value));
}

function readStoredPreferences(): StoredCataloguePreferences | null {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    ) as Partial<StoredCataloguePreferences> | null;
    if (
      !parsed ||
      !isSort(parsed.sort) ||
      !isPageSize(parsed.pageSize) ||
      (parsed.categoryLayout !== "compact" &&
        parsed.categoryLayout !== "expanded")
    ) {
      return null;
    }
    return {
      sort: parsed.sort,
      pageSize: parsed.pageSize,
      categoryLayout: parsed.categoryLayout,
    };
  } catch {
    return null;
  }
}

function getPreferenceSnapshot(): StoredCataloguePreferences | null {
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

function storePreferences(preferences: StoredCataloguePreferences): void {
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

export function ItemCatalogueControls({
  activeCategory,
  activeView,
  categories,
  redirectToStoredView = false,
}: ItemCatalogueControlsProps) {
  const router = useRouter();
  const { floating, sentinelRef } = useFloatingCatalogueTab();
  const storedPreferences = useSyncExternalStore(
    subscribeToPreferences,
    getPreferenceSnapshot,
    () => null,
  );
  const categoryLayout = storedPreferences?.categoryLayout ?? "compact";
  const [draftSort, setDraftSort] = useState(activeView.sort);
  const [draftPageSize, setDraftPageSize] = useState(activeView.pageSize);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!storedPreferences) {
      return;
    }
    if (redirectToStoredView) {
      const storedPath = itemCatalogueCategoryPath(
        activeCategory,
        1,
        storedPreferences,
      );
      const currentPath = itemCatalogueCategoryPath(
        activeCategory,
        1,
        activeView,
      );
      if (storedPath !== currentPath) {
        router.replace(storedPath);
      }
    }
  }, [
    activeCategory,
    activeView,
    redirectToStoredView,
    router,
    storedPreferences,
  ]);

  function updateCategoryLayout(layout: CatalogueLayout) {
    storePreferences({
      sort: activeView.sort,
      pageSize: activeView.pageSize,
      categoryLayout: layout,
    });
  }

  function applyView() {
    const view = { sort: draftSort, pageSize: draftPageSize };
    storePreferences({ ...view, categoryLayout });
    setOpen(false);
    router.push(itemCatalogueCategoryPath(activeCategory, 1, view));
  }

  function resetView() {
    setDraftSort(defaultItemCatalogueView.sort);
    setDraftPageSize(defaultItemCatalogueView.pageSize);
    clearPreferences();
    setOpen(false);
    router.push(itemCatalogueCategoryPath(activeCategory));
  }

  return (
    <>
      <CatalogueDisplayControls
        description="Choose how this catalogue is arranged. Preferences stay in this browser."
        layout={categoryLayout}
        layoutLabel="Category display"
        layoutLegend="Category chooser"
        layoutName="category-layout"
        layoutOptions={layoutOptions}
        onApply={applyView}
        onLayoutChange={updateCategoryLayout}
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
        pageSizeLegend="Items per page"
        pageSizeName="page-size"
        pageSizeOptions={pageSizeOptions}
        sort={draftSort}
        sortLegend="Item order"
        sortName="item-order"
        sortOptions={sortOptions}
        title="Item display settings"
      />

      <nav
        aria-label="Item categories"
        className="item-category-nav"
        data-layout={categoryLayout}
        id="item-categories"
      >
        {categoryLayout === "compact" ? (
          <ul className="item-category-compact-list">
            {categories.map((candidate) => (
              <CategoryNavigationItem
                activeCategoryKey={activeCategory.key}
                candidate={candidate}
                floating={floating}
                key={candidate.key}
              />
            ))}
          </ul>
        ) : (
          itemCatalogueGroupOrder.map((group) => {
            const groupCategories = categories.filter(
              (candidate) => candidate.group === group,
            );
            return groupCategories.length > 0 ? (
              <section key={group} className="item-category-group">
                <h2>{group}</h2>
                <ul>
                  {groupCategories.map((candidate) => (
                    <CategoryNavigationItem
                      activeCategoryKey={activeCategory.key}
                      candidate={candidate}
                      floating={floating}
                      key={candidate.key}
                    />
                  ))}
                </ul>
              </section>
            ) : null;
          })
        )}
      </nav>
      <span
        aria-hidden="true"
        className="catalogue-floating-sentinel"
        ref={sentinelRef}
      />
    </>
  );
}
