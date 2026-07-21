import type { Monster } from "./types";

const modifierKindRanks: Readonly<
  Record<Monster["modifiers"][number]["kind"], number>
> = {
  damage: 0,
  resistance: 1,
  primary: 2,
  secondary: 3,
};

export interface MonsterInheritanceIssue {
  type: "missing-parent" | "cycle";
  monsterId: string;
  parentKey: string;
}

export interface MonsterInheritanceResult {
  monsters: Monster[];
  issues: MonsterInheritanceIssue[];
}

function inheritModifiers(
  parent: Monster["modifiers"],
  child: Monster["modifiers"],
): Monster["modifiers"] {
  const inherited = new Map(
    parent.map((modifier) => [
      `${modifier.kind}:${modifier.sourceKey}`,
      modifier,
    ]),
  );
  for (const modifier of child) {
    inherited.set(`${modifier.kind}:${modifier.sourceKey}`, modifier);
  }
  return [...inherited.values()].sort(
    (left, right) =>
      modifierKindRanks[left.kind] - modifierKindRanks[right.kind] ||
      left.sourceKey.localeCompare(right.sourceKey, "en") ||
      left.amount - right.amount,
  );
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
      description: monster.description || resolvedParent.description,
      taxonomy: monster.taxonomy || resolvedParent.taxonomy,
      depth: monster.depth ?? resolvedParent.depth,
      iconPath: monster.iconPath ?? resolvedParent.iconPath,
      paletteName: monster.paletteName ?? resolvedParent.paletteName,
      paletteTint: monster.paletteTint ?? resolvedParent.paletteTint,
      modifiers: inheritModifiers(resolvedParent.modifiers, monster.modifiers),
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
