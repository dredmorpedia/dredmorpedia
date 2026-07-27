"use client";

import {
  entityKinds,
  itemCategoryLabel,
  querySearchDocuments,
  type EntityKind,
  type SearchDocument,
} from "@dredmorpedia/domain";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

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

const kindLabels: Record<EntityKind, string> = {
  item: "Items",
  recipe: "Recipes",
  encrustment: "Encrustments",
  skill: "Skills",
  ability: "Abilities",
  spell: "Spells",
  monster: "Monsters",
  stat: "Stats",
  template: "Templates",
};

const kindOptions: FilterOption[] = [
  { value: "all", label: "All record types" },
  ...entityKinds.map((kind) => ({
    value: kind,
    label: kindLabels[kind],
  })),
];

const searchQueryDebounceMilliseconds = 250;

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

export function SearchExplorer({
  documents,
  sources,
  stats,
}: SearchExplorerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const queryParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(queryParam);
  const latestQuery = useRef(query);
  const submittedQuery = useRef<string | null>(null);
  useEffect(() => {
    latestQuery.current = query;
  }, [query]);
  useEffect(() => {
    if (submittedQuery.current === queryParam) {
      submittedQuery.current = null;
      return;
    }
    if (latestQuery.current !== queryParam) {
      submittedQuery.current = null;
      setQuery(queryParam);
    }
  }, [queryParam]);
  useEffect(() => {
    if (query === queryParam) {
      return;
    }
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(serializedSearchParams);
      if (query.length === 0) {
        next.delete("q");
      } else {
        next.set("q", query);
      }
      const suffix = next.size > 0 ? `?${next.toString()}` : "";
      submittedQuery.current = query;
      startTransition(() =>
        router.replace(`${pathname}${suffix}`, { scroll: false }),
      );
    }, searchQueryDebounceMilliseconds);
    return () => window.clearTimeout(timeout);
  }, [pathname, query, queryParam, router, serializedSearchParams]);
  const requestedKind = searchParams.get("kind") ?? "all";
  const kind = kindOptions.some((option) => option.value === requestedKind)
    ? requestedKind
    : "all";
  const categories = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[...new Set(documents.flatMap((document) => document.category ?? []))]
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((value) => ({ value, label: itemCategoryLabel(value) })),
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
    const next = new URLSearchParams(serializedSearchParams);
    if (value.length === 0 || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (query.length === 0) {
      next.delete("q");
    } else {
      next.set("q", query);
    }
    const suffix = next.size > 0 ? `?${next.toString()}` : "";
    if (query !== queryParam) {
      submittedQuery.current = query;
    }
    startTransition(() =>
      router.replace(`${pathname}${suffix}`, { scroll: false }),
    );
  };

  const reset = () => {
    submittedQuery.current = "";
    setQuery("");
    startTransition(() => router.replace(pathname));
  };

  return (
    <section aria-labelledby="search-heading" className="space-y-5">
      <div>
        <p className="eyebrow">Shareable structured lookup</p>
        <h1 id="search-heading" className="section-title">
          Search every record type
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Search items, recipes, encrustments, skills, abilities, spells,
          monsters, stats, and targeting templates. Deterministic filters keep
          the settled query shareable in the URL.
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
            onChange={(event) => setQuery(event.currentTarget.value)}
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
                  <dd>
                    {document.category
                      ? itemCategoryLabel(document.category)
                      : "Not categorized"}
                  </dd>
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
