import type { Spell, SpellEffect } from "./types";

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
        left.spell.canonicalKey.localeCompare(right.spell.canonicalKey, "en") ||
        left.spell.id.localeCompare(right.spell.id, "en") ||
        left.effectIndex - right.effectIndex,
    );
}
