import { compareCodeUnits } from "./ordering";
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
        compareCodeUnits(left.canonicalKey, right.canonicalKey) ||
        compareCodeUnits(left.id, right.id),
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
        loadout.itemResolution?.status === "resolved" &&
        loadout.itemResolution.targetId === itemId
          ? [{ skill, loadout, loadoutIndex }]
          : [],
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.skill.canonicalKey, right.skill.canonicalKey) ||
        compareCodeUnits(left.skill.id, right.skill.id) ||
        left.loadoutIndex - right.loadoutIndex,
    );
}
