"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectGroupLabel,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  canonicalItemComparisonParams,
  comparedItemSlugs,
  maximumComparedItems,
  updateComparedItemParams,
} from "@/lib/item-comparison-url";

interface ItemComparisonStat {
  key: string;
  label: string;
  amount: number;
  statSlug: string | null;
}

export interface ItemComparisonEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryLabel: string;
  price: number | null;
  quality: number;
  iconUrl: string | null;
  armourSlots: string[];
  armourLevels: Array<number | null>;
  lifeRecovery: Array<number | null>;
  manaRecovery: Array<number | null>;
  chargeRanges: Array<{ minimum: number | null; maximum: number | null }>;
  trapLevels: Array<number | null>;
  floorTargeting: Array<boolean | null>;
  namedStats: ItemComparisonStat[];
  modifiers: ItemComparisonStat[];
}

interface ComparisonRow {
  key: string;
  label: string;
  statSlug?: string | null;
  values: string[];
}

const emptySelection = "__empty__";

function displayList(values: readonly (string | number | null)[]): string {
  return values.length === 0
    ? "Not declared"
    : values.map((value) => value ?? "Unavailable").join(", ");
}

function displayBooleanList(values: readonly (boolean | null)[]): string {
  return values.length === 0
    ? "Not declared"
    : values
        .map((value) => (value === null ? "Unavailable" : value ? "Yes" : "No"))
        .join(", ");
}

function displayChargeRanges(
  values: readonly { minimum: number | null; maximum: number | null }[],
): string {
  return values.length === 0
    ? "Not declared"
    : values
        .map(({ minimum, maximum }) => {
          if (minimum === null && maximum === null) {
            return "Unavailable";
          }
          if (minimum === maximum) {
            return String(minimum ?? maximum);
          }
          return `${minimum ?? "?"}–${maximum ?? "?"}`;
        })
        .join(", ");
}

function signedValue(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function ComparisonTable({
  heading,
  rows,
  items,
}: {
  heading: string;
  rows: ComparisonRow[];
  items: ItemComparisonEntry[];
}) {
  if (rows.length === 0) {
    return null;
  }

  const headingId = `comparison-${heading.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section className="detail-card" aria-labelledby={headingId}>
      <h2 id={headingId} className="section-title-sm">
        {heading}
      </h2>
      <div
        className="comparison-table-scroll"
        role="region"
        aria-label={`${heading} comparison`}
        tabIndex={0}
      >
        <table className="comparison-table">
          <thead>
            <tr>
              <th scope="col">Field</th>
              {items.map((item) => (
                <th key={item.id} scope="col">
                  <Link className="entity-link" href={`/items/${item.slug}/`}>
                    {item.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const differs = new Set(row.values).size > 1;
              return (
                <tr key={row.key} className={differs ? "comparison-diff" : ""}>
                  <th scope="row">
                    {row.statSlug ? (
                      <Link
                        className="entity-link"
                        href={`/stats/${row.statSlug}/`}
                      >
                        {row.label}
                      </Link>
                    ) : (
                      row.label
                    )}
                  </th>
                  {row.values.map((value, index) => (
                    <td key={items[index]?.id}>{value}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function statRows(
  items: ItemComparisonEntry[],
  field: "namedStats" | "modifiers",
): ComparisonRow[] {
  const definitions = new Map<
    string,
    { label: string; statSlug: string | null }
  >();
  for (const item of items) {
    for (const entry of item[field]) {
      const current = definitions.get(entry.key);
      definitions.set(entry.key, {
        label: entry.label,
        statSlug: current?.statSlug ?? entry.statSlug,
      });
    }
  }

  return [...definitions]
    .sort((left, right) => left[1].label.localeCompare(right[1].label, "en"))
    .map(([key, definition]) => ({
      key,
      label: definition.label,
      statSlug: definition.statSlug,
      values: items.map((item) => {
        const values = item[field]
          .filter((entry) => entry.key === key)
          .map((entry) => signedValue(entry.amount));
        return values.length > 0 ? values.join(", ") : "Not declared";
      }),
    }));
}

export function ItemComparison({ items }: { items: ItemComparisonEntry[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const latestSearchParams = useRef(serializedSearchParams);
  const validSlugs = useMemo(
    () => new Set(items.map((item) => item.slug)),
    [items],
  );
  const requestedItemSlugs = searchParams.getAll("item");
  const selectedSlugs = comparedItemSlugs(serializedSearchParams, validSlugs);
  const canonicalSerializedParams = canonicalItemComparisonParams(
    serializedSearchParams,
    validSlugs,
  ).toString();
  const needsCleanup =
    requestedItemSlugs.join("\u001f") !== selectedSlugs.join("\u001f");
  const [showCleanupNotice] = useState(needsCleanup);

  useEffect(() => {
    latestSearchParams.current = serializedSearchParams;
  }, [serializedSearchParams]);

  useEffect(() => {
    if (!needsCleanup) {
      return;
    }
    const next = canonicalSerializedParams;
    latestSearchParams.current = next;
    router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  }, [canonicalSerializedParams, needsCleanup, pathname, router]);

  const itemsBySlug = useMemo(
    () => new Map(items.map((item) => [item.slug, item])),
    [items],
  );
  const selectedItems = selectedSlugs.flatMap((slug) => {
    const item = itemsBySlug.get(slug);
    return item ? [item] : [];
  });
  const selectedSet = new Set(selectedSlugs);
  const groups = useMemo(() => {
    const grouped = new Map<string, ItemComparisonEntry[]>();
    for (const item of items) {
      const entries = grouped.get(item.categoryLabel) ?? [];
      entries.push(item);
      grouped.set(item.categoryLabel, entries);
    }
    return [...grouped].sort((left, right) =>
      left[0].localeCompare(right[0], "en"),
    );
  }, [items]);
  const selectOptions = useMemo(
    () => [
      { value: emptySelection, label: "No item selected" },
      ...items.map((item) => ({ value: item.slug, label: item.name })),
    ],
    [items],
  );

  const replaceParams = (params: URLSearchParams) => {
    const next = params.toString();
    latestSearchParams.current = next;
    router.replace(`${pathname}${next ? `?${next}` : ""}`, { scroll: false });
  };

  const overviewRows: ComparisonRow[] = [
    {
      key: "category",
      label: "Category",
      values: selectedItems.map((item) => item.categoryLabel),
    },
    {
      key: "value",
      label: "Value",
      values: selectedItems.map((item) =>
        item.price === null
          ? "Unknown"
          : `${new Intl.NumberFormat("en").format(item.price)} zorkmids`,
      ),
    },
    {
      key: "quality",
      label: "Quality",
      values: selectedItems.map((item) => String(item.quality)),
    },
    {
      key: "armour-slots",
      label: "Armour slots",
      values: selectedItems.map((item) => displayList(item.armourSlots)),
    },
    {
      key: "armour-levels",
      label: "Armour source levels",
      values: selectedItems.map((item) => displayList(item.armourLevels)),
    },
    {
      key: "life-recovery",
      label: "Life recovery",
      values: selectedItems.map((item) => displayList(item.lifeRecovery)),
    },
    {
      key: "mana-recovery",
      label: "Mana recovery",
      values: selectedItems.map((item) => displayList(item.manaRecovery)),
    },
    {
      key: "wand-charges",
      label: "Wand charge range",
      values: selectedItems.map((item) =>
        displayChargeRanges(item.chargeRanges),
      ),
    },
    {
      key: "trap-levels",
      label: "Trap source levels",
      values: selectedItems.map((item) => displayList(item.trapLevels)),
    },
    {
      key: "floor-targeting",
      label: "Weapon can target floor",
      values: selectedItems.map((item) =>
        displayBooleanList(item.floorTargeting),
      ),
    },
  ];

  return (
    <div className="crafting-tool-stack">
      <section
        className="detail-card"
        aria-labelledby="compare-controls-heading"
      >
        <div className="crafting-card-heading">
          <div>
            <p className="eyebrow">Comparison setup</p>
            <h2 id="compare-controls-heading" className="section-title-sm">
              Choose up to three items
            </h2>
          </div>
          {selectedItems.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const params = new URLSearchParams(latestSearchParams.current);
                params.delete("item");
                replaceParams(params);
              }}
            >
              Clear comparison
            </Button>
          ) : null}
        </div>
        <div className="comparison-controls">
          {Array.from({ length: maximumComparedItems }, (_, index) => {
            const currentSlug = selectedSlugs[index] ?? emptySelection;
            const label = `Item ${index + 1}`;
            return (
              <Select
                key={label}
                items={selectOptions}
                value={currentSlug}
                onValueChange={(value) =>
                  replaceParams(
                    updateComparedItemParams(
                      latestSearchParams.current,
                      validSlugs,
                      index,
                      value === null || value === emptySelection ? null : value,
                    ),
                  )
                }
              >
                <div className="field-group">
                  <SelectLabel className="field-label">{label}</SelectLabel>
                  <SelectTrigger aria-label={label} className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                </div>
                <SelectContent>
                  <SelectItem value={emptySelection}>
                    No item selected
                  </SelectItem>
                  {groups.map(([category, entries]) => (
                    <SelectGroup key={category}>
                      <SelectGroupLabel>{category}</SelectGroupLabel>
                      {entries.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={item.slug}
                          disabled={
                            selectedSet.has(item.slug) &&
                            item.slug !== currentSlug
                          }
                        >
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            );
          })}
        </div>
      </section>

      {showCleanupNotice ? (
        <aside
          className="diagnostic-panel"
          aria-labelledby="compare-cleanup-heading"
        >
          <div>
            <p className="eyebrow">Shared URL adjusted</p>
            <h2 id="compare-cleanup-heading" className="text-lg font-semibold">
              Unavailable, repeated, or extra items were removed.
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              A comparison keeps the first three unique items found in the
              active dataset.
            </p>
          </div>
        </aside>
      ) : null}

      {selectedItems.length === 0 ? (
        <section
          className="empty-state"
          aria-labelledby="compare-empty-heading"
        >
          <h2
            id="compare-empty-heading"
            className="text-lg font-semibold text-foreground"
          >
            Select items to compare their source facts.
          </h2>
          <p className="mt-2 text-sm leading-6">
            Your choices stay in the URL, so the same comparison can be reopened
            or shared.
          </p>
        </section>
      ) : (
        <>
          {selectedItems.length === 1 ? (
            <p className="comparison-prompt" role="status">
              Add another item to see differences side by side.
            </p>
          ) : null}
          <section className="comparison-item-grid" aria-label="Selected items">
            {selectedItems.map((item) => (
              <article className="comparison-item-card" key={item.id}>
                {item.iconUrl ? (
                  // The adjacent heading names the item, so its art is decorative.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt=""
                    className="comparison-item-art"
                    height="80"
                    src={item.iconUrl}
                    width="80"
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="comparison-item-art entity-art-placeholder"
                  >
                    ?
                  </div>
                )}
                <div>
                  <p className="eyebrow">{item.categoryLabel}</p>
                  <h2 className="text-xl font-semibold">
                    <Link className="entity-link" href={`/items/${item.slug}/`}>
                      {item.name}
                    </Link>
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description || "No normalized description available."}
                  </p>
                </div>
              </article>
            ))}
          </section>

          <ComparisonTable
            heading="Overview"
            items={selectedItems}
            rows={overviewRows}
          />
          <ComparisonTable
            heading="Named stats"
            items={selectedItems}
            rows={statRows(selectedItems, "namedStats")}
          />
          <ComparisonTable
            heading="Direct modifiers"
            items={selectedItems}
            rows={statRows(selectedItems, "modifiers")}
          />
          <p className="supporting-note">
            Values are compared as separate normalized source declarations.
            Missing declarations are not zero, and no equipment, combat, or
            stacking formula is inferred.
          </p>
        </>
      )}
    </div>
  );
}
