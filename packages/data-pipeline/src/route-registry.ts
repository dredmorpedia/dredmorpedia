import { readFileSync } from "node:fs";

import {
  compareCodeUnits,
  entityKinds,
  slugify,
  type EntityCollections,
  type EntityKind,
  type EntityRouteReservation,
  type NormalizedEntity,
} from "@dredmorpedia/domain";
import { z } from "zod";

const entityIdTargetSchema = z.strictObject({
  type: z.literal("entity-id"),
  entityId: z.string().min(1),
});

const sourceIdTargetSchema = z.strictObject({
  type: z.literal("source-id"),
  sourceId: z.string().min(1),
  originalId: z.string().min(1),
});

const routeEntryV1Schema = z.strictObject({
  entityKind: z.enum(entityKinds),
  target: z.discriminatedUnion("type", [
    entityIdTargetSchema,
    sourceIdTargetSchema,
  ]),
  canonicalSlug: z.string().min(1),
  aliases: z.array(z.string().min(1)),
});

const routeEntryV2Schema = z.strictObject({
  entityKind: z.enum(entityKinds),
  target: sourceIdTargetSchema,
  status: z.enum(["active", "tombstone"]),
  canonicalSlug: z.string().min(1),
  aliases: z.array(z.string().min(1)),
});

const routeRegistryLineageSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("root") }),
  z.strictObject({
    type: z.literal("inherited"),
    datasetVersion: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  }),
]);

type RouteEntryInput =
  z.infer<typeof routeEntryV1Schema> | z.infer<typeof routeEntryV2Schema>;

function routeTargetKey(entry: RouteEntryInput): string {
  return entry.target.type === "entity-id"
    ? JSON.stringify([entry.entityKind, "entity-id", entry.target.entityId])
    : JSON.stringify([
        entry.entityKind,
        "source-id",
        entry.target.sourceId,
        entry.target.originalId,
      ]);
}

function validateRouteEntries(
  registry: { entries: RouteEntryInput[] },
  context: z.RefinementCtx,
): void {
  const targets = new Set<string>();
  const routes = new Set<string>();
  for (const [index, entry] of registry.entries.entries()) {
    const target = routeTargetKey(entry);
    if (targets.has(target)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate route-registry target: ${target}`,
        path: ["entries", index, "target"],
      });
    }
    targets.add(target);

    if (entry.aliases.includes(entry.canonicalSlug)) {
      context.addIssue({
        code: "custom",
        message: "A canonical route cannot also be its own alias.",
        path: ["entries", index, "aliases"],
      });
    }
    const localRoutes = new Set<string>();
    for (const [routeIndex, route] of [
      entry.canonicalSlug,
      ...entry.aliases,
    ].entries()) {
      if (slugify(route) !== route) {
        context.addIssue({
          code: "custom",
          message: `Route is not a normalized URL slug: ${route}`,
          path:
            routeIndex === 0
              ? ["entries", index, "canonicalSlug"]
              : ["entries", index, "aliases", routeIndex - 1],
        });
      }
      if (localRoutes.has(route)) {
        context.addIssue({
          code: "custom",
          message: `Duplicate route within registry entry: ${route}`,
          path: ["entries", index],
        });
      }
      localRoutes.add(route);

      const routeKey = `${entry.entityKind}:${route}`;
      if (routes.has(routeKey)) {
        context.addIssue({
          code: "custom",
          message: `Route has more than one registry owner: ${routeKey}`,
          path: ["entries", index],
        });
      }
      routes.add(routeKey);
    }
  }
}

const routeRegistryV1Schema = z
  .strictObject({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    datasetVersion: z.string().min(1),
    entries: z.array(routeEntryV1Schema),
  })
  .superRefine(validateRouteEntries);

const routeRegistryV2Schema = z
  .strictObject({
    schemaVersion: z.literal(2),
    datasetId: z.string().min(1),
    datasetVersion: z.string().min(1),
    lineage: routeRegistryLineageSchema,
    entries: z.array(routeEntryV2Schema),
  })
  .superRefine(validateRouteEntries);

const routeRegistrySchema = z.discriminatedUnion("schemaVersion", [
  routeRegistryV1Schema,
  routeRegistryV2Schema,
]);

export type RouteRegistryTarget =
  z.infer<typeof entityIdTargetSchema> | z.infer<typeof sourceIdTargetSchema>;

export interface RouteRegistryEntry {
  entityKind: EntityKind;
  target: RouteRegistryTarget;
  status: "active" | "tombstone";
  canonicalSlug: string;
  aliases: string[];
}

export type RouteRegistryLineage = z.infer<typeof routeRegistryLineageSchema>;

export interface RouteRegistryDefinition {
  schemaVersion: 1 | 2;
  datasetId: string;
  datasetVersion: string;
  file: string;
  lineage?: RouteRegistryLineage;
  entries: RouteRegistryEntry[];
}

export type RouteRegistryIssueCode =
  | "route_registry_entity_duplicate"
  | "route_registry_entity_unregistered"
  | "route_registry_inheritance_stale"
  | "route_registry_predecessor_mismatch"
  | "route_registry_predecessor_missing"
  | "route_registry_predecessor_unexpected"
  | "route_registry_publication_schema"
  | "route_registry_scope_mismatch"
  | "route_registry_target_ambiguous"
  | "route_registry_target_missing"
  | "route_registry_tombstone_active"
  | "route_registry_tombstone_uninherited";

export interface RouteRegistryIssue {
  code: RouteRegistryIssueCode;
  message: string;
  entryIndex?: number;
  entityId?: string;
}

export interface RouteRegistryApplication {
  entityId: string;
  entityName: string;
  entityKind: EntityKind;
  canonicalSlug: string;
  aliases: string[];
}

export interface RouteRegistryTombstone {
  entityKind: EntityKind;
  canonicalSlug: string;
  aliases: string[];
  targetKey: string;
}

export interface RouteRegistryResolution {
  reservations: EntityRouteReservation[];
  applications: RouteRegistryApplication[];
  tombstones: RouteRegistryTombstone[];
  issues: RouteRegistryIssue[];
}

export interface RouteRegistryResolutionOptions {
  previousRegistry?: RouteRegistryDefinition;
  previousRegistrySha256?: string;
  requirePublication?: boolean;
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

function matchingEntities(
  entities: readonly NormalizedEntity[],
  entry: RouteRegistryEntry,
): NormalizedEntity[] {
  const target = entry.target;
  return entities.filter((entity) => {
    if (entity.kind !== entry.entityKind) {
      return false;
    }
    if (target.type === "entity-id") {
      return entity.id === target.entityId;
    }
    return entity.variants.some(
      (variant) =>
        variant.sourceId === target.sourceId &&
        variant.originalId === target.originalId,
    );
  });
}

export function parseRouteRegistry(
  json: string,
  displayPath: string,
): RouteRegistryDefinition {
  const registry = routeRegistrySchema.parse(JSON.parse(json) as unknown);
  return {
    ...registry,
    file: displayPath,
    entries: registry.entries.map((entry) => ({
      ...entry,
      status: "status" in entry ? entry.status : "active",
    })),
  };
}

export function loadRouteRegistry(
  absolutePath: string,
  displayPath: string,
): RouteRegistryDefinition {
  return parseRouteRegistry(readFileSync(absolutePath, "utf8"), displayPath);
}

function validateInheritance(
  registry: RouteRegistryDefinition,
  options: RouteRegistryResolutionOptions,
): RouteRegistryIssue[] {
  const issues: RouteRegistryIssue[] = [];
  const previous = options.previousRegistry;

  if (registry.schemaVersion === 1) {
    if (options.requirePublication) {
      issues.push({
        code: "route_registry_publication_schema",
        message:
          "Publication requires a schema-2 route registry with explicit lineage and stable source identities.",
      });
    }
    if (previous) {
      issues.push({
        code: "route_registry_predecessor_unexpected",
        message:
          "A schema-1 route registry cannot declare an inherited predecessor.",
      });
    }
    return issues;
  }

  const lineage = registry.lineage;
  if (!lineage) {
    return [
      {
        code: "route_registry_publication_schema",
        message: "Schema-2 route registry lineage is missing.",
      },
    ];
  }
  if (lineage.type === "root") {
    if (previous) {
      issues.push({
        code: "route_registry_predecessor_unexpected",
        message:
          "A root route registry must not be paired with a predecessor snapshot.",
      });
    }
  } else if (!previous || !options.previousRegistrySha256) {
    issues.push({
      code: "route_registry_predecessor_missing",
      message: `Route registry inheritance from ${lineage.datasetVersion} requires its exact predecessor snapshot.`,
    });
  } else if (
    previous.schemaVersion !== 2 ||
    previous.datasetId !== registry.datasetId ||
    previous.datasetVersion !== lineage.datasetVersion ||
    options.previousRegistrySha256 !== lineage.sha256
  ) {
    issues.push({
      code: "route_registry_predecessor_mismatch",
      message:
        "The predecessor route registry does not match the declared dataset lineage, version, and checksum.",
    });
  }

  if (issues.length > 0) {
    return issues;
  }

  const previousEntries = previous?.entries ?? [];
  const previousTargetKeys = new Set(
    previousEntries.map((entry) => routeTargetKey(entry)),
  );
  const currentByTarget = new Map(
    registry.entries.map((entry, entryIndex) => [
      routeTargetKey(entry),
      { entry, entryIndex },
    ]),
  );
  for (const previousEntry of previousEntries) {
    const inherited = currentByTarget.get(routeTargetKey(previousEntry));
    const missingAliases = inherited
      ? previousEntry.aliases.filter(
          (alias) => !inherited.entry.aliases.includes(alias),
        )
      : [];
    if (
      !inherited ||
      inherited.entry.canonicalSlug !== previousEntry.canonicalSlug ||
      missingAliases.length > 0
    ) {
      issues.push({
        code: "route_registry_inheritance_stale",
        message: `Inherited route owner ${routeTargetKey(previousEntry)} must retain its canonical slug and every historical alias.`,
        ...(inherited ? { entryIndex: inherited.entryIndex } : {}),
      });
    }
  }

  for (const [entryIndex, entry] of registry.entries.entries()) {
    if (
      entry.status === "tombstone" &&
      !previousTargetKeys.has(routeTargetKey(entry))
    ) {
      issues.push({
        code: "route_registry_tombstone_uninherited",
        message: `Tombstone ${routeTargetKey(entry)} does not reserve a route from the predecessor registry.`,
        entryIndex,
      });
    }
  }
  return issues;
}

export function resolveRouteRegistry(
  collections: EntityCollections,
  registry: RouteRegistryDefinition,
  datasetId: string,
  datasetVersion: string,
  options: RouteRegistryResolutionOptions = {},
): RouteRegistryResolution {
  if (
    registry.datasetId !== datasetId ||
    registry.datasetVersion !== datasetVersion
  ) {
    return {
      reservations: [],
      applications: [],
      tombstones: [],
      issues: [
        {
          code: "route_registry_scope_mismatch",
          message: `Route registry does not match dataset ${datasetId}@${datasetVersion}.`,
        },
      ],
    };
  }

  const entities = allEntities(collections);
  const resolvedEntityIds = new Set<string>();
  const reservations: EntityRouteReservation[] = [];
  const applications: RouteRegistryApplication[] = [];
  const tombstones: RouteRegistryTombstone[] = [];
  const issues = validateInheritance(registry, options);
  for (const [entryIndex, entry] of registry.entries.entries()) {
    const candidates = matchingEntities(entities, entry);
    if (entry.status === "tombstone") {
      if (candidates.length > 0) {
        issues.push({
          code:
            candidates.length > 1
              ? "route_registry_target_ambiguous"
              : "route_registry_tombstone_active",
          message:
            candidates.length > 1
              ? `Route registry entry ${entryIndex} resolves to multiple active ${entry.entityKind} records.`
              : `Route registry tombstone ${entryIndex} resolves to an active ${entry.entityKind}; mark it active to reclaim its routes.`,
          entryIndex,
          ...(candidates.length === 1 && candidates[0]
            ? { entityId: candidates[0].id }
            : {}),
        });
      }
      tombstones.push({
        entityKind: entry.entityKind,
        canonicalSlug: entry.canonicalSlug,
        aliases: [...entry.aliases],
        targetKey: routeTargetKey(entry),
      });
      continue;
    }

    if (candidates.length === 0) {
      issues.push({
        code: "route_registry_target_missing",
        message: `Route registry entry ${entryIndex} does not resolve to an active ${entry.entityKind}.`,
        entryIndex,
      });
      continue;
    }
    if (candidates.length > 1) {
      issues.push({
        code: "route_registry_target_ambiguous",
        message: `Route registry entry ${entryIndex} resolves to multiple active ${entry.entityKind} records.`,
        entryIndex,
      });
      continue;
    }

    const entity = candidates[0];
    if (!entity) {
      continue;
    }
    if (resolvedEntityIds.has(entity.id)) {
      issues.push({
        code: "route_registry_entity_duplicate",
        message: `Multiple route registry entries resolve to ${entity.name}.`,
        entryIndex,
        entityId: entity.id,
      });
      continue;
    }
    resolvedEntityIds.add(entity.id);
    reservations.push({
      entityId: entity.id,
      canonicalSlug: entry.canonicalSlug,
      aliases: [...entry.aliases],
    });
    applications.push({
      entityId: entity.id,
      entityName: entity.name,
      entityKind: entity.kind,
      canonicalSlug: entry.canonicalSlug,
      aliases: [...entry.aliases],
    });
  }

  if (options.requirePublication && registry.schemaVersion === 2) {
    for (const entity of entities) {
      if (!resolvedEntityIds.has(entity.id)) {
        issues.push({
          code: "route_registry_entity_unregistered",
          message: `Publication route registry does not reserve the active ${entity.kind} ${entity.name}.`,
          entityId: entity.id,
        });
      }
    }
  }

  if (issues.length > 0) {
    return { reservations: [], applications: [], tombstones: [], issues };
  }
  return {
    reservations: reservations.sort((left, right) =>
      compareCodeUnits(left.entityId, right.entityId),
    ),
    applications: applications.sort((left, right) =>
      compareCodeUnits(left.entityId, right.entityId),
    ),
    tombstones: tombstones.sort(
      (left, right) =>
        compareCodeUnits(left.entityKind, right.entityKind) ||
        compareCodeUnits(left.canonicalSlug, right.canonicalSlug) ||
        compareCodeUnits(left.targetKey, right.targetKey),
    ),
    issues: [],
  };
}
