import { compareCodeUnits } from "./ordering";
import type {
  Item,
  Monster,
  Spell,
  SpellBuffEventHook,
  SpellEffect,
  SpellEffectBuffCondition,
  SpellEffectItemOption,
  SpellEffectSpellOption,
} from "./types";

export interface SpellEffectChainStep {
  sourceSpell: Spell;
  effect: SpellEffect;
  effectIndex: number;
  targetSpell?: Spell;
  depth: number;
  cycle: boolean;
  alreadyExpanded: boolean;
}

export interface SpellEffectBacklink {
  spell: Spell;
  effect: SpellEffect;
  effectIndex: number;
}

export interface SpellBuffEventHookBacklink {
  spell: Spell;
  buffIndex: number;
  hook: SpellBuffEventHook;
  hookIndex: number;
}

export interface SpellEffectOptionSpellBacklink {
  spell: Spell;
  effect: SpellEffect;
  effectIndex: number;
  option: SpellEffectSpellOption;
  optionIndex: number;
}

export interface SpellEffectOptionItemBacklink {
  spell: Spell;
  effect: SpellEffect;
  effectIndex: number;
  option: SpellEffectItemOption;
  optionIndex: number;
}

export interface SpellEffectItemTargetBacklink {
  spell: Spell;
  effect: SpellEffect;
  effectIndex: number;
}

export interface SpellEffectMonsterTargetBacklink {
  spell: Spell;
  effect: SpellEffect;
  effectIndex: number;
}

export type SpellEffectConditionKind = "required-buff" | "forbidden-buff";

export interface SpellEffectConditionBacklink {
  spell: Spell;
  effect: SpellEffect;
  effectIndex: number;
  kind: SpellEffectConditionKind;
  condition: SpellEffectBuffCondition;
}

export function spellEffectChain(
  spells: readonly Spell[],
  rootSpellId: string,
): SpellEffectChainStep[] {
  const spellsById = new Map(spells.map((spell) => [spell.id, spell]));
  const rootSpell = spellsById.get(rootSpellId);
  if (!rootSpell) {
    return [];
  }

  const steps: SpellEffectChainStep[] = [];
  const expandedSpellIds = new Set([rootSpell.id]);

  function visit(sourceSpell: Spell, depth: number, path: Set<string>): void {
    sourceSpell.effects.forEach((effect, effectIndex) => {
      if (!effect.spellKey) {
        return;
      }

      const targetSpell = effect.spellId
        ? spellsById.get(effect.spellId)
        : undefined;
      const cycle = targetSpell ? path.has(targetSpell.id) : false;
      const alreadyExpanded = targetSpell
        ? !cycle && expandedSpellIds.has(targetSpell.id)
        : false;

      steps.push({
        sourceSpell,
        effect,
        effectIndex,
        ...(targetSpell ? { targetSpell } : {}),
        depth,
        cycle,
        alreadyExpanded,
      });

      if (!targetSpell || cycle || alreadyExpanded) {
        return;
      }

      expandedSpellIds.add(targetSpell.id);
      visit(targetSpell, depth + 1, new Set([...path, targetSpell.id]));
    });
  }

  visit(rootSpell, 1, new Set([rootSpell.id]));
  return steps;
}

export function spellEffectBacklinks(
  spells: readonly Spell[],
  targetSpellId: string,
): SpellEffectBacklink[] {
  return spells
    .flatMap((spell) =>
      spell.effects.flatMap((effect, effectIndex) =>
        effect.spellId === targetSpellId
          ? [{ spell, effect, effectIndex }]
          : [],
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.spell.canonicalKey, right.spell.canonicalKey) ||
        compareCodeUnits(left.spell.id, right.spell.id) ||
        left.effectIndex - right.effectIndex,
    );
}

export function spellBuffEventHookBacklinks(
  spells: readonly Spell[],
  targetSpellId: string,
): SpellBuffEventHookBacklink[] {
  return spells
    .flatMap((spell) =>
      spell.buffs.flatMap((buff, buffIndex) =>
        buff.eventHooks.flatMap((hook, hookIndex) =>
          hook.spellId === targetSpellId
            ? [{ spell, buffIndex, hook, hookIndex }]
            : [],
        ),
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.spell.canonicalKey, right.spell.canonicalKey) ||
        compareCodeUnits(left.spell.id, right.spell.id) ||
        left.buffIndex - right.buffIndex ||
        left.hookIndex - right.hookIndex,
    );
}

export function spellEffectOptionSpellBacklinks(
  spells: readonly Spell[],
  targetSpellId: string,
): SpellEffectOptionSpellBacklink[] {
  return spells
    .flatMap((spell) =>
      spell.effects.flatMap((effect, effectIndex) =>
        effect.options.flatMap((option, optionIndex) =>
          option.kind === "spell" && option.spellId === targetSpellId
            ? [{ spell, effect, effectIndex, option, optionIndex }]
            : [],
        ),
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.spell.canonicalKey, right.spell.canonicalKey) ||
        compareCodeUnits(left.spell.id, right.spell.id) ||
        left.effectIndex - right.effectIndex ||
        left.optionIndex - right.optionIndex,
    );
}

export function spellEffectOptionItemBacklinks(
  spells: readonly Spell[],
  targetItemId: Item["id"],
): SpellEffectOptionItemBacklink[] {
  return spells
    .flatMap((spell) =>
      spell.effects.flatMap((effect, effectIndex) =>
        effect.options.flatMap((option, optionIndex) =>
          option.kind === "item" && option.itemId === targetItemId
            ? [{ spell, effect, effectIndex, option, optionIndex }]
            : [],
        ),
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.spell.canonicalKey, right.spell.canonicalKey) ||
        compareCodeUnits(left.spell.id, right.spell.id) ||
        left.effectIndex - right.effectIndex ||
        left.optionIndex - right.optionIndex,
    );
}

export function spellEffectItemTargetBacklinks(
  spells: readonly Spell[],
  targetItemId: Item["id"],
): SpellEffectItemTargetBacklink[] {
  return spells
    .flatMap((spell) =>
      spell.effects.flatMap((effect, effectIndex) =>
        effect.itemTarget.itemId === targetItemId
          ? [{ spell, effect, effectIndex }]
          : [],
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.spell.canonicalKey, right.spell.canonicalKey) ||
        compareCodeUnits(left.spell.id, right.spell.id) ||
        left.effectIndex - right.effectIndex,
    );
}

export function spellEffectMonsterTargetBacklinks(
  spells: readonly Spell[],
  targetMonsterId: Monster["id"],
): SpellEffectMonsterTargetBacklink[] {
  return spells
    .flatMap((spell) =>
      spell.effects.flatMap((effect, effectIndex) =>
        effect.monsterTarget.monsterId === targetMonsterId
          ? [{ spell, effect, effectIndex }]
          : [],
      ),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.spell.canonicalKey, right.spell.canonicalKey) ||
        compareCodeUnits(left.spell.id, right.spell.id) ||
        left.effectIndex - right.effectIndex,
    );
}

export function spellEffectConditionBacklinks(
  spells: readonly Spell[],
  targetSpellId: string,
): SpellEffectConditionBacklink[] {
  return spells
    .flatMap((spell) =>
      spell.effects.flatMap((effect, effectIndex) => {
        const backlinks: SpellEffectConditionBacklink[] = [];
        if (effect.conditions.requiredBuff.spellId === targetSpellId) {
          backlinks.push({
            spell,
            effect,
            effectIndex,
            kind: "required-buff",
            condition: effect.conditions.requiredBuff,
          });
        }
        if (effect.conditions.forbiddenBuff.spellId === targetSpellId) {
          backlinks.push({
            spell,
            effect,
            effectIndex,
            kind: "forbidden-buff",
            condition: effect.conditions.forbiddenBuff,
          });
        }
        return backlinks;
      }),
    )
    .sort(
      (left, right) =>
        compareCodeUnits(left.spell.canonicalKey, right.spell.canonicalKey) ||
        compareCodeUnits(left.spell.id, right.spell.id) ||
        left.effectIndex - right.effectIndex ||
        compareCodeUnits(left.kind, right.kind),
    );
}
