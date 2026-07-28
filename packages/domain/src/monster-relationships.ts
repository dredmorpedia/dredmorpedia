import { compareCodeUnits } from "./ordering";
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
        compareCodeUnits(
          left.monster.canonicalKey,
          right.monster.canonicalKey,
        ) ||
        compareCodeUnits(left.monster.id, right.monster.id) ||
        left.dropIndex - right.dropIndex,
    );
}
