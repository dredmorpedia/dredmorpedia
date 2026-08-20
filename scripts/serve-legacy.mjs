import { createReadStream } from "node:fs";
import { readFile, realpath, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const defaultPort = 3002;
const port = Number.parseInt(
  process.env.DREDMORPEDIA_LEGACY_PORT ?? `${defaultPort}`,
  10,
);
const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const legacyRoot = await realpath(path.join(repositoryRoot, "legacy"));
const officialManifestPath = path.join(
  repositoryRoot,
  "data",
  "raw",
  "local-official-manifest.json",
);

if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
  console.error(
    "Cannot start the legacy site: DREDMORPEDIA_LEGACY_PORT must be an integer from 1024 through 65535.",
  );
  process.exit(1);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".xml", "application/xml; charset=utf-8"],
]);

function isInsideRoot(root, candidatePath) {
  return (
    candidatePath === root || candidatePath.startsWith(`${root}${path.sep}`)
  );
}

async function resolveContainedFile(
  root,
  relativePath,
  directoryIndex = false,
) {
  let candidatePath = path.resolve(root, relativePath);

  if (!isInsideRoot(root, candidatePath)) {
    return undefined;
  }

  try {
    const candidateStats = await stat(candidatePath);
    if (candidateStats.isDirectory()) {
      if (!directoryIndex) {
        return undefined;
      }
      candidatePath = path.join(candidatePath, "index.html");
    }

    const resolvedPath = await realpath(candidatePath);
    if (!isInsideRoot(root, resolvedPath)) {
      return undefined;
    }

    const resolvedStats = await stat(resolvedPath);
    return resolvedStats.isFile()
      ? { filePath: resolvedPath, size: resolvedStats.size }
      : undefined;
  } catch {
    return undefined;
  }
}

async function loadOfficialOverlays() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(officialManifestPath, "utf8"));
  } catch {
    throw new Error(
      "Cannot start the populated legacy site: configure data/raw/local-official-manifest.json first.",
    );
  }

  if (manifest.schemaVersion !== 2 || !Array.isArray(manifest.sources)) {
    throw new Error(
      "Cannot start the populated legacy site: migrate the local official manifest to schema 2 first.",
    );
  }

  const definitions = [
    { prefix: "data", sourceId: "official-base" },
    { prefix: "expansion", sourceId: "official-expansion-1" },
    { prefix: "expansion2", sourceId: "official-expansion-2" },
    { prefix: "expansion3", sourceId: "official-expansion-3" },
  ];
  const overlays = [];

  for (const definition of definitions) {
    const source = manifest.sources.find(
      (candidate) => candidate?.id === definition.sourceId,
    );
    if (
      !source ||
      typeof source.root !== "string" ||
      !path.isAbsolute(source.root)
    ) {
      throw new Error(
        `Cannot start the populated legacy site: source ${definition.sourceId} is missing a valid local root.`,
      );
    }

    let root;
    try {
      root = await realpath(source.root);
      const rootStats = await stat(root);
      if (!rootStats.isDirectory()) {
        throw new Error();
      }
    } catch {
      throw new Error(
        `Cannot start the populated legacy site: source ${definition.sourceId} is unavailable.`,
      );
    }

    if (!Array.isArray(source.files)) {
      throw new Error(
        `Cannot start the populated legacy site: source ${definition.sourceId} has no declared database files.`,
      );
    }

    const declaredPaths = source.files.map((file) => file?.path);
    if (!declaredPaths.includes("game/itemDB.xml")) {
      throw new Error(
        `Cannot start the populated legacy site: source ${definition.sourceId} does not declare game/itemDB.xml.`,
      );
    }

    for (const declaredPath of declaredPaths) {
      if (
        typeof declaredPath !== "string" ||
        !(await resolveContainedFile(root, declaredPath))
      ) {
        throw new Error(
          `Cannot start the populated legacy site: a declared database for source ${definition.sourceId} is unavailable.`,
        );
      }
    }

    overlays.push({ prefix: definition.prefix, root });
  }

  return overlays;
}

let officialOverlays;
try {
  officialOverlays = await loadOfficialOverlays();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function resolveRequestFile(requestUrl) {
  const url = new URL(requestUrl ?? "/", `http://${host}:${port}`);
  const decodedPath = decodeURIComponent(url.pathname);
  const relativePath = decodedPath.replace(/^[/\\]+/, "");
  const legacyFile = await resolveContainedFile(legacyRoot, relativePath, true);
  if (legacyFile) {
    return legacyFile;
  }

  const portablePath = relativePath.replaceAll("\\", "/");
  for (const overlay of officialOverlays) {
    const prefix = `${overlay.prefix}/`;
    if (!portablePath.startsWith(prefix)) {
      continue;
    }

    return resolveContainedFile(
      overlay.root,
      portablePath.slice(prefix.length),
    );
  }

  return undefined;
}

function sendFile(response, requestMethod, file) {
  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": file.size,
    "Content-Type":
      contentTypes.get(path.extname(file.filePath).toLowerCase()) ??
      "application/octet-stream",
  });

  if (requestMethod === "HEAD") {
    response.end();
    return;
  }

  const stream = createReadStream(file.filePath);
  stream.on("error", () => response.destroy());
  stream.pipe(response);
}

async function sendNotFound(response, requestMethod) {
  try {
    const fallbackPath = path.join(legacyRoot, "404.html");
    const fallbackStats = await stat(fallbackPath);
    response.writeHead(404, {
      "Cache-Control": "no-store",
      "Content-Length": fallbackStats.size,
      "Content-Type": "text/html; charset=utf-8",
    });

    if (requestMethod === "HEAD") {
      response.end();
      return;
    }

    createReadStream(fallbackPath).pipe(response);
  } catch {
    response.writeHead(404, {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Not found\n");
  }
}

const server = createServer(async (request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, {
      Allow: "GET, HEAD",
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("Method not allowed\n");
    return;
  }

  try {
    const file = await resolveRequestFile(request.url);
    if (file) {
      sendFile(response, request.method, file);
      return;
    }
  } catch {
    // Invalid, missing, and unreadable paths all receive the same safe response.
  }

  await sendNotFound(response, request.method);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Cannot start the legacy site: port ${port} is already in use.`,
    );
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`Legacy Dredmorpedia: http://localhost:${port}/`);
  console.log("Press Ctrl+C to stop it.");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
