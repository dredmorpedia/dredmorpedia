import type { EntityKind, EntityProvenance, NormalizedEntity } from "./types";

export function canonicalKey(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

export function slugify(value: string): string {
  const asciiSlug = value
    .normalize("NFKD")
    .replace(/\p{Mark}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (asciiSlug.length > 0) {
    return asciiSlug;
  }

  return Array.from(value.normalize("NFC"), (character) =>
    character.codePointAt(0)?.toString(16),
  )
    .filter((part): part is string => Boolean(part))
    .join("-");
}

export function entityId(kind: EntityKind, name: string): string {
  return `${kind}:${canonicalKey(name)}`;
}

export function entityRouteSlugs(entity: NormalizedEntity): string[] {
  return [entity.slug, ...entity.slugAliases];
}

export function matchesEntityRoute(
  entity: NormalizedEntity,
  slug: string,
): boolean {
  return entity.slug === slug || entity.slugAliases.includes(slug);
}

export interface SlugCollisionResolution {
  entityId: string;
  entityName: string;
  baseSlug: string;
  assignedSlug: string;
  provenance: EntityProvenance;
}

export interface SlugAliasConflict {
  entityId: string;
  entityName: string;
  alias: string;
  conflictingEntityIds: string[];
  provenance: EntityProvenance;
}

export interface EntityRouteAllocation<T extends NormalizedEntity> {
  entities: T[];
  slugCollisions: SlugCollisionResolution[];
  aliasConflicts: SlugAliasConflict[];
}

export interface EntityRouteReservation {
  entityId: string;
  canonicalSlug: string;
  aliases: string[];
}

function stableSlugSuffix(value: string): string {
  let hash = 2_166_136_261;
  for (const character of value.normalize("NFC")) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 7);
}

function compareEntities(
  left: NormalizedEntity,
  right: NormalizedEntity,
): number {
  return (
    left.canonicalKey.localeCompare(right.canonicalKey, "en") ||
    left.id.localeCompare(right.id, "en")
  );
}

function collisionSlug(
  baseSlug: string,
  entityId: string,
  occupied: Set<string>,
  protectedSlugs: ReadonlySet<string>,
): string {
  let attempt = 0;
  let candidate = "";
  do {
    const hashInput = attempt === 0 ? entityId : `${entityId}:${attempt}`;
    candidate = `${baseSlug}-${stableSlugSuffix(hashInput)}`;
    attempt += 1;
  } while (occupied.has(candidate) || protectedSlugs.has(candidate));
  occupied.add(candidate);
  return candidate;
}

export function allocateEntityRoutes<T extends NormalizedEntity>(
  entities: readonly T[],
  reservations: readonly EntityRouteReservation[] = [],
): EntityRouteAllocation<T> {
  const sorted = [...entities].sort(compareEntities);
  const entityIds = new Set(sorted.map((entity) => entity.id));
  const activeReservations = reservations
    .filter((reservation) => entityIds.has(reservation.entityId))
    .sort((left, right) => left.entityId.localeCompare(right.entityId, "en"));
  const groups = new Map<string, T[]>();
  for (const entity of sorted) {
    const baseSlug = slugify(entity.name);
    const group = groups.get(baseSlug) ?? [];
    group.push(entity);
    groups.set(baseSlug, group);
  }

  const protectedBaseSlugs = new Set(groups.keys());
  const occupied = new Set<string>();
  const assignedSlugs = new Map<string, string>();
  const slugCollisions: SlugCollisionResolution[] = [];
  for (const reservation of activeReservations) {
    assignedSlugs.set(reservation.entityId, reservation.canonicalSlug);
    occupied.add(reservation.canonicalSlug);
    for (const alias of reservation.aliases) {
      occupied.add(alias);
    }
  }
  for (const [baseSlug, members] of [...groups].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  )) {
    members.sort(compareEntities);
    const unreserved = members.filter(
      (entity) => !assignedSlugs.has(entity.id),
    );
    const owner = occupied.has(baseSlug) ? undefined : unreserved.shift();
    if (owner !== undefined) {
      assignedSlugs.set(owner.id, baseSlug);
      occupied.add(baseSlug);
    }
    for (const entity of unreserved) {
      const assignedSlug = collisionSlug(
        baseSlug,
        entity.id,
        occupied,
        protectedBaseSlugs,
      );
      assignedSlugs.set(entity.id, assignedSlug);
      slugCollisions.push({
        entityId: entity.id,
        entityName: entity.name,
        baseSlug,
        assignedSlug,
        provenance: entity.provenance,
      });
    }
  }

  const requestedAliases = new Map(
    sorted.map((entity) => [entity.id, entity.slugAliases]),
  );
  const routed = sorted.map((entity) => ({
    ...entity,
    slug: assignedSlugs.get(entity.id) ?? slugify(entity.name),
    slugAliases: [],
  }));
  const canonicalOwners = new Map(
    routed.map((entity) => [entity.slug, entity.id]),
  );
  const registryAliasOwners = new Map<string, string>();
  const aliasesByEntity = new Map<string, string[]>();
  for (const reservation of activeReservations) {
    aliasesByEntity.set(reservation.entityId, [...reservation.aliases]);
    for (const alias of reservation.aliases) {
      registryAliasOwners.set(alias, reservation.entityId);
    }
  }
  const aliasClaims = new Map<string, Set<string>>();
  for (const entity of routed) {
    const candidates = [
      ...(requestedAliases.get(entity.id) ?? []),
      ...entity.variants.flatMap((variant) =>
        variant.originalId ? [slugify(variant.originalId)] : [],
      ),
    ];
    for (const alias of candidates) {
      if (alias.length === 0 || alias === entity.slug) {
        continue;
      }
      const claims = aliasClaims.get(alias) ?? new Set<string>();
      claims.add(entity.id);
      aliasClaims.set(alias, claims);
    }
  }

  const aliasConflicts: SlugAliasConflict[] = [];
  for (const [alias, claimSet] of [...aliasClaims].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  )) {
    const claimants = [...claimSet].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
    const registryOwner = registryAliasOwners.get(alias);
    if (registryOwner) {
      for (const entityId of claimants.filter(
        (claimant) => claimant !== registryOwner,
      )) {
        const entity = routed.find((candidate) => candidate.id === entityId);
        if (!entity) {
          continue;
        }
        aliasConflicts.push({
          entityId,
          entityName: entity.name,
          alias,
          conflictingEntityIds: [entityId, registryOwner].sort((left, right) =>
            left.localeCompare(right, "en"),
          ),
          provenance: entity.provenance,
        });
      }
      continue;
    }
    const canonicalOwner = canonicalOwners.get(alias);
    const conflicts = [
      ...new Set([...claimants, ...(canonicalOwner ? [canonicalOwner] : [])]),
    ].sort((left, right) => left.localeCompare(right, "en"));
    const claimant = claimants[0];
    if (
      claimants.length === 1 &&
      claimant &&
      (!canonicalOwner || canonicalOwner === claimant)
    ) {
      aliasesByEntity.set(claimant, [
        ...(aliasesByEntity.get(claimant) ?? []),
        alias,
      ]);
      continue;
    }
    for (const entityId of claimants) {
      const entity = routed.find((candidate) => candidate.id === entityId);
      if (!entity) {
        continue;
      }
      aliasConflicts.push({
        entityId,
        entityName: entity.name,
        alias,
        conflictingEntityIds: conflicts,
        provenance: entity.provenance,
      });
    }
  }

  return {
    entities: routed.map((entity) => ({
      ...entity,
      slugAliases: (aliasesByEntity.get(entity.id) ?? []).sort((left, right) =>
        left.localeCompare(right, "en"),
      ),
    })),
    slugCollisions,
    aliasConflicts,
  };
}
