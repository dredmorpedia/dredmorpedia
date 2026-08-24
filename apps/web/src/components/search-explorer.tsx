"use client";

import {
  entityKinds,
  querySearchDocuments,
  suggestSearchDocuments,
  type EntityKind,
  type SearchDocument,
  type SearchQuery,
} from "@dredmorpedia/domain";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";

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
  createSearchCategoryGroups,
  searchCategoryLabel,
  searchCategoryValues,
  type SearchCategoryGroup,
} from "@/lib/search-category-facets";
import { searchFilterViews } from "@/lib/search-filter-views";

interface FilterOption {
  value: string;
  label: string;
  aliases?: string[];
}

interface SearchExplorerProps {
  documents: SearchDocument[];
  sources: FilterOption[];
  stats: FilterOption[];
}

type SearchScope = EntityKind | "all" | "crafting";

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
  { value: "crafting", label: "Recipes and encrustments" },
  ...entityKinds.map((kind) => ({
    value: kind,
    label: kindLabels[kind],
  })),
];

function kindsForScope(scope: SearchScope): EntityKind[] | undefined {
  if (scope === "all") {
    return undefined;
  }
  return scope === "crafting" ? ["recipe", "encrustment"] : [scope];
}

function supportsCraftingSkill(scope: SearchScope): boolean {
  return (
    scope === "all" ||
    scope === "crafting" ||
    scope === "recipe" ||
    scope === "encrustment"
  );
}

const searchQueryDebounceMilliseconds = 250;

function FilterSelect({
  label,
  value,
  options,
  groups,
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  groups?: SearchCategoryGroup[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const groupedValues = new Set(
    groups?.flatMap((group) => group.options.map((option) => option.value)),
  );
  const ungroupedOptions = options.filter(
    (option) => !groupedValues.has(option.value),
  );

  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue ?? "all")}
    >
      <div className="field-group">
        <SelectLabel className="field-label">{label}</SelectLabel>
        <SelectTrigger aria-label={label} className="w-full min-w-0">
          <SelectValue />
        </SelectTrigger>
      </div>
      <SelectContent>
        {ungroupedOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        {groups?.map((group) => (
          <SelectGroup key={group.id}>
            <SelectGroupLabel>{group.label}</SelectGroupLabel>
            {group.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
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
  const latestSearchParams = useRef(serializedSearchParams);
  const queryParam = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(queryParam);
  const searchInput = useRef<HTMLInputElement>(null);
  const latestQuery = useRef(query);
  const submittedQuery = useRef<string | null>(null);
  useEffect(() => {
    latestSearchParams.current = serializedSearchParams;
  }, [serializedSearchParams]);
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
      const next = new URLSearchParams(latestSearchParams.current);
      if (query.length === 0) {
        next.delete("q");
      } else {
        next.set("q", query);
      }
      const suffix = next.size > 0 ? `?${next.toString()}` : "";
      latestSearchParams.current = next.toString();
      submittedQuery.current = query;
      startTransition(() =>
        router.replace(`${pathname}${suffix}`, { scroll: false }),
      );
    }, searchQueryDebounceMilliseconds);
    return () => window.clearTimeout(timeout);
  }, [pathname, query, queryParam, router, serializedSearchParams]);
  const requestedKind = searchParams.get("kind") ?? "all";
  const kind = (
    kindOptions.some((option) => option.value === requestedKind)
      ? requestedKind
      : "all"
  ) as SearchScope;
  const categoryGroups = useMemo(
    () => createSearchCategoryGroups(documents, kind),
    [documents, kind],
  );
  const compatibleCategoryValues = useMemo(
    () => searchCategoryValues(categoryGroups),
    [categoryGroups],
  );
  const categories = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...categoryGroups.flatMap((group) => group.options),
    ],
    [categoryGroups],
  );
  const sourceOptions = [{ value: "all", label: "All sources" }, ...sources];
  const statOptions = [{ value: "all", label: "Any stat" }, ...stats];
  const craftingSkillOptions = useMemo(() => {
    const levels = [
      ...new Set(
        documents.flatMap((document) =>
          document.craftingSkillLevel === null
            ? []
            : [document.craftingSkillLevel],
        ),
      ),
    ].sort((left, right) => left - right);

    return [
      { value: "all", label: "Any source skill" },
      ...levels.map((level) => ({
        value: String(level),
        label: level === 0 ? "No skill required" : `Level ${level} or lower`,
      })),
    ];
  }, [documents]);
  const requestedSource = searchParams.get("source") ?? "all";
  const source = sourceOptions.some(
    (option) => option.value === requestedSource,
  )
    ? requestedSource
    : "all";
  const requestedCategory = searchParams.get("category") ?? "all";
  const category = compatibleCategoryValues.has(requestedCategory)
    ? requestedCategory
    : "all";
  const requestedStat = searchParams.get("stat") ?? "all";
  const stat =
    statOptions.find(
      (option) =>
        option.value === requestedStat ||
        option.aliases?.includes(requestedStat),
    )?.value ?? "all";
  const requestedMaximumCraftingSkill = searchParams.get("maxSkill") ?? "all";
  const maximumCraftingSkill =
    supportsCraftingSkill(kind) &&
    craftingSkillOptions.some(
      (option) => option.value === requestedMaximumCraftingSkill,
    )
      ? requestedMaximumCraftingSkill
      : "all";
  const scopedKinds = kindsForScope(kind);
  const searchQuery: SearchQuery = {
    query,
    ...(scopedKinds ? { kinds: scopedKinds } : {}),
    ...(source === "all" ? {} : { sourceIds: [source] }),
    ...(category === "all" ? {} : { category }),
    ...(stat === "all" ? {} : { statKey: stat }),
    ...(maximumCraftingSkill === "all"
      ? {}
      : { maximumCraftingSkillLevel: Number(maximumCraftingSkill) }),
  };
  const allResults = querySearchDocuments(documents, searchQuery);
  const visibleResults = allResults.slice(0, 50);
  const suggestions = suggestSearchDocuments(documents, searchQuery);

  useEffect(() => {
    if (
      requestedCategory === "all" ||
      compatibleCategoryValues.has(requestedCategory)
    ) {
      return;
    }

    const next = new URLSearchParams(latestSearchParams.current);
    if (next.get("category") !== requestedCategory) {
      return;
    }
    next.delete("category");
    const suffix = next.size > 0 ? `?${next.toString()}` : "";
    latestSearchParams.current = next.toString();
    startTransition(() =>
      router.replace(`${pathname}${suffix}`, { scroll: false }),
    );
  }, [compatibleCategoryValues, pathname, requestedCategory, router]);

  useEffect(() => {
    if (
      requestedMaximumCraftingSkill === "all" ||
      (supportsCraftingSkill(kind) &&
        craftingSkillOptions.some(
          (option) => option.value === requestedMaximumCraftingSkill,
        ))
    ) {
      return;
    }

    const next = new URLSearchParams(latestSearchParams.current);
    if (next.get("maxSkill") !== requestedMaximumCraftingSkill) {
      return;
    }
    next.delete("maxSkill");
    const suffix = next.size > 0 ? `?${next.toString()}` : "";
    latestSearchParams.current = next.toString();
    startTransition(() =>
      router.replace(`${pathname}${suffix}`, { scroll: false }),
    );
  }, [
    craftingSkillOptions,
    kind,
    pathname,
    requestedMaximumCraftingSkill,
    router,
  ]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(latestSearchParams.current);
    if (value.length === 0 || value === "all") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    if (key === "kind") {
      const nextKind = (
        kindOptions.some((option) => option.value === value) ? value : "all"
      ) as SearchScope;
      const nextCategory = next.get("category");
      const nextCategoryValues = searchCategoryValues(
        createSearchCategoryGroups(documents, nextKind),
      );
      if (nextCategory !== null && !nextCategoryValues.has(nextCategory)) {
        next.delete("category");
      }
      if (!supportsCraftingSkill(nextKind)) {
        next.delete("maxSkill");
      }
    }
    if (query.length === 0) {
      next.delete("q");
    } else {
      next.set("q", query);
    }
    const suffix = next.size > 0 ? `?${next.toString()}` : "";
    latestSearchParams.current = next.toString();
    if (query !== queryParam) {
      submittedQuery.current = query;
    }
    startTransition(() =>
      router.replace(`${pathname}${suffix}`, { scroll: false }),
    );
  };

  const reset = () => {
    submittedQuery.current = "";
    latestSearchParams.current = "";
    setQuery("");
    // A full same-route replacement cancels any earlier filter transition that
    // may still be committing under load. This keeps Reset authoritative.
    window.location.replace(pathname);
  };

  const applySuggestion = (value: string) => {
    setQuery(value);
    searchInput.current?.focus();
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

      <nav aria-labelledby="reusable-filter-views-heading">
        <h2
          id="reusable-filter-views-heading"
          className="text-sm font-semibold"
        >
          Reusable filter views
        </h2>
        <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
          {searchFilterViews.map((view) => (
            <li key={view.id}>
              <Link
                className="inline-flex min-h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground no-underline outline-none transition-colors hover:border-primary hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                href={view.href}
                title={view.description}
              >
                {view.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="search-filter-panel">
        <div className="field-group search-query-field">
          <label htmlFor="global-search" className="field-label">
            Search terms
          </label>
          <input
            ref={searchInput}
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
          groups={categoryGroups}
          disabled={categoryGroups.length === 0}
          onChange={(value) => updateFilter("category", value)}
        />
        <FilterSelect
          label="Stat"
          value={stat}
          options={statOptions}
          onChange={(value) => updateFilter("stat", value)}
        />
        <FilterSelect
          label="Maximum source skill"
          value={maximumCraftingSkill}
          options={craftingSkillOptions}
          disabled={!supportsCraftingSkill(kind)}
          onChange={(value) => updateFilter("maxSkill", value)}
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

      {suggestions.length > 0 ? (
        <section
          aria-labelledby="search-suggestions-heading"
          className="rounded-xl border border-border bg-surface/75 p-5"
        >
          <p className="eyebrow">Possible spelling matches</p>
          <h2
            id="search-suggestions-heading"
            className="mt-2 text-lg font-semibold"
          >
            Did you mean one of these names?
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Select a suggestion to replace the search terms. Your active filters
            stay applied.
          </p>
          <ul className="mt-4 flex list-none flex-wrap gap-2 p-0">
            {suggestions.map(({ document }) => (
              <li key={document.id}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => applySuggestion(document.name)}
                >
                  {document.name}
                  <span className="sr-only">, {kindLabels[document.kind]}</span>
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                {document.craftingSkillLevel === null ? null : (
                  <div>
                    <dt>Source skill</dt>
                    <dd>{document.craftingSkillLevel}</dd>
                  </div>
                )}
                <div>
                  <dt>Category</dt>
                  <dd>
                    {document.category
                      ? searchCategoryLabel(document.kind, document.category)
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
