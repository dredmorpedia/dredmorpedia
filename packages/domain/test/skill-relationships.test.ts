import { describe, expect, it } from "vitest";

import {
  canonicalKey,
  entityId,
  itemSkillLoadoutRelationships,
  skillAbilityRelationships,
  slugify,
  type Ability,
  type Skill,
  type SkillLoadout,
} from "../src/index";

const provenance = {
  sourceId: "synthetic-skills",
  file: "synthetic/skillDB.xml",
  line: 2,
  column: 3,
  originalName: "Synthetic",
};

function skill(name: string, loadouts: SkillLoadout[] = []): Skill {
  return {
    id: entityId("skill", name),
    kind: "skill",
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description: "",
    provenance: { ...provenance, originalName: name },
    variants: [{ ...provenance, originalName: name }],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
    archetype: "warrior",
    iconPath: null,
    loadouts,
    loadoutItemKeys: loadouts.flatMap((loadout) =>
      loadout.itemKey ? [loadout.itemKey] : [],
    ),
    sourceFlags: [],
    progressionTags: [],
    abilityIds: [],
  };
}

function ability(
  name: string,
  skillId: string,
  level: number,
  startSkill = false,
): Ability {
  return {
    id: entityId("ability", name),
    kind: "ability",
    canonicalKey: canonicalKey(name),
    slug: slugify(name),
    slugAliases: [],
    name,
    description: "",
    provenance: { ...provenance, originalName: name },
    variants: [{ ...provenance, originalName: name }],
    appliedOverrides: [],
    appliedPatches: [],
    diagnosticIds: [],
    skillKey: canonicalKey(skillId),
    skillId,
    iconPath: null,
    level,
    startSkill,
    modifiers: [],
    sourceFlags: [],
    recoveryBuffAmounts: [],
    currencyBuffPercents: [],
    triggers: [],
    spellKeys: [],
    spellIds: [],
  };
}

describe("skill relationships", () => {
  it("orders starting and leveled abilities deterministically", () => {
    const skillId = "skill:clockwork combat";
    const later = ability("Later", skillId, 2);
    const alphabeticalLater = ability("Zeta", skillId, 1);
    const alphabeticalEarlier = ability("Alpha", skillId, 1);
    const starting = ability("Starting", skillId, 0, true);
    const unrelated = ability("Unrelated", "skill:other", 0, true);

    expect(
      skillAbilityRelationships(
        [later, alphabeticalLater, unrelated, starting, alphabeticalEarlier],
        skillId,
      ).map(({ ability: entry }) => entry.name),
    ).toEqual(["Starting", "Alpha", "Zeta", "Later"]);
  });

  it("returns resolved item loadouts in deterministic skill order", () => {
    const itemId = "item:brass ingot";
    const optional = {
      itemKey: "brass ingot",
      itemName: "Brass Ingot",
      itemId,
      amount: 2,
      always: false,
    };
    const later = skill("Later Skill", [optional]);
    const earlier = skill("Earlier Skill", [
      { itemType: "food", amount: 1, always: false },
      { ...optional, amount: 1, always: true },
    ]);

    expect(
      itemSkillLoadoutRelationships([later, earlier], itemId).map(
        ({ skill: entry, loadout, loadoutIndex }) => ({
          skill: entry.name,
          amount: loadout.amount,
          always: loadout.always,
          loadoutIndex,
        }),
      ),
    ).toEqual([
      {
        skill: "Earlier Skill",
        amount: 1,
        always: true,
        loadoutIndex: 1,
      },
      {
        skill: "Later Skill",
        amount: 2,
        always: false,
        loadoutIndex: 0,
      },
    ]);
  });
});
