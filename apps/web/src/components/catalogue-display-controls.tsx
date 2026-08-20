"use client";

import { Drawer } from "@base-ui/react/drawer";
import { LayoutGrid, ListTree, Settings2, X } from "lucide-react";

export type CatalogueLayout = "compact" | "expanded";
type CatalogueSettingValue = string | number;

export interface CatalogueSettingOption<Value extends CatalogueSettingValue> {
  description?: string;
  label: string;
  value: Value;
}

function CatalogueSettingGroup<Value extends CatalogueSettingValue>({
  legend,
  name,
  onChange,
  options,
  value,
}: {
  legend: string;
  name: string;
  onChange: (value: Value) => void;
  options: readonly CatalogueSettingOption<Value>[];
  value: Value;
}) {
  return (
    <fieldset className="catalogue-setting-group">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value}>
          <input
            checked={value === option.value}
            name={name}
            onChange={() => onChange(option.value)}
            type="radio"
          />
          <span>
            <strong>{option.label}</strong>
            {option.description ? <small>{option.description}</small> : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

export function CatalogueDisplayControls<
  Sort extends string,
  PageSize extends CatalogueSettingValue,
>({
  description,
  layout,
  layoutLabel,
  layoutLegend,
  layoutName,
  layoutOptions,
  onApply,
  onLayoutChange,
  onOpenChange,
  onPageSizeChange,
  onReset,
  onSortChange,
  open,
  pageSize,
  pageSizeLegend,
  pageSizeName,
  pageSizeOptions,
  sort,
  sortLegend,
  sortName,
  sortOptions,
  title,
}: {
  description: string;
  layout: CatalogueLayout;
  layoutLabel: string;
  layoutLegend: string;
  layoutName: string;
  layoutOptions: readonly CatalogueSettingOption<CatalogueLayout>[];
  onApply: () => void;
  onLayoutChange: (layout: CatalogueLayout) => void;
  onOpenChange: (open: boolean) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onReset: () => void;
  onSortChange: (sort: Sort) => void;
  open: boolean;
  pageSize: PageSize;
  pageSizeLegend: string;
  pageSizeName: string;
  pageSizeOptions: readonly CatalogueSettingOption<PageSize>[];
  sort: Sort;
  sortLegend: string;
  sortName: string;
  sortOptions: readonly CatalogueSettingOption<Sort>[];
  title: string;
}) {
  return (
    <div className="catalogue-toolbar">
      <div aria-label={layoutLabel} className="catalogue-layout-toggle">
        <button
          aria-pressed={layout === "compact"}
          onClick={() => onLayoutChange("compact")}
          type="button"
        >
          <LayoutGrid aria-hidden="true" size={16} />
          Compact
        </button>
        <button
          aria-pressed={layout === "expanded"}
          onClick={() => onLayoutChange("expanded")}
          type="button"
        >
          <ListTree aria-hidden="true" size={16} />
          Detailed
        </button>
      </div>

      <Drawer.Root
        onOpenChange={onOpenChange}
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
                      {title}
                    </Drawer.Title>
                    <Drawer.Description className="catalogue-drawer-description">
                      {description}
                    </Drawer.Description>
                  </div>
                  <Drawer.Close
                    aria-label="Close display settings"
                    className="catalogue-drawer-close"
                  >
                    <X aria-hidden="true" size={20} />
                  </Drawer.Close>
                </div>

                <CatalogueSettingGroup
                  legend={layoutLegend}
                  name={layoutName}
                  onChange={onLayoutChange}
                  options={layoutOptions}
                  value={layout}
                />
                <CatalogueSettingGroup
                  legend={sortLegend}
                  name={sortName}
                  onChange={onSortChange}
                  options={sortOptions}
                  value={sort}
                />
                <CatalogueSettingGroup
                  legend={pageSizeLegend}
                  name={pageSizeName}
                  onChange={onPageSizeChange}
                  options={pageSizeOptions}
                  value={pageSize}
                />

                <div className="catalogue-drawer-actions">
                  <button
                    className="catalogue-settings-apply"
                    onClick={onApply}
                    type="button"
                  >
                    Apply settings
                  </button>
                  <button
                    className="catalogue-settings-reset"
                    onClick={onReset}
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
  );
}
