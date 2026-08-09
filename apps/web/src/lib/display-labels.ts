export function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}

export function diagnosticCodeLabel(value: string): string {
  return titleCase(value).replaceAll(/\bXml\b/g, "XML");
}
