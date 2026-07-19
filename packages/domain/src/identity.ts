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
): string {
  let attempt = 0;
  let candidate = "";
  do {
    const hashInput = attempt === 0 ? entityId : `${entityId}:${attempt}`;
    candidate = `${baseSlug}-${stableSlugSuffix(hashInput)}`;
    attempt += 1;
  } while (occupied.has(candidate));
  occupied.add(candidate);
  return candidate;
}

export function allocateEntityRoutes<T extends NormalizedEntity>(
  entities: readonly T[],
): EntityRouteAllocation<T> {
  const sorted = [...entities].sort(compareEntities);
  const groups = new Map<string, T[]>();
  for (const entity of sorted) {
    const baseSlug = slugify(entity.name);
    const group = groups.get(baseSlug) ?? [];
    group.push(entity);
    groups.set(baseSlug, group);
  }

  const occupied = new Set(groups.keys());
  const assignedSlugs = new Map<string, string>();
  const slugCollisions: SlugCollisionResolution[] = [];
  for (const [baseSlug, members] of [...groups].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  )) {
    members.sort(compareEntities);
    const owner = members[0];
    if (owner) {
      assignedSlugs.set(owner.id, baseSlug);
    }
    for (const entity of members.slice(1)) {
      const assignedSlug = collisionSlug(baseSlug, entity.id, occupied);
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

  const aliasesByEntity = new Map<string, string[]>();
  const aliasConflicts: SlugAliasConflict[] = [];
  for (const [alias, claimSet] of [...aliasClaims].sort(([left], [right]) =>
    left.localeCompare(right, "en"),
  )) {
    const claimants = [...claimSet].sort((left, right) =>
      left.localeCompare(right, "en"),
    );
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
