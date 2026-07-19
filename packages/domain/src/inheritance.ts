import type { Monster } from "./types";

export interface MonsterInheritanceIssue {
  type: "missing-parent" | "cycle";
  monsterId: string;
  parentKey: string;
}

export interface MonsterInheritanceResult {
  monsters: Monster[];
  issues: MonsterInheritanceIssue[];
}

export function applyMonsterInheritance(
  monsters: readonly Monster[],
): MonsterInheritanceResult {
  const byKey = new Map(
    monsters.map((monster) => [monster.canonicalKey, monster]),
  );
  const resolved = new Map<string, Monster>();
  const issues: MonsterInheritanceIssue[] = [];

  function resolve(monster: Monster, ancestors: Set<string>): Monster {
    const cached = resolved.get(monster.canonicalKey);
    if (cached) {
      return cached;
    }

    if (!monster.inheritsKey) {
      resolved.set(monster.canonicalKey, monster);
      return monster;
    }

    if (ancestors.has(monster.canonicalKey)) {
      issues.push({
        type: "cycle",
        monsterId: monster.id,
        parentKey: monster.inheritsKey,
      });
      return monster;
    }

    const parent = byKey.get(monster.inheritsKey);
    if (!parent) {
      issues.push({
        type: "missing-parent",
        monsterId: monster.id,
        parentKey: monster.inheritsKey,
      });
      resolved.set(monster.canonicalKey, monster);
      return monster;
    }

    const nextAncestors = new Set(ancestors);
    nextAncestors.add(monster.canonicalKey);
    const resolvedParent = resolve(parent, nextAncestors);
    const inherited: Monster = {
      ...monster,
      taxonomy: monster.taxonomy || resolvedParent.taxonomy,
      iconPath: monster.iconPath ?? resolvedParent.iconPath,
      inheritsId: resolvedParent.id,
    };
    resolved.set(monster.canonicalKey, inherited);
    return inherited;
  }

  return {
    monsters: [...monsters]
      .map((monster) => resolve(monster, new Set()))
      .sort((left, right) =>
        left.canonicalKey.localeCompare(right.canonicalKey, "en"),
      ),
    issues: issues.sort(
      (left, right) =>
        left.monsterId.localeCompare(right.monsterId, "en") ||
        left.parentKey.localeCompare(right.parentKey, "en"),
    ),
  };
}
