"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ExplorerItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  sourceLabel: string;
  price: number | null;
}

export function ItemExplorer({ items }: { items: ExplorerItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(
    () => [
      { value: "all", label: "All categories" },
      ...[...new Set(items.map((item) => item.category))]
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((value) => ({
          value,
          label: `${value.slice(0, 1).toLocaleUpperCase("en")}${value.slice(1)}`,
        })),
    ],
    [items],
  );
  const normalizedQuery = query
    .trim()
    .normalize("NFKC")
    .toLocaleLowerCase("en");
  const filtered = items.filter((item) => {
    const matchesCategory = category === "all" || item.category === category;
    const text = `${item.name} ${item.description} ${item.sourceLabel}`
      .normalize("NFKC")
      .toLocaleLowerCase("en");
    return matchesCategory && text.includes(normalizedQuery);
  });
  const reset = () => {
    setQuery("");
    setCategory("all");
  };

  return (
    <section aria-labelledby="explorer-heading" className="space-y-5">
      <div>
        <p className="eyebrow">Bounded client interaction</p>
        <h2 id="explorer-heading" className="section-title">
          Explore synthetic items
        </h2>
      </div>

      <div className="filter-panel">
        <div className="field-group">
          <label htmlFor="item-search" className="field-label">
            Search items
          </label>
          <input
            id="item-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Try “blade”"
            className="search-input"
          />
        </div>

        <Select
          items={categories}
          value={category}
          onValueChange={(value) => setCategory(value ?? "all")}
        >
          <div className="field-group">
            <SelectLabel className="field-label">Category</SelectLabel>
            <SelectTrigger aria-label="Category">
              <SelectValue />
            </SelectTrigger>
          </div>
          <SelectContent>
            {categories.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={reset}
          className="self-end"
        >
          Reset filters
        </Button>
      </div>

      <p className="result-count" aria-live="polite">
        {filtered.length === 1
          ? "1 matching item"
          : `${filtered.length} matching items`}
      </p>

      {filtered.length > 0 ? (
        <ul className="item-grid">
          {filtered.map((item) => (
            <li key={item.id} className="item-card">
              <div className="flex items-center justify-between gap-3">
                <span className="category-chip">{item.category}</span>
                <span className="text-xs text-muted-foreground">
                  {item.price === null
                    ? "No price"
                    : `${new Intl.NumberFormat("en").format(item.price)} zorkmids`}
                </span>
              </div>
              <h3 className="mt-4 text-xl font-semibold">
                <Link className="entity-link" href={`/items/${item.slug}`}>
                  {item.name}
                </Link>
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
              <p className="mt-4 text-xs font-medium text-muted-foreground">
                {item.sourceLabel}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state" role="status">
          <h3 className="font-semibold">No synthetic items match</h3>
          <p>Change the text or category filter, or reset both controls.</p>
        </div>
      )}
    </section>
  );
}
