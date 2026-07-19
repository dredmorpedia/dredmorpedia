import { readFileSync } from "node:fs";

import {
  entityKinds,
  slugify,
  type EntityCollections,
  type EntityKind,
  type EntityRouteReservation,
  type NormalizedEntity,
} from "@dredmorpedia/domain";
import { z } from "zod";

const entityIdTargetSchema = z.object({
  type: z.literal("entity-id"),
  entityId: z.string().min(1),
});

const sourceIdTargetSchema = z.object({
  type: z.literal("source-id"),
  sourceId: z.string().min(1),
  originalId: z.string().min(1),
});

const routeEntrySchema = z.object({
  entityKind: z.enum(entityKinds),
  target: z.discriminatedUnion("type", [
    entityIdTargetSchema,
    sourceIdTargetSchema,
  ]),
  canonicalSlug: z.string().min(1),
  aliases: z.array(z.string().min(1)),
});

const routeRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetId: z.string().min(1),
    datasetVersion: z.string().min(1),
    entries: z.array(routeEntrySchema),
  })
  .superRefine((registry, context) => {
    const targets = new Set<string>();
    const routes = new Set<string>();
    for (const [index, entry] of registry.entries.entries()) {
      const target =
        entry.target.type === "entity-id"
          ? `${entry.entityKind}:entity:${entry.target.entityId}`
          : `${entry.entityKind}:source:${entry.target.sourceId}:${entry.target.originalId}`;
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
  });

export type RouteRegistryEntry = z.infer<typeof routeEntrySchema>;

export interface RouteRegistryDefinition {
  schemaVersion: 1;
  datasetId: string;
  datasetVersion: string;
  file: string;
  entries: RouteRegistryEntry[];
}

export type RouteRegistryIssueCode =
  | "route_registry_entity_duplicate"
  | "route_registry_scope_mismatch"
  | "route_registry_target_ambiguous"
  | "route_registry_target_missing";

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

export interface RouteRegistryResolution {
  reservations: EntityRouteReservation[];
  applications: RouteRegistryApplication[];
  issues: RouteRegistryIssue[];
}

function allEntities(collections: EntityCollections): NormalizedEntity[] {
  return [
    ...collections.items,
    ...collections.recipes,
    ...collections.skills,
    ...collections.abilities,
    ...collections.spells,
    ...collections.monsters,
    ...collections.stats,
    ...collections.templates,
  ];
}

export function parseRouteRegistry(
  json: string,
  displayPath: string,
): RouteRegistryDefinition {
  const registry = routeRegistrySchema.parse(JSON.parse(json) as unknown);
  return { ...registry, file: displayPath };
}

export function loadRouteRegistry(
  absolutePath: string,
  displayPath: string,
): RouteRegistryDefinition {
  return parseRouteRegistry(readFileSync(absolutePath, "utf8"), displayPath);
}

export function resolveRouteRegistry(
  collections: EntityCollections,
  registry: RouteRegistryDefinition,
  datasetId: string,
  datasetVersion: string,
): RouteRegistryResolution {
  if (
    registry.datasetId !== datasetId ||
    registry.datasetVersion !== datasetVersion
  ) {
    return {
      reservations: [],
      applications: [],
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
  const issues: RouteRegistryIssue[] = [];
  for (const [entryIndex, entry] of registry.entries.entries()) {
    const target = entry.target;
    const candidates = entities.filter((entity) => {
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

  if (issues.length > 0) {
    return { reservations: [], applications: [], issues };
  }
  return {
    reservations: reservations.sort((left, right) =>
      left.entityId.localeCompare(right.entityId, "en"),
    ),
    applications: applications.sort((left, right) =>
      left.entityId.localeCompare(right.entityId, "en"),
    ),
    issues: [],
  };
}
