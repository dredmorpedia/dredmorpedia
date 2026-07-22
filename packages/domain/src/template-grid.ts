export interface TemplateGridSummary {
  rowCount: number;
  columnCount: number;
  affectedTileCount: number;
}

export function isValidTemplateRows(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }
  if (value.length === 0) {
    return true;
  }
  if (
    !value.every(
      (row): row is string =>
        typeof row === "string" && row.length > 0 && /^[.@#]+$/.test(row),
    )
  ) {
    return false;
  }

  const width = value[0]?.length ?? 0;
  const anchorCount = value.reduce(
    (count, row) => count + [...row].filter((cell) => cell === "#").length,
    0,
  );
  return value.every((row) => row.length === width) && anchorCount === 1;
}

export function summarizeTemplateRows(
  rows: readonly string[],
  affectsAnchor: boolean,
): TemplateGridSummary {
  return {
    rowCount: rows.length,
    columnCount: rows[0]?.length ?? 0,
    affectedTileCount: rows.reduce(
      (count, row) =>
        count +
        [...row].filter(
          (cell) => cell === "@" || (cell === "#" && affectsAnchor),
        ).length,
      0,
    ),
  };
}
