import { setTimeout as delay } from "node:timers/promises";

const serverUrl = "http://127.0.0.1:3100";
const shutdownUrl = `${serverUrl}/__dredmorpedia-e2e-shutdown__`;

export default async function globalTeardown() {
  let response: Response;
  try {
    response = await fetch(shutdownUrl, {
      method: "POST",
      headers: { Connection: "close" },
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    // The server can already be absent after a startup or test-run failure.
    return;
  }

  if (response.status !== 204) {
    throw new Error(
      `Static test server rejected shutdown with HTTP ${response.status}.`,
    );
  }

  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    try {
      await fetch(serverUrl, {
        method: "HEAD",
        headers: { Connection: "close" },
        signal: AbortSignal.timeout(250),
      });
    } catch {
      return;
    }
    await delay(50);
  }

  throw new Error("Static test server did not stop within 3 seconds.");
}
