import type { Monster, MonsterDrop } from "./types";

export interface ItemMonsterDropRelationship {
  monster: Monster;
  drop: MonsterDrop;
  dropIndex: number;
}

export function itemMonsterDropRelationships(
  monsters: readonly Monster[],
  itemId: string,
): ItemMonsterDropRelationship[] {
  return monsters
    .flatMap((monster) =>
      monster.drops.flatMap((drop, dropIndex) =>
        drop.itemId === itemId ? [{ monster, drop, dropIndex }] : [],
      ),
    )
    .sort(
      (left, right) =>
        left.monster.canonicalKey.localeCompare(
          right.monster.canonicalKey,
          "en",
        ) ||
        left.monster.id.localeCompare(right.monster.id, "en") ||
        left.dropIndex - right.dropIndex,
    );
}
