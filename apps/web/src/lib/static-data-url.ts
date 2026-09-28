/** Browser fetches need the same hosting prefix that Next applies to links. */
export function staticDataUrl(path: `/${string}`): string {
  const configuredBasePath = process.env.NEXT_PUBLIC_BASE_PATH;
  if (!configuredBasePath || configuredBasePath === "/") {
    return path;
  }
  const basePath = `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`;
  return `${basePath}${path}`;
}
