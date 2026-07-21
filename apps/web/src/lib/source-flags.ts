import type { SourceFlag } from "@dredmorpedia/domain";

const sourceFlagLabels: Readonly<Record<string, string>> = {
  deprecated: "Deprecated",
  friendlytaxa: "Friendly taxonomy",
  nofood: "No food",
  opendoors: "Opens doors",
  storetheft: "Store theft",
  veganism: "Veganism",
  vmtheft: "Vending-machine theft",
};

export function sourceFlagLabel(flag: SourceFlag): string {
  const knownLabel = sourceFlagLabels[flag.sourceKey.toLocaleLowerCase("en")];
  if (knownLabel) {
    return knownLabel;
  }
  return flag.sourceKey
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[-_ ]+/)
    .map(
      (part) => `${part.slice(0, 1).toLocaleUpperCase("en")}${part.slice(1)}`,
    )
    .join(" ");
}

export function sourceFlagValue(flag: SourceFlag): string {
  if (flag.value === "1") {
    return "Enabled";
  }
  if (flag.value === "0") {
    return "Disabled";
  }
  return flag.value;
}
