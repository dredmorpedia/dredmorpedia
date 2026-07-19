export const entityKinds = [
  "item",
  "recipe",
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
  diagnosticIds: string[];
}

export interface ItemStatValue {
  statKey: string;
  statName: string;
  amount: number;
  statId?: string;
}

export interface Item extends NormalizedEntityBase {
  kind: "item";
  category: string;
  price: number | null;
  iconPath: string | null;
  stats: ItemStatValue[];
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

export interface Skill extends NormalizedEntityBase {
  kind: "skill";
  archetype: string;
  iconPath: string | null;
  loadoutItemKeys: string[];
  abilityIds: string[];
}

export interface Ability extends NormalizedEntityBase {
  kind: "ability";
  skillKey: string;
  skillId?: string;
  iconPath: string | null;
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

export interface Spell extends NormalizedEntityBase {
  kind: "spell";
  spellType: string;
  iconPath: string | null;
  effects: SpellEffect[];
}

export interface Monster extends NormalizedEntityBase {
  kind: "monster";
  taxonomy: string;
  level: number;
  iconPath: string | null;
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
  Item | Recipe | Skill | Ability | Spell | Monster | Stat | Template;

export interface SourceSummary {
  id: string;
  label: string;
  kind: SourceKind;
  precedence: number;
}

export interface EntityCollections {
  items: Item[];
  recipes: Recipe[];
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
  schemaVersion: 2;
  datasetId: string;
  language: "en";
  sources: SourceSummary[];
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

export type DiagnosticDetailValue = string | number | boolean | string[];

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
