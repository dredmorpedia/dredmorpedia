import type { Ability, Skill, SkillLoadout } from "./types";

export interface SkillAbilityRelationship {
  ability: Ability;
}

export interface ItemSkillLoadoutRelationship {
  skill: Skill;
  loadout: SkillLoadout;
  loadoutIndex: number;
}

export function skillAbilityRelationships(
  abilities: readonly Ability[],
  skillId: string,
): SkillAbilityRelationship[] {
  return abilities
    .filter((ability) => ability.skillId === skillId)
    .sort(
      (left, right) =>
        Number(right.startSkill) - Number(left.startSkill) ||
        left.level - right.level ||
        left.canonicalKey.localeCompare(right.canonicalKey, "en") ||
        left.id.localeCompare(right.id, "en"),
    )
    .map((ability) => ({ ability }));
}

export function itemSkillLoadoutRelationships(
  skills: readonly Skill[],
  itemId: string,
): ItemSkillLoadoutRelationship[] {
  return skills
    .flatMap((skill) =>
      skill.loadouts.flatMap((loadout, loadoutIndex) =>
        loadout.itemId === itemId ? [{ skill, loadout, loadoutIndex }] : [],
      ),
    )
    .sort(
      (left, right) =>
        left.skill.canonicalKey.localeCompare(right.skill.canonicalKey, "en") ||
        left.skill.id.localeCompare(right.skill.id, "en") ||
        left.loadoutIndex - right.loadoutIndex,
    );
}
