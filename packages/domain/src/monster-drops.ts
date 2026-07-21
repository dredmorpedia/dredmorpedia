import type { MonsterDrop } from "./types";

function hasValidChance(value: object): boolean {
  return (
    "chance" in value &&
    typeof value.chance === "number" &&
    Number.isInteger(value.chance) &&
    value.chance >= 0 &&
    value.chance <= 100
  );
}

export function isMonsterDrop(value: unknown): value is MonsterDrop {
  if (value === null || typeof value !== "object" || !hasValidChance(value)) {
    return false;
  }

  if ("dropType" in value) {
    return (
      typeof value.dropType === "string" &&
      !("itemKey" in value) &&
      !("itemName" in value) &&
      !("itemId" in value)
    );
  }

  return (
    "itemKey" in value &&
    typeof value.itemKey === "string" &&
    "itemName" in value &&
    typeof value.itemName === "string" &&
    (!("itemId" in value) || typeof value.itemId === "string")
  );
}
