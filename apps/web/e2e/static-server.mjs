import { createReadStream, existsSync, realpathSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = 3100;
const outputRoot = realpathSync(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../out"),
);
const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

function isWithinOutput(candidate) {
  const relative = path.relative(outputRoot, candidate);
  return (
    relative === "" ||
    (relative !== ".." &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

function fileForRequest(requestUrl) {
  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(requestUrl ?? "/", `http://${host}:${port}`).pathname,
    );
  } catch {
    return undefined;
  }
  const relative =
    pathname === "/"
      ? "index.html"
      : pathname.endsWith("/")
        ? `${pathname.slice(1)}index.html`
        : pathname.slice(1);
  const candidate = path.resolve(outputRoot, relative);
  if (!isWithinOutput(candidate)) {
    return undefined;
  }
  if (existsSync(candidate) && statSync(candidate).isFile()) {
    return candidate;
  }
  return undefined;
}

const server = createServer((request, response) => {
  const requestedFile = fileForRequest(request.url);
  const file = requestedFile ?? path.join(outputRoot, "404.html");
  const status = requestedFile ? 200 : 404;
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type":
      contentTypes.get(path.extname(file).toLocaleLowerCase("en")) ??
      "application/octet-stream",
  });
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  process.stdout.write(`Static test server: http://${host}:${port}\n`);
});

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
