"use client";

import {
  querySearchDocuments,
  type EntityKind,
  type SearchDocument,
} from "@dredmorpedia/domain";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FilterOption {
  value: string;
  label: string;
}

interface SearchExplorerProps {
  documents: SearchDocument[];
  sources: FilterOption[];
  stats: FilterOption[];
}

const kindOptions: FilterOption[] = [
  { value: "all", label: "Items, stats, and templates" },
  { value: "item", label: "Items" },
  { value: "stat", label: "Stats" },
  { value: "template", label: "Templates" },
];

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(nextValue) => onChange(nextValue ?? "all")}
    >
      <div className="field-group">
        <SelectLabel className="field-label">{label}</SelectLabel>
        <SelectTrigger aria-label={label} className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
      </div>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function titleCase(value: string): string {
  return value
    .split(/[-_ ]+/)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}

export function SearchExplorer({
  documents,
  sources,
  stats,
}: SearchExplorerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const requestedKind = searchParams.get("kind") ?? "all";
  const kind = kindOptions.some((option) => option.value === requestedKind)
    ? requestedKind
    : "all";
  const categories = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[...new Set(documents.flatMap((document) => document.category ?? []))]
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((value) => ({ value, label: titleCase(value) })),
    ],
    [documents],
  );
  const sourceOptions = [{ value: "all", label: "All sources" }, ...sources];
  const statOptions = [{ value: "all", label: "Any stat" }, ...stats];
  const requestedSource = searchParams.get("source") ?? "all";
  const source = sourceOptions.some(
    (option) => option.value === requestedSource,
  )
    ? requestedSource
    : "all";
  const requestedCategory = searchParams.get("category") ?? "all";
  const category = categories.some(
    (option) => option.value === requestedCategory,
  )
    ? requestedCategory
    : "all";
  const requestedStat = searchParams.get("stat") ?? "all";
  const stat = statOptions.some((option) => option.value === requestedStat)
    ? requestedStat
    : "all";
  const allResults = querySearchDocuments(documents, {
    query,
    ...(kind === "all" ? {} : { kinds: [kind as EntityKind] }),
    ...(source === "all" ? {} : { sourceIds: [source] }),
    ...(category === "all" ? {} : { category }),
    ...(stat === "all" ? {} : { statKey: stat }),
  });
  const visibleResults = allResults.slice(0, 50);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value.length === 0 || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    const suffix = next.size > 0 ? `?${next.toString()}` : "";
    startTransition(() =>
      router.replace(`${pathname}${suffix}`, { scroll: false }),
    );
  };

  const reset = () => startTransition(() => router.replace(pathname));

  return (
    <section aria-labelledby="search-heading" className="space-y-5">
      <div>
        <p className="eyebrow">Shareable structured lookup</p>
        <h1 id="search-heading" className="section-title">
          Search items, stats, and templates
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Text and structured filters are applied by deterministic domain logic.
          The current URL preserves the active query.
        </p>
      </div>

      <div className="search-filter-panel">
        <div className="field-group search-query-field">
          <label htmlFor="global-search" className="field-label">
            Search terms
          </label>
          <input
            id="global-search"
            type="search"
            value={query}
            onChange={(event) => updateFilter("q", event.currentTarget.value)}
            placeholder="Try “melee power”"
            className="search-input"
          />
        </div>
        <FilterSelect
          label="Entity type"
          value={kind}
          options={kindOptions}
          onChange={(value) => updateFilter("kind", value)}
        />
        <FilterSelect
          label="Source"
          value={source}
          options={sourceOptions}
          onChange={(value) => updateFilter("source", value)}
        />
        <FilterSelect
          label="Category"
          value={category}
          options={categories}
          onChange={(value) => updateFilter("category", value)}
        />
        <FilterSelect
          label="Item stat"
          value={stat}
          options={statOptions}
          onChange={(value) => updateFilter("stat", value)}
        />
        <Button type="button" variant="outline" onClick={reset}>
          Reset filters
        </Button>
      </div>

      <p className="result-count" aria-live="polite">
        {allResults.length === 1
          ? "1 matching record"
          : `${allResults.length} matching records`}
        {allResults.length > visibleResults.length
          ? `; showing the first ${visibleResults.length}`
          : ""}
      </p>

      {visibleResults.length > 0 ? (
        <ul className="search-result-list">
          {visibleResults.map(({ document }) => (
            <li key={document.id} className="search-result-card">
              <div>
                <span className="category-chip">{document.kind}</span>
                <h2 className="mt-3 text-xl font-semibold">
                  <Link className="entity-link" href={document.url}>
                    {document.name}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {document.summary || "No normalized description available."}
                </p>
              </div>
              <dl className="search-result-meta">
                <div>
                  <dt>Source</dt>
                  <dd>
                    {sources.find((entry) => entry.value === document.sourceId)
                      ?.label ?? document.sourceId}
                  </dd>
                </div>
                <div>
                  <dt>Category</dt>
                  <dd>{document.category ?? "Not categorized"}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state" role="status">
          <h2 className="font-semibold">No records match these filters</h2>
          <p>
            Change the search terms or remove one of the structured filters.
          </p>
        </div>
      )}
    </section>
  );
}
