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
export type SourceKind = "base" | "expansion" | "mod" | "fixture" | "reference";
export type DiagnosticSeverity = "info" | "warning" | "error";
export type PatchValue = string | number | boolean | null | string[];

export type RelationshipResolution<TargetKind extends EntityKind = EntityKind> =
  | {
      status: "resolved";
      resolutionMethod: "exact";
      targetKind: TargetKind;
      sourceLabel: string;
      targetId: string;
    }
  | {
      status: "resolved";
      resolutionMethod: "reviewed-correction";
      targetKind: TargetKind;
      sourceLabel: string;
      targetId: string;
      reviewId: string;
    }
  | {
      status: "source-only";
      targetKind: TargetKind;
      sourceLabel: string;
      reviewId: string;
    }
  | {
      status: "unresolved";
      targetKind: TargetKind;
      sourceLabel: string;
    };

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

export interface ItemArmourMetadata {
  slot: string | null;
  level: number | null;
  randoms: number | null;
}

export interface ItemWeaponMetadata {
  canTargetFloor: boolean | null;
  thrownPath: string | null;
}

export interface ItemMacguffinMetadata {
  spellKey: string | null;
  spellName: string | null;
  spellId?: string;
  itemClassName: string | null;
  consumable: boolean | null;
}

export interface ItemToolkitBounds {
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
}

export interface ItemToolkitSlotBounds extends ItemToolkitBounds {
  slot: number;
}

export interface ItemToolkitControlMetadata {
  path: string | null;
  positionX: number | null;
  positionY: number | null;
}

export interface ItemToolkitMetadata {
  tag: string | null;
  numSlots: number | null;
  soundCue: string | null;
  missingPath: string | null;
  presentPath: string | null;
  activePath: string | null;
  slotBounds: ItemToolkitSlotBounds[];
  outputBounds: ItemToolkitBounds;
  craftButton: ItemToolkitControlMetadata;
  recipeButton: ItemToolkitControlMetadata;
  autofillButton: ItemToolkitControlMetadata;
  closePosition: {
    x: number | null;
    y: number | null;
  };
  backgroundPath: string | null;
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

export const itemTrapActivationModes = ["always", "once"] as const;

export type ItemTrapActivationMode = (typeof itemTrapActivationModes)[number];

export interface ItemTrapMetadata {
  activation: ItemTrapActivationMode | null;
  level: number | null;
  targetsCaster: boolean | null;
  originPath: string | null;
  originMount: string | null;
  originFacing: string | null;
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
  armourDeclarations: ItemArmourMetadata[];
  weaponDeclarations: ItemWeaponMetadata[];
  macguffinDeclarations: ItemMacguffinMetadata[];
  toolkitDeclarations: ItemToolkitMetadata[];
  recoveries: ItemRecovery[];
  chargeRanges: ItemChargeRange[];
  traps: ItemTrapMetadata[];
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
  statId?: string;
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

interface SkillLoadoutBase {
  itemType?: string;
  amount: number;
  always: boolean;
}

export type SkillLoadout =
  | (SkillLoadoutBase & {
      itemKey: string;
      itemName: string;
      itemId?: string;
      itemResolution: RelationshipResolution<"item">;
    })
  | (SkillLoadoutBase & {
      itemKey?: never;
      itemName?: never;
      itemId?: never;
      itemResolution?: never;
    });

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
  itemTarget: SpellEffectItemTarget;
  monsterTarget: SpellEffectMonsterTarget;
  removedBuff: SpellEffectRemovedBuff;
  damage: SpellEffectDamage[];
  scaling: SpellEffectScaling;
  presentation: SpellEffectPresentationMetadata | null;
  createdObjectSpritePath: string | null;
  regenerateGraphics: boolean | null;
  buffTag: string | null;
  controls: SpellEffectControls;
  conditions: SpellEffectConditions;
  options: SpellEffectOption[];
}

export interface SpellEffectItemTarget {
  itemKey: string | null;
  itemName: string | null;
  itemId?: string;
}

export interface SpellEffectMonsterTarget {
  monsterKey: string | null;
  monsterName: string | null;
  monsterId?: string;
}

export interface SpellEffectRemovedBuff {
  spellKey: string | null;
  spellName: string | null;
  spellId?: string;
}

export const damageSourceKeys = [
  "acidic",
  "aethereal",
  "asphyxiative",
  "blasting",
  "conflagratory",
  "crushing",
  "existential",
  "hyperborean",
  "necromantic",
  "piercing",
  "putrefying",
  "righteous",
  "slashing",
  "toxic",
  "transmutative",
  "voltaic",
] as const;

export type DamageSourceKey = (typeof damageSourceKeys)[number];

export interface SpellEffectDamage {
  sourceKey: DamageSourceKey;
  amount: number | null;
  factor: number | null;
}

export interface SpellEffectScaling {
  amountFactor: number | null;
  floorFactor: number | null;
  primaryStatId: number | null;
  secondaryStatId: number | null;
}

export interface SpellEffectPresentationMetadata {
  iconPath: string | null;
  smallIconPath: string | null;
  spritePath: string | null;
  frameCount: number | null;
  frameRate: number | null;
  centered: boolean | null;
  soundEffect: string | null;
}

export interface SpellEffectControls {
  durationTurns: number | null;
  after: boolean | null;
  chancePercent: number | null;
  affectsCaster: boolean | null;
  affectsSelf: boolean | null;
  affectsCorpses: boolean | null;
  resistable: boolean | null;
  burnsTarget: boolean | null;
  bleedsTarget: boolean | null;
  midas: boolean | null;
  skipAnimation: boolean | null;
  taxonomy: string | null;
}

export interface SpellEffectBuffCondition {
  enabled: boolean | null;
  spellKey: string | null;
  spellName: string | null;
  spellId?: string;
}

export interface SpellEffectConditions {
  requiresSourceBuff: boolean | null;
  requiredBuff: SpellEffectBuffCondition;
  forbiddenBuff: SpellEffectBuffCondition;
}

interface SpellEffectItemOptionBase {
  kind: "item";
  amount: number | null;
}

export type SpellEffectItemOption =
  | (SpellEffectItemOptionBase & {
      itemKey: string;
      itemName: string;
      itemId?: string;
      itemResolution: RelationshipResolution<"item">;
    })
  | (SpellEffectItemOptionBase & {
      itemKey: null;
      itemName: null;
      itemId?: never;
      itemResolution?: never;
    });

export interface SpellEffectSpellOption {
  kind: "spell";
  spellKey: string | null;
  spellName: string | null;
  spellId?: string;
}

export type SpellEffectOption = SpellEffectItemOption | SpellEffectSpellOption;

export interface SpellManaCost {
  base: number | null;
  savvyReduction: number | null;
  minimum: number | null;
  sourceLevel: number | null;
}

export interface SpellBoozeRequirement {
  sourceValue: number | null;
}

export interface SpellZorkmidRequirement {
  sourceZorkmids: number | null;
  sourceZorkmidScaleFactor: number | null;
  sourceSavvyBonus: number | null;
}

export interface SpellShieldRequirement {
  sourceValue: boolean | null;
}

export interface SpellWeaponRequirement {
  sourceValue: boolean | null;
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

export const spellBuffEventHookKinds = [
  "target-hit",
  "player-hit",
  "dodge",
] as const;

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

export interface SpellBuffDescription {
  text: string | null;
}

export interface SpellBuffHaloMetadata {
  spritePath: string | null;
  frameCount: number | null;
  frameRate: number | null;
  firstFrame: number | null;
  centered: boolean | null;
}

export interface SpellAiHintMetadata {
  hint: string | null;
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
  descriptions: SpellBuffDescription[];
  halos: SpellBuffHaloMetadata[];
  invisibilityDeclarations: SpellBuffInvisibilityDeclaration[];
  muteDeclarations: SpellBuffMuteDeclaration[];
  senseWallsDeclarations: SpellBuffSenseWallsDeclaration[];
  paybackDeclarations: SpellBuffPaybackDeclaration[];
  zorkmidAbsorptionDeclarations: SpellBuffZorkmidAbsorptionDeclaration[];
  polymorphDeclarations: SpellBuffPolymorphDeclaration[];
  effects: SpellEffect[];
  aiHints: SpellAiHintMetadata[];
  sourceFlags: SourceFlag[];
  modifiers: StatModifier[];
  sightModifiers: SpellBuffSightModifier[];
  eventHooks: SpellBuffEventHook[];
}

export interface SpellBuffInvisibilityDeclaration {
  amount: number | null;
}

export interface SpellBuffMuteDeclaration {
  amount: number | null;
}

export interface SpellBuffSenseWallsDeclaration {
  enabled: boolean | null;
}

export interface SpellBuffPaybackDeclaration {
  secondaryScale: boolean | null;
  factor: number | null;
}

export interface SpellBuffZorkmidAbsorptionDeclaration {
  zorkmidsPerDamage: number | null;
  damageCap: number | null;
  maxRatio: number | null;
}

export interface SpellBuffPolymorphDeclaration {
  monsterKey: string | null;
  monsterName: string | null;
  monsterId?: string;
}

export interface SpellTargetingTemplateDeclaration {
  sourceTemplateId: string | null;
  templateKey: string | null;
  templateId?: string;
  sourceAnchored: boolean | null;
}

export interface SpellMinePresentationMetadata {
  spritePath: string | null;
  spriteSeriesPath: string | null;
  firstFrame: number | null;
  frameCount: number | null;
  frameRate: number | null;
}

export interface SpellMineDeclaration {
  sourceEnabled: boolean | null;
  sourceRadius: number | null;
  sourceTimer: number | null;
  sourcePermanence: number | null;
  sourceSpriteDrawOrder: number | null;
  sourceUsesGlints: boolean | null;
  sourceGlintDensity: number | null;
  sourceMustBeUnobstructed: boolean | null;
  presentation: SpellMinePresentationMetadata;
}

export interface SpellItemConsumptionDeclaration {
  sourceConsumesItem: boolean | null;
  sourceItemType: string | null;
}

export interface Spell extends NormalizedEntityBase {
  kind: "spell";
  spellType: string;
  iconPath: string | null;
  sourceCooldownTurns: number | null;
  sourcePerformsMeleeAttack: boolean | null;
  sourceWandFlag: boolean | null;
  itemConsumption: SpellItemConsumptionDeclaration | null;
  mine: SpellMineDeclaration | null;
  targetingTemplate: SpellTargetingTemplateDeclaration;
  manaCosts: SpellManaCost[];
  boozeRequirements: SpellBoozeRequirement[];
  zorkmidRequirements: SpellZorkmidRequirement[];
  shieldRequirements: SpellShieldRequirement[];
  weaponRequirements: SpellWeaponRequirement[];
  animations: SpellAnimationMetadata[];
  impacts: SpellImpactMetadata[];
  aiHints: SpellAiHintMetadata[];
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
  modifier: {
    kind: StatModifierKind;
    sourceKey: string;
  } | null;
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
  aliases: string[];
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
  schemaVersion: 2;
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

export const presentedAssetKinds = ["item-icon"] as const;

export type PresentedAssetKind = (typeof presentedAssetKinds)[number];

export interface PresentedAssetRecord {
  kind: PresentedAssetKind;
  entityId: string;
  file: string;
  sha256: string;
  bytes: number;
}

export interface PresentedAssetCatalog {
  schemaVersion: 1;
  datasetId: string;
  datasetVersion: string;
  assets: PresentedAssetRecord[];
}

export interface PresentedAssetDiagnostic {
  id: string;
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  kind: PresentedAssetKind;
  entityId: string;
  sourceId: string;
}

export interface PresentedAssetManifest {
  schemaVersion: 1;
  datasetId: string;
  datasetVersion: string;
  generator: string;
  diagnostics: DiagnosticCounts;
  outputs: {
    assets: { file: "assets.json"; sha256: string; bytes: number };
    diagnostics: {
      file: "diagnostics.json";
      sha256: string;
      bytes: number;
    };
  };
}
