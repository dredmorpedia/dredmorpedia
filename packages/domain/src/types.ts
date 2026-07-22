export const entityKinds = [
  "item",
  "recipe",
  "encrustment",
  "skill",
  "ability",
  "spell",
  "monster",
  "stat",
  "template",
] as const;

export type EntityKind = (typeof entityKinds)[number];
export type SourceKind = "base" | "expansion" | "mod" | "fixture";
export type DiagnosticSeverity = "info" | "warning" | "error";
export type PatchValue = string | number | boolean | null | string[];

export interface SourceLocation {
  sourceId: string;
  file: string;
  line: number;
  column: number;
}

export interface EntityProvenance extends SourceLocation {
  originalName: string;
  originalId?: string;
}

export interface AppliedOverride {
  previous: EntityProvenance;
  replacement: EntityProvenance;
  changedFields: string[];
}

export interface AppliedPatchChange {
  field: string;
  previousValue: PatchValue;
  value: PatchValue;
}

export interface AppliedPatch {
  id: string;
  file: string;
  reason: string;
  sourceId: string;
  sourceVersion: string;
  changes: AppliedPatchChange[];
}

export interface NormalizedEntityBase {
  id: string;
  kind: EntityKind;
  canonicalKey: string;
  slug: string;
  slugAliases: string[];
  name: string;
  description: string;
  provenance: EntityProvenance;
  variants: EntityProvenance[];
  appliedOverrides: AppliedOverride[];
  appliedPatches: AppliedPatch[];
  diagnosticIds: string[];
}

export interface ItemStatValue {
  statKey: string;
  statName: string;
  amount: number;
  statId?: string;
}

export interface ItemArtifactMetadata {
  quality: number | null;
}

export const itemRecoveryResources = ["life", "mana"] as const;

export type ItemRecoveryResource = (typeof itemRecoveryResources)[number];

export interface ItemRecovery {
  resource: ItemRecoveryResource;
  amount: number | null;
  sourceFlags: SourceFlag[];
}

export interface ItemChargeRange {
  minimum: number | null;
  maximum: number | null;
}

export const itemTriggerKinds = [
  "stepped-on",
  "zapped",
  "quaffed",
  "munched",
  "item-hit",
  "melee-target",
  "crossbow-target",
  "thrown-target",
  "kill-target",
  "melee-self",
  "dodge",
  "critical",
  "counter",
  "block",
  "cast",
  "activated",
  "eaten",
  "drunk",
  "trigger-once",
  "trigger-repeat",
  "trigger-list",
] as const;

export type ItemTriggerKind = (typeof itemTriggerKinds)[number];

export interface SpellTrigger {
  kind: ItemTriggerKind;
  spellKey: string;
  spellName: string;
  spellId?: string;
  chance: number | null;
  delay: number;
  duration: number;
  unresistable: boolean;
  monsterTaxonomy: string | null;
  sourceFlags: SourceFlag[];
}

export type ItemTrigger = SpellTrigger;

export interface Item extends NormalizedEntityBase {
  kind: "item";
  category: string;
  price: number | null;
  quality: number;
  artifacts: ItemArtifactMetadata[];
  recoveries: ItemRecovery[];
  chargeRanges: ItemChargeRange[];
  iconPath: string | null;
  stats: ItemStatValue[];
  modifiers: StatModifier[];
  triggers: ItemTrigger[];
}

export interface ItemReference {
  itemKey: string;
  itemName: string;
  amount: number;
  itemId?: string;
}

export interface Recipe extends NormalizedEntityBase {
  kind: "recipe";
  tool: string;
  hidden: boolean;
  skillLevel: number;
  inputs: ItemReference[];
  outputs: ItemReference[];
}

export const statModifierKinds = [
  "damage",
  "resistance",
  "primary",
  "secondary",
] as const;

export type StatModifierKind = (typeof statModifierKinds)[number];

export interface StatModifier {
  kind: StatModifierKind;
  sourceKey: string;
  amount: number;
}

export const encrustmentModifierKinds = statModifierKinds;
export type EncrustmentModifierKind = StatModifierKind;
export type EncrustmentModifier = StatModifier;
export type AbilityModifier = StatModifier;

export interface EncrustmentPower {
  name: string;
  chance: number | null;
}

export interface EncrustmentInstabilityEffect {
  name: string;
  spellKey: string;
  spellName: string;
  spellId?: string;
  provenance: EntityProvenance;
}

export interface Encrustment extends NormalizedEntityBase {
  kind: "encrustment";
  tool: string;
  hidden: boolean;
  skillLevel: number;
  inputs: ItemReference[];
  slots: string[];
  instability: number;
  modifiers: EncrustmentModifier[];
  powers: EncrustmentPower[];
  appearanceDescriptors: string[];
}

export interface SkillLoadout {
  itemKey?: string;
  itemName?: string;
  itemId?: string;
  itemType?: string;
  amount: number;
  always: boolean;
}

export interface SourceFlag {
  sourceKey: string;
  value: string;
}

export interface SkillProgressionTag {
  level: number;
  name: string;
}

export interface Skill extends NormalizedEntityBase {
  kind: "skill";
  archetype: string;
  iconPath: string | null;
  loadouts: SkillLoadout[];
  loadoutItemKeys: string[];
  sourceFlags: SourceFlag[];
  progressionTags: SkillProgressionTag[];
  abilityIds: string[];
}

export interface Ability extends NormalizedEntityBase {
  kind: "ability";
  skillKey: string;
  skillId?: string;
  iconPath: string | null;
  level: number;
  startSkill: boolean;
  modifiers: AbilityModifier[];
  sourceFlags: SourceFlag[];
  recoveryBuffAmounts: number[];
  currencyBuffPercents: number[];
  triggers: SpellTrigger[];
  spellKeys: string[];
  spellIds: string[];
}

export interface SpellEffect {
  type: string;
  spellKey?: string;
  spellName?: string;
  spellId?: string;
  statKey?: string;
  statName?: string;
  statId?: string;
  amount?: number;
}

export interface SpellManaCost {
  base: number | null;
  savvyReduction: number | null;
  minimum: number | null;
}

export interface SpellFramePresentationMetadata {
  spritePath: string | null;
  frameCount: number | null;
  frameRate: number | null;
  firstFrame: number | null;
  centered: boolean | null;
  synchronized: boolean | null;
  soundEffect: string | null;
}

export type SpellAnimationMetadata = SpellFramePresentationMetadata;
export type SpellImpactMetadata = SpellFramePresentationMetadata;

export const spellBuffEventHookKinds = ["target-hit", "player-hit"] as const;

export type SpellBuffEventHookKind = (typeof spellBuffEventHookKinds)[number];

export interface SpellBuffEventHook {
  kind: SpellBuffEventHookKind;
  spellKey: string;
  spellName: string;
  spellId?: string;
  chance: number | null;
  sourceFlags: SourceFlag[];
}

export interface SpellBuffSightModifier {
  amount: number | null;
}

export interface SpellBuff {
  iconPath: string | null;
  smallIconPath: string | null;
  timerMode: number | null;
  duration: number | null;
  manaUpkeep: number | null;
  currencyUpkeep: number | null;
  hitLimit: number | null;
  attackLimit: number | null;
  removable: boolean | null;
  affectsSelf: boolean | null;
  resistable: boolean | null;
  detrimental: boolean | null;
  stackable: boolean | null;
  allowStacking: boolean | null;
  stackLimit: number | null;
  sourceFlags: SourceFlag[];
  modifiers: StatModifier[];
  sightModifiers: SpellBuffSightModifier[];
  eventHooks: SpellBuffEventHook[];
}

export interface Spell extends NormalizedEntityBase {
  kind: "spell";
  spellType: string;
  iconPath: string | null;
  manaCosts: SpellManaCost[];
  animations: SpellAnimationMetadata[];
  impacts: SpellImpactMetadata[];
  buffs: SpellBuff[];
  effects: SpellEffect[];
}

export interface MonsterArchetypeLevels {
  fighter: number;
  rogue: number;
  wizard: number;
}

export interface MonsterAiMetadata {
  aggressiveness: number | null;
  span: number | null;
  invisible: boolean | null;
  chicken: boolean | null;
  canCharm: boolean | null;
  canParalyze: boolean | null;
  stealGold: boolean | null;
  stealPercentage: number | null;
}

export interface MonsterSightMetadata {
  cone: number | null;
  modifier: number | null;
}

export interface MonsterDigMetadata {
  chance: number | null;
  ambushChance: number | null;
  blockedChance: number | null;
  minimumTurns: number | null;
  maximumTurns: number | null;
  minimumDistance: number | null;
}

export interface MonsterDashMetadata {
  chance: number | null;
  speed: number | null;
  minimumDistance: number | null;
  interruptible: boolean | null;
}

export interface MonsterChargeMetadata {
  chance: number | null;
  range: number | null;
  turns: number | null;
  interruptible: boolean | null;
  blocksAction: boolean | null;
  targetsSelf: boolean | null;
}

export interface MonsterMovementMetadata {
  dig: MonsterDigMetadata | null;
  dash: MonsterDashMetadata | null;
  charge: MonsterChargeMetadata | null;
}

export interface MonsterSoundEffectMetadata {
  attack: string | null;
  death: string | null;
  hit: string | null;
  spell: string | null;
  digIn: string | null;
  digOut: string | null;
}

export interface MonsterDirectionalSpriteMetadata {
  down: string | null;
  left: string | null;
  right: string | null;
  up: string | null;
}

export interface MonsterNamedSpriteMetadata {
  name: string | null;
}

export interface MonsterMorphSpriteMetadata {
  drink: string | null;
  eat: string | null;
  femaleLevelUp: string | null;
  maleLevelUp: string | null;
  longIdle: string | null;
  vanish: string | null;
}

export interface MonsterDigSpriteMetadata {
  down: string | null;
  up: string | null;
}

export interface MonsterPresentationMetadata {
  soundEffects: MonsterSoundEffectMetadata | null;
  attack: MonsterDirectionalSpriteMetadata | null;
  hit: MonsterDirectionalSpriteMetadata | null;
  death: MonsterNamedSpriteMetadata | null;
  cast: MonsterNamedSpriteMetadata | null;
  beam: MonsterDirectionalSpriteMetadata | null;
  morph: MonsterMorphSpriteMetadata | null;
  dig: MonsterDigSpriteMetadata | null;
}

export const monsterSpellTriggerKinds = [
  "on-hit",
  "cast-when-aware",
  "on-death",
  "dash-hit",
  "dash-miss",
  "charge",
] as const;

export type MonsterSpellTriggerKind = (typeof monsterSpellTriggerKinds)[number];

export interface MonsterSpellTrigger {
  kind: MonsterSpellTriggerKind;
  spellKey: string;
  spellName: string;
  spellId?: string;
  chance: number | null;
  oneChanceIn: number | null;
}

interface MonsterDropBase {
  chance: number;
}

export interface NamedMonsterDrop extends MonsterDropBase {
  itemKey: string;
  itemName: string;
  itemId?: string;
  dropType?: never;
}

export interface TypedMonsterDrop extends MonsterDropBase {
  dropType: string;
  itemKey?: never;
  itemName?: never;
  itemId?: never;
}

export type MonsterDrop = NamedMonsterDrop | TypedMonsterDrop;

export interface Monster extends NormalizedEntityBase {
  kind: "monster";
  taxonomy: string;
  level: number;
  depth: number | null;
  special: boolean;
  iconPath: string | null;
  paletteName: string | null;
  paletteTint: number | null;
  archetypeLevels: MonsterArchetypeLevels;
  ai: MonsterAiMetadata;
  sight: MonsterSightMetadata;
  movement: MonsterMovementMetadata;
  presentation: MonsterPresentationMetadata;
  experienceValue: number | null;
  modifiers: StatModifier[];
  spellChance: number | null;
  triggers: MonsterSpellTrigger[];
  drops: MonsterDrop[];
  inheritsKey?: string;
  inheritsName?: string;
  inheritsId?: string;
}

export interface Stat extends NormalizedEntityBase {
  kind: "stat";
  group: string;
}

export interface Template extends NormalizedEntityBase {
  kind: "template";
  affectsPlayer: boolean;
  rows: string[];
}

export type NormalizedEntity =
  | Item
  | Recipe
  | Encrustment
  | Skill
  | Ability
  | Spell
  | Monster
  | Stat
  | Template;

export interface SourceSummary {
  id: string;
  label: string;
  kind: SourceKind;
  version: string;
  precedence: number;
}

export interface EntityCollections {
  items: Item[];
  recipes: Recipe[];
  encrustments: Encrustment[];
  skills: Skill[];
  abilities: Ability[];
  spells: Spell[];
  monsters: Monster[];
  stats: Stat[];
  templates: Template[];
}

export interface SearchDocument {
  id: string;
  kind: EntityKind;
  name: string;
  summary: string;
  sourceId: string;
  category: string | null;
  statKeys: string[];
  url: string;
  text: string;
}

export interface DiagnosticCounts {
  info: number;
  warning: number;
  error: number;
}

export interface DatasetArtifact {
  schemaVersion: 3;
  datasetId: string;
  datasetVersion: string;
  language: "en";
  sources: SourceSummary[];
  encrustmentInstabilityEffects: EncrustmentInstabilityEffect[];
  entities: EntityCollections;
  diagnostics: DiagnosticCounts;
}

export interface SearchArtifact {
  schemaVersion: 1;
  datasetSchemaVersion: DatasetArtifact["schemaVersion"];
  datasetId: string;
  language: "en";
  documents: SearchDocument[];
}

export type DiagnosticDetailValue = PatchValue;

export interface Diagnostic {
  id: string;
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  source?: SourceLocation;
  entityId?: string;
  details?: Record<string, DiagnosticDetailValue>;
}

export interface InputChecksum {
  file: string;
  sha256: string;
}

export interface ArtifactManifest {
  schemaVersion: 2;
  datasetId: string;
  generator: string;
  sourceManifest: string;
  inputs: InputChecksum[];
  outputs: {
    artifact: { file: string; sha256: string; bytes: number };
    search: { file: string; sha256: string; bytes: number };
    diagnostics: { file: string; sha256: string; bytes: number };
  };
}
