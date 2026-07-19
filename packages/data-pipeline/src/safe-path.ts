import { existsSync, realpathSync } from "node:fs";
import path from "node:path";

export class PathBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PathBoundaryError";
  }
}

export function isPathWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

export function assertSafeRelativePath(value: string): void {
  const segments = value.replaceAll("\\", "/").split("/");
  if (
    value.length === 0 ||
    path.isAbsolute(value) ||
    segments.some((segment) => segment === "..")
  ) {
    throw new PathBoundaryError(`Unsafe relative path: ${value}`);
  }
}

export function resolveWithin(root: string, relativePath: string): string {
  assertSafeRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(resolvedRoot, relativePath);

  if (!isPathWithin(resolvedRoot, target)) {
    throw new PathBoundaryError(`Path escapes allowed root: ${relativePath}`);
  }

  return target;
}

export function resolveExistingWithin(
  root: string,
  relativePath: string,
): string {
  const rootRealPath = realpathSync(root);
  const candidate = resolveWithin(rootRealPath, relativePath);

  if (!existsSync(candidate)) {
    return candidate;
  }

  const targetRealPath = realpathSync(candidate);
  if (!isPathWithin(rootRealPath, targetRealPath)) {
    throw new PathBoundaryError(
      `Resolved path escapes allowed root: ${relativePath}`,
    );
  }

  return targetRealPath;
}

export function toPosixPath(value: string): string {
  return value.replaceAll(path.sep, "/");
}
