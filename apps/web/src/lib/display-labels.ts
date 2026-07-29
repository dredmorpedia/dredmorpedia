export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}
