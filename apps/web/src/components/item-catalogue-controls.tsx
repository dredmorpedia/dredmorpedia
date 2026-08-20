"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Drawer } from "@base-ui/react/drawer";
import { LayoutGrid, ListTree, Settings2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  defaultItemCatalogueView,
  itemCatalogueCategoryPath,
  itemCatalogueGroupOrder,
  type ItemCatalogueCategory,
  type ItemCataloguePageSize,
  type ItemCatalogueSort,
  type ItemCatalogueView,
} from "@/lib/item-catalogue";

type CategoryLayout = "compact" | "expanded";

export interface ItemCatalogueNavigationEntry extends ItemCatalogueCategory {
  href: string;
  iconUrl: string | null;
  representativeName: string;
}

interface StoredCataloguePreferences extends ItemCatalogueView {
  categoryLayout: CategoryLayout;
}

interface ItemCatalogueControlsProps {
  activeCategory: Pick<ItemCatalogueCategory, "key" | "segment">;
  activeView: ItemCatalogueView;
  categories: readonly ItemCatalogueNavigationEntry[];
  redirectToStoredView?: boolean;
}

function CategoryNavigationItem({
  activeCategoryKey,
  candidate,
}: {
  activeCategoryKey: string;
  candidate: ItemCatalogueNavigationEntry;
}) {
  return (
    <li>
      <Link
        aria-current={candidate.key === activeCategoryKey ? "page" : undefined}
        aria-label={`${candidate.label}, ${candidate.count} ${
          candidate.count === 1 ? "item" : "items"
        }`}
        href={candidate.href}
        title={`${candidate.label} — represented by ${candidate.representativeName}`}
      >
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

  function updateCategoryLayout(layout: CategoryLayout) {
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
      <div className="item-catalogue-toolbar">
        <div aria-label="Category display" className="catalogue-layout-toggle">
          <button
            aria-pressed={categoryLayout === "compact"}
            onClick={() => updateCategoryLayout("compact")}
            type="button"
          >
            <LayoutGrid aria-hidden="true" size={16} />
            Compact
          </button>
          <button
            aria-pressed={categoryLayout === "expanded"}
            onClick={() => updateCategoryLayout("expanded")}
            type="button"
          >
            <ListTree aria-hidden="true" size={16} />
            Detailed
          </button>
        </div>

        <Drawer.Root
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) {
              setDraftSort(activeView.sort);
              setDraftPageSize(activeView.pageSize);
            }
          }}
          open={open}
          swipeDirection="right"
        >
          <Drawer.Trigger className="catalogue-settings-trigger">
            <Settings2 aria-hidden="true" size={17} />
            Display settings
          </Drawer.Trigger>
          <Drawer.Portal>
            <Drawer.Backdrop className="catalogue-drawer-backdrop" />
            <Drawer.Viewport className="catalogue-drawer-viewport">
              <Drawer.Popup className="catalogue-drawer-popup">
                <Drawer.Content className="catalogue-drawer-content">
                  <div className="catalogue-drawer-heading">
                    <div>
                      <Drawer.Title className="catalogue-drawer-title">
                        Item display settings
                      </Drawer.Title>
                      <Drawer.Description className="catalogue-drawer-description">
                        Choose how this catalogue is arranged. Preferences stay
                        in this browser.
                      </Drawer.Description>
                    </div>
                    <Drawer.Close
                      aria-label="Close display settings"
                      className="catalogue-drawer-close"
                    >
                      <X aria-hidden="true" size={20} />
                    </Drawer.Close>
                  </div>

                  <fieldset className="catalogue-setting-group">
                    <legend>Category chooser</legend>
                    <label>
                      <input
                        checked={categoryLayout === "compact"}
                        name="category-layout"
                        onChange={() => updateCategoryLayout("compact")}
                        type="radio"
                      />
                      <span>
                        <strong>Compact icons</strong>
                        <small>
                          A quick, legacy-like strip with counts and image
                          titles.
                        </small>
                      </span>
                    </label>
                    <label>
                      <input
                        checked={categoryLayout === "expanded"}
                        name="category-layout"
                        onChange={() => updateCategoryLayout("expanded")}
                        type="radio"
                      />
                      <span>
                        <strong>Detailed categories</strong>
                        <small>Keep every category name visible.</small>
                      </span>
                    </label>
                  </fieldset>

                  <fieldset className="catalogue-setting-group">
                    <legend>Item order</legend>
                    {[
                      [
                        "game",
                        "Game order",
                        "Source and XML order, matching the preserved catalogue.",
                      ],
                      [
                        "name",
                        "Name (A–Z)",
                        "Alphabetical by displayed English name.",
                      ],
                      [
                        "quality",
                        "Quality (low to high)",
                        "A view preference, not a dungeon-availability claim.",
                      ],
                      [
                        "price",
                        "Value (low to high)",
                        "Unknown source values appear last.",
                      ],
                    ].map(([value, label, description]) => (
                      <label key={value}>
                        <input
                          checked={draftSort === value}
                          name="item-order"
                          onChange={() =>
                            setDraftSort(value as ItemCatalogueSort)
                          }
                          type="radio"
                        />
                        <span>
                          <strong>{label}</strong>
                          <small>{description}</small>
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <fieldset className="catalogue-setting-group">
                    <legend>Items per page</legend>
                    {[
                      [24, "24"],
                      [36, "36 (default)"],
                      ["all", "All in this category"],
                    ].map(([value, label]) => (
                      <label key={value}>
                        <input
                          checked={draftPageSize === value}
                          name="page-size"
                          onChange={() =>
                            setDraftPageSize(value as ItemCataloguePageSize)
                          }
                          type="radio"
                        />
                        <span>
                          <strong>{label}</strong>
                        </span>
                      </label>
                    ))}
                  </fieldset>

                  <div className="catalogue-drawer-actions">
                    <button
                      className="catalogue-settings-apply"
                      onClick={applyView}
                      type="button"
                    >
                      Apply settings
                    </button>
                    <button
                      className="catalogue-settings-reset"
                      onClick={resetView}
                      type="button"
                    >
                      Reset defaults
                    </button>
                  </div>
                </Drawer.Content>
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      </div>

      <nav
        aria-label="Item categories"
        className="item-category-nav"
        data-layout={categoryLayout}
      >
        {categoryLayout === "compact" ? (
          <ul className="item-category-compact-list">
            {categories.map((candidate) => (
              <CategoryNavigationItem
                activeCategoryKey={activeCategory.key}
                candidate={candidate}
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
                      key={candidate.key}
                    />
                  ))}
                </ul>
              </section>
            ) : null;
          })
        )}
      </nav>
    </>
  );
}
