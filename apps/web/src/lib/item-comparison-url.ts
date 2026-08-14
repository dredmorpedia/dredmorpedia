export const maximumComparedItems = 3;

export function comparedItemSlugs(
  serializedParams: string,
  validSlugs: ReadonlySet<string>,
): string[] {
  const selected: string[] = [];
  const seen = new Set<string>();

  for (const slug of new URLSearchParams(serializedParams).getAll("item")) {
    if (
      selected.length === maximumComparedItems ||
      !validSlugs.has(slug) ||
      seen.has(slug)
    ) {
      continue;
    }
    seen.add(slug);
    selected.push(slug);
  }

  return selected;
}

export function canonicalItemComparisonParams(
  serializedParams: string,
  validSlugs: ReadonlySet<string>,
): URLSearchParams {
  const params = new URLSearchParams(serializedParams);
  const selected = comparedItemSlugs(serializedParams, validSlugs);
  params.delete("item");
  for (const slug of selected) {
    params.append("item", slug);
  }
  return params;
}

export function updateComparedItemParams(
  serializedParams: string,
  validSlugs: ReadonlySet<string>,
  index: number,
  slug: string | null,
): URLSearchParams {
  const selected = comparedItemSlugs(serializedParams, validSlugs);
  if (index < 0 || index >= maximumComparedItems) {
    return canonicalItemComparisonParams(serializedParams, validSlugs);
  }

  if (slug === null) {
    selected.splice(index, 1);
  } else if (validSlugs.has(slug)) {
    const existingIndex = selected.indexOf(slug);
    if (existingIndex !== -1) {
      selected.splice(existingIndex, 1);
    }
    selected[index] = slug;
  }

  const params = new URLSearchParams(serializedParams);
  params.delete("item");
  for (const selectedSlug of selected.filter(Boolean)) {
    params.append("item", selectedSlug);
  }
  return params;
}
