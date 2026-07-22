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
  const states = new Map<string, "visiting" | "resolved">();
  const cycleMembers = new Set<string>();
  const reportedCycleMembers = new Set<string>();

  function localOnly(monster: Monster): Monster {
    const withoutResolvedParent = { ...monster };
    delete withoutResolvedParent.inheritsId;
    return {
      ...withoutResolvedParent,
      modifiers: inheritModifiers([], monster.modifiers),
    };
  }

  function resolve(monster: Monster, stack: string[]): Monster {
    const cached = resolved.get(monster.canonicalKey);
    if (cached) {
      return cached;
    }

    if (states.get(monster.canonicalKey) === "visiting") {
      const cycleStart = stack.indexOf(monster.canonicalKey);
      const members =
        cycleStart === -1 ? [monster.canonicalKey] : stack.slice(cycleStart);
      for (const memberKey of members) {
        cycleMembers.add(memberKey);
        if (reportedCycleMembers.has(memberKey)) {
          continue;
        }
        const member = byKey.get(memberKey);
        if (member?.inheritsKey) {
          issues.push({
            type: "cycle",
            monsterId: member.id,
            parentKey: member.inheritsKey,
          });
          reportedCycleMembers.add(memberKey);
        }
      }
      return localOnly(monster);
    }

    states.set(monster.canonicalKey, "visiting");

    if (!monster.inheritsKey) {
      const root = localOnly(monster);
      resolved.set(monster.canonicalKey, root);
      states.set(monster.canonicalKey, "resolved");
      return root;
    }

    const parent = byKey.get(monster.inheritsKey);
    if (!parent) {
      issues.push({
        type: "missing-parent",
        monsterId: monster.id,
        parentKey: monster.inheritsKey,
      });
      const local = localOnly(monster);
      resolved.set(monster.canonicalKey, local);
      states.set(monster.canonicalKey, "resolved");
      return local;
    }

    const resolvedParent = resolve(parent, [...stack, monster.canonicalKey]);
    if (cycleMembers.has(monster.canonicalKey)) {
      const local = localOnly(monster);
      resolved.set(monster.canonicalKey, local);
      states.set(monster.canonicalKey, "resolved");
      return local;
    }
    const spellChance = monster.spellChance ?? resolvedParent.spellChance;
    const inherited: Monster = {
      ...monster,
      description: monster.description || resolvedParent.description,
      taxonomy: monster.taxonomy || resolvedParent.taxonomy,
      depth: monster.depth ?? resolvedParent.depth,
      iconPath: monster.iconPath ?? resolvedParent.iconPath,
      paletteName: monster.paletteName ?? resolvedParent.paletteName,
      paletteTint: monster.paletteTint ?? resolvedParent.paletteTint,
      modifiers: inheritModifiers(resolvedParent.modifiers, monster.modifiers),
      spellChance,
      triggers: monster.triggers.map((trigger) =>
        trigger.kind === "cast-when-aware" &&
        trigger.chance === null &&
        spellChance !== null
          ? { ...trigger, chance: spellChance }
          : trigger,
      ),
      inheritsId: resolvedParent.id,
    };
    resolved.set(monster.canonicalKey, inherited);
    states.set(monster.canonicalKey, "resolved");
    return inherited;
  }

  return {
    monsters: [...monsters]
      .map((monster) => resolve(monster, []))
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
