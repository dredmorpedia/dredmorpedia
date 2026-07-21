import type {
  AppliedPatch,
  AppliedPatchChange,
  EntityCollections,
  EntityKind,
  NormalizedEntity,
  PatchValue,
} from "./types";

export interface EntityPatchOperation {
  entityKind: EntityKind;
  canonicalKey: string;
  field: string;
  expectedValue: PatchValue;
  value: PatchValue;
}

export interface EntityPatchDefinition {
  schemaVersion: 1;
  id: string;
  file: string;
  reason: string;
  appliesTo: {
    datasetId: string;
    datasetVersion: string;
    sourceId: string;
    sourceVersion: string;
  };
  operations: EntityPatchOperation[];
}

export type PatchIssueCode =
  | "patch_duplicate_operation"
  | "patch_field_unsupported"
  | "patch_noop"
  | "patch_precondition_failed"
  | "patch_source_mismatch"
  | "patch_target_missing"
  | "patch_value_invalid";

export interface PatchIssue {
  code: PatchIssueCode;
  message: string;
  operationIndex: number;
  entityId?: string;
  expectedValue?: PatchValue;
  actualValue?: PatchValue;
}

export interface PatchApplication {
  entityId: string;
  entityName: string;
  patch: AppliedPatch;
}

export interface PatchApplicationResult {
  entities: EntityCollections;
  applications: PatchApplication[];
  issues: PatchIssue[];
}

type ValueValidator = (value: unknown) => value is PatchValue;

const isString: ValueValidator = (value): value is string =>
  typeof value === "string";
const isNumber: ValueValidator = (value): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const isNullableNumber: ValueValidator = (value): value is number | null =>
  value === null || isNumber(value);
const isBoolean: ValueValidator = (value): value is boolean =>
  typeof value === "boolean";
const isStringArray: ValueValidator = (value): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const patchableFields: Record<
  EntityKind,
  Readonly<Record<string, ValueValidator>>
> = {
  item: {
    description: isString,
    category: isString,
    price: isNullableNumber,
    quality: isNonNegativeInteger,
  },
  recipe: {
    description: isString,
    tool: isString,
    hidden: isBoolean,
    skillLevel: isNumber,
  },
  encrustment: {
    description: isString,
    tool: isString,
    hidden: isBoolean,
    skillLevel: isNonNegativeInteger,
    slots: isStringArray,
    instability: isNumber,
  },
  skill: {
    description: isString,
    archetype: isString,
    loadoutItemKeys: isStringArray,
  },
  ability: {
    description: isString,
    skillKey: isString,
    spellKeys: isStringArray,
  },
  spell: {
    description: isString,
    spellType: isString,
  },
  monster: {
    description: isString,
    taxonomy: isString,
    level: isNumber,
    inheritsKey: isString,
    inheritsName: isString,
  },
  stat: {
    description: isString,
    group: isString,
  },
  template: {
    description: isString,
    affectsPlayer: isBoolean,
    rows: isStringArray,
  },
};

function copyValue(value: PatchValue): PatchValue {
  return Array.isArray(value) ? [...value] : value;
}

function sameValue(left: PatchValue, right: PatchValue): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((entry, index) => entry === right[index])
    );
  }
  return Object.is(left, right);
}

function allEntities(collections: EntityCollections): NormalizedEntity[] {
  return [
    ...collections.items,
    ...collections.recipes,
    ...collections.encrustments,
    ...collections.skills,
    ...collections.abilities,
    ...collections.spells,
    ...collections.monsters,
    ...collections.stats,
    ...collections.templates,
  ];
}

function replacePatchedEntities(
  collections: EntityCollections,
  patchedById: ReadonlyMap<string, NormalizedEntity>,
): EntityCollections {
  const replace = <T extends NormalizedEntity>(entities: readonly T[]): T[] =>
    entities.map((entity) => (patchedById.get(entity.id) as T) ?? entity);

  return {
    items: replace(collections.items),
    recipes: replace(collections.recipes),
    encrustments: replace(collections.encrustments),
    skills: replace(collections.skills),
    abilities: replace(collections.abilities),
    spells: replace(collections.spells),
    monsters: replace(collections.monsters),
    stats: replace(collections.stats),
    templates: replace(collections.templates),
  };
}

export function applyEntityPatch(
  collections: EntityCollections,
  definition: EntityPatchDefinition,
): PatchApplicationResult {
  const entityByTarget = new Map(
    allEntities(collections).map((entity) => [
      `${entity.kind}:${entity.canonicalKey}`,
      entity,
    ]),
  );
  const sortedOperations = definition.operations
    .map((operation, operationIndex) => ({ operation, operationIndex }))
    .sort(
      (left, right) =>
        left.operation.entityKind.localeCompare(
          right.operation.entityKind,
          "en",
        ) ||
        left.operation.canonicalKey.localeCompare(
          right.operation.canonicalKey,
          "en",
        ) ||
        left.operation.field.localeCompare(right.operation.field, "en") ||
        left.operationIndex - right.operationIndex,
    );
  const issues: PatchIssue[] = [];
  const seenOperations = new Set<string>();
  const validated = new Map<
    string,
    { entity: NormalizedEntity; operations: EntityPatchOperation[] }
  >();

  for (const { operation, operationIndex } of sortedOperations) {
    const operationKey = `${operation.entityKind}:${operation.canonicalKey}:${operation.field}`;
    if (seenOperations.has(operationKey)) {
      issues.push({
        code: "patch_duplicate_operation",
        message: `Patch ${definition.id} changes ${operationKey} more than once.`,
        operationIndex,
      });
      continue;
    }
    seenOperations.add(operationKey);

    const entity = entityByTarget.get(
      `${operation.entityKind}:${operation.canonicalKey}`,
    );
    if (!entity) {
      issues.push({
        code: "patch_target_missing",
        message: `Patch ${definition.id} targets an unknown ${operation.entityKind}: ${operation.canonicalKey}.`,
        operationIndex,
      });
      continue;
    }
    if (entity.provenance.sourceId !== definition.appliesTo.sourceId) {
      issues.push({
        code: "patch_source_mismatch",
        message: `Patch ${definition.id} expected ${entity.name} from ${definition.appliesTo.sourceId}, but the active source is ${entity.provenance.sourceId}.`,
        operationIndex,
        entityId: entity.id,
      });
      continue;
    }

    const validator = patchableFields[operation.entityKind][operation.field];
    if (!validator) {
      issues.push({
        code: "patch_field_unsupported",
        message: `Patch ${definition.id} cannot change protected or unsupported field ${operation.field} on ${operation.entityKind}.`,
        operationIndex,
        entityId: entity.id,
      });
      continue;
    }
    if (!validator(operation.expectedValue) || !validator(operation.value)) {
      issues.push({
        code: "patch_value_invalid",
        message: `Patch ${definition.id} has an invalid value type for ${operation.entityKind}.${operation.field}.`,
        operationIndex,
        entityId: entity.id,
      });
      continue;
    }
    if (sameValue(operation.expectedValue, operation.value)) {
      issues.push({
        code: "patch_noop",
        message: `Patch ${definition.id} does not change ${entity.name}.${operation.field}.`,
        operationIndex,
        entityId: entity.id,
      });
      continue;
    }

    const actualValue = (
      entity as unknown as Readonly<Record<string, unknown>>
    )[operation.field];
    if (!validator(actualValue)) {
      issues.push({
        code: "patch_value_invalid",
        message: `Active ${operation.entityKind}.${operation.field} has an unsupported value type.`,
        operationIndex,
        entityId: entity.id,
      });
      continue;
    }
    if (!sameValue(actualValue, operation.expectedValue)) {
      issues.push({
        code: "patch_precondition_failed",
        message: `Patch ${definition.id} expected a different current value for ${entity.name}.${operation.field}.`,
        operationIndex,
        entityId: entity.id,
        expectedValue: copyValue(operation.expectedValue),
        actualValue: copyValue(actualValue),
      });
      continue;
    }

    const group = validated.get(entity.id) ?? { entity, operations: [] };
    group.operations.push(operation);
    validated.set(entity.id, group);
  }

  if (issues.length > 0) {
    return { entities: collections, applications: [], issues };
  }

  const patchedById = new Map<string, NormalizedEntity>();
  const applications: PatchApplication[] = [];
  for (const [entityId, group] of [...validated].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  )) {
    const changes: AppliedPatchChange[] = group.operations.map((operation) => ({
      field: operation.field,
      previousValue: copyValue(operation.expectedValue),
      value: copyValue(operation.value),
    }));
    const appliedPatch: AppliedPatch = {
      id: definition.id,
      file: definition.file,
      reason: definition.reason,
      sourceId: definition.appliesTo.sourceId,
      sourceVersion: definition.appliesTo.sourceVersion,
      changes,
    };
    const patchedRecord: Record<string, unknown> = { ...group.entity };
    for (const operation of group.operations) {
      patchedRecord[operation.field] = copyValue(operation.value);
    }
    patchedRecord.appliedPatches = [
      ...group.entity.appliedPatches,
      appliedPatch,
    ];
    const patched = patchedRecord as unknown as NormalizedEntity;
    patchedById.set(entityId, patched);
    applications.push({
      entityId,
      entityName: group.entity.name,
      patch: appliedPatch,
    });
  }

  return {
    entities: replacePatchedEntities(collections, patchedById),
    applications,
    issues: [],
  };
}
