import { spawn } from "node:child_process";
import { once } from "node:events";
import os from "node:os";

import { chromium, devices } from "@playwright/test";

const baseUrl = "http://127.0.0.1:3100";
const shutdownUrl = `${baseUrl}/__dredmorpedia-e2e-shutdown__`;
const profiles = [
  {
    name: "desktop-chromium",
    context: devices["Desktop Chrome"],
    cpuSlowdown: 1,
    budgets: {
      navigationToFirstResultP95Milliseconds: 1_500,
      exactInteractionP95Milliseconds: 100,
      suggestionInteractionP95Milliseconds: 150,
    },
  },
  {
    name: "mobile-chromium-4x-cpu",
    context: devices["Pixel 7"],
    cpuSlowdown: 4,
    budgets: {
      navigationToFirstResultP95Milliseconds: 3_000,
      exactInteractionP95Milliseconds: 200,
      suggestionInteractionP95Milliseconds: 300,
    },
  },
];

function percentile(values, fraction) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  ];
}

function summarize(values) {
  return {
    runs: values.length,
    meanMilliseconds:
      values.reduce((total, duration) => total + duration, 0) / values.length,
    p50Milliseconds: percentile(values, 0.5),
    p95Milliseconds: percentile(values, 0.95),
    maximumMilliseconds: Math.max(...values),
  };
}

function assertBudget(label, actual, budget) {
  if (actual > budget) {
    throw new Error(
      `${label} measured ${actual.toFixed(2)} ms, exceeding ${budget} ms.`,
    );
  }
}

async function waitForServer(server) {
  const started = new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Static benchmark server did not start.")),
      10_000,
    );
    server.stdout.setEncoding("utf8");
    server.stdout.on("data", (chunk) => {
      if (chunk.includes("Static test server:")) {
        clearTimeout(timeout);
        resolve();
      }
    });
    server.once("error", reject);
    server.once("exit", (code) => {
      if (code !== null && code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Static benchmark server exited with code ${code}.`));
      }
    });
  });
  await started;
}

async function stopServer(server) {
  try {
    await fetch(shutdownUrl, {
      method: "POST",
      headers: { Connection: "close" },
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    server.kill();
  }
  if (server.exitCode === null) {
    await Promise.race([
      once(server, "exit"),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
  }
  if (server.exitCode === null) {
    server.kill();
  }
}

async function waitForExactResult(page) {
  await page
    .getByRole("link", { name: "Clockwork Piezoblade", exact: true })
    .first()
    .waitFor({ state: "visible" });
}

async function measureInteraction(page, query, resultKind) {
  const searchbox = page.getByRole("searchbox", { name: "Search terms" });
  await searchbox.waitFor({ state: "visible" });
  const pendingMeasurement = page.evaluate(
    ({ expectedQuery, expectedResultKind }) =>
      new Promise((resolve, reject) => {
        const input = document.querySelector("#global-search");
        const root = document.querySelector(
          '[aria-labelledby="search-heading"]',
        );
        if (!(input instanceof HTMLInputElement) || !root) {
          reject(new Error("Search UI is unavailable."));
          return;
        }
        const matches = () =>
          expectedResultKind === "exact"
            ? [...document.querySelectorAll("a")].some(
                (link) => link.textContent?.trim() === "Clockwork Piezoblade",
              )
            : [...document.querySelectorAll("button")].some((button) =>
                button.textContent?.includes("Clockwork Piezoblade"),
              );
        const startedAt = performance.now();
        const timeout = window.setTimeout(() => {
          observer.disconnect();
          reject(new Error(`Search did not render ${expectedQuery}.`));
        }, 2_000);
        const observer = new MutationObserver(() => {
          if (input.value === expectedQuery && matches()) {
            window.clearTimeout(timeout);
            observer.disconnect();
            resolve(performance.now() - startedAt);
          }
        });
        observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }),
    { expectedQuery: query, expectedResultKind: resultKind },
  );
  await searchbox.fill(query);
  return pendingMeasurement;
}

async function measureProfile(browser, profile) {
  const navigationToFirstResult = [];
  const exactInteraction = [];
  const suggestionInteraction = [];

  for (let run = 0; run < 12; run += 1) {
    const context = await browser.newContext(profile.context);
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", {
      rate: profile.cpuSlowdown,
    });

    const navigationStartedAt = performance.now();
    await page.goto(`${baseUrl}/search/?q=benchmark-no-match`, {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("searchbox", { name: "Search terms" })
      .fill("Clockwork Piezoblade");
    await waitForExactResult(page);
    const navigationDuration = performance.now() - navigationStartedAt;

    await page.goto(`${baseUrl}/search/?q=benchmark-no-match`, {
      waitUntil: "domcontentloaded",
    });
    const exactDuration = await measureInteraction(
      page,
      "Clockwork Piezoblade",
      "exact",
    );

    await page.goto(`${baseUrl}/search/?kind=item&q=benchmark-no-match`, {
      waitUntil: "domcontentloaded",
    });
    const suggestionDuration = await measureInteraction(
      page,
      "clokwork piezoblade",
      "suggestion",
    );

    if (run >= 2) {
      navigationToFirstResult.push(navigationDuration);
      exactInteraction.push(exactDuration);
      suggestionInteraction.push(suggestionDuration);
    }
    await context.close();
  }

  const measurement = {
    profile: profile.name,
    cpuSlowdown: profile.cpuSlowdown,
    navigationToFirstResult: summarize(navigationToFirstResult),
    exactInteraction: summarize(exactInteraction),
    suggestionInteraction: summarize(suggestionInteraction),
  };
  process.stdout.write(
    `SEARCH_BROWSER_BENCHMARK ${JSON.stringify(measurement)}\n`,
  );

  assertBudget(
    `${profile.name} navigation-to-first-result p95`,
    measurement.navigationToFirstResult.p95Milliseconds,
    profile.budgets.navigationToFirstResultP95Milliseconds,
  );
  assertBudget(
    `${profile.name} exact interaction p95`,
    measurement.exactInteraction.p95Milliseconds,
    profile.budgets.exactInteractionP95Milliseconds,
  );
  assertBudget(
    `${profile.name} suggestion interaction p95`,
    measurement.suggestionInteraction.p95Milliseconds,
    profile.budgets.suggestionInteractionP95Milliseconds,
  );
}

const server = spawn(process.execPath, ["e2e/static-server.mjs"], {
  cwd: new URL("..", import.meta.url),
  stdio: ["ignore", "pipe", "inherit"],
});
let browser;
try {
  await waitForServer(server);
  browser = await chromium.launch({ headless: true });
  process.stdout.write(
    `SEARCH_BROWSER_ENVIRONMENT ${JSON.stringify({
      node: process.version,
      platform: process.platform,
      architecture: process.arch,
      cpu: os.cpus()[0]?.model ?? "unknown",
      chromium: browser.version(),
    })}\n`,
  );
  for (const profile of profiles) {
    await measureProfile(browser, profile);
  }
} finally {
  await browser?.close();
  await stopServer(server);
}
