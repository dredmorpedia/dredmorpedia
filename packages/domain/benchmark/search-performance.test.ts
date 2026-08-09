import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import {
  querySearchDocuments,
  suggestSearchDocuments,
  type SearchArtifact,
  type SearchQuery,
} from "../src/index";

const searchArtifactPath = fileURLToPath(
  new URL(
    "../../../data/generated/official-local/search.json",
    import.meta.url,
  ),
);
const serializedSearch = readFileSync(searchArtifactPath, "utf8");
const searchArtifact = JSON.parse(serializedSearch) as SearchArtifact;

const budgets = {
  rawBytes: 1_500_000,
  gzipBytes: 225_000,
  brotliBytes: 175_000,
  parseP95Milliseconds: 20,
  queryP95Milliseconds: 16,
  suggestionP95Milliseconds: 50,
} as const;

function percentile(values: readonly number[], fraction: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  ]!;
}

function measure(
  operation: () => unknown,
  options: { runs: number; warmups: number },
) {
  for (let index = 0; index < options.warmups; index += 1) {
    operation();
  }

  const durations: number[] = [];
  for (let index = 0; index < options.runs; index += 1) {
    const startedAt = performance.now();
    operation();
    durations.push(performance.now() - startedAt);
  }

  return {
    runs: durations.length,
    meanMilliseconds:
      durations.reduce((total, duration) => total + duration, 0) /
      durations.length,
    p50Milliseconds: percentile(durations, 0.5),
    p95Milliseconds: percentile(durations, 0.95),
    maximumMilliseconds: Math.max(...durations),
  };
}

function report(label: string, measurement: unknown): void {
  process.stdout.write(
    `SEARCH_BENCHMARK ${JSON.stringify({ label, measurement })}\n`,
  );
}

function measureQuery(query: SearchQuery) {
  return measure(() => querySearchDocuments(searchArtifact.documents, query), {
    runs: 500,
    warmups: 50,
  });
}

describe("canonical official search acceptance budgets", () => {
  it("keeps the separately generated search payload within transfer and parse budgets", () => {
    const bytes = Buffer.byteLength(serializedSearch);
    const gzipBytes = gzipSync(serializedSearch, { level: 9 }).byteLength;
    const brotliBytes = brotliCompressSync(serializedSearch, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    }).byteLength;
    const parse = measure(() => JSON.parse(serializedSearch), {
      runs: 100,
      warmups: 20,
    });

    report("artifact", {
      documents: searchArtifact.documents.length,
      bytes,
      gzipBytes,
      brotliBytes,
      parse,
    });

    expect(bytes).toBeLessThanOrEqual(budgets.rawBytes);
    expect(gzipBytes).toBeLessThanOrEqual(budgets.gzipBytes);
    expect(brotliBytes).toBeLessThanOrEqual(budgets.brotliBytes);
    expect(parse.p95Milliseconds).toBeLessThanOrEqual(
      budgets.parseP95Milliseconds,
    );
  });

  it("keeps ordinary exact, prefix, multi-token, and filtered queries within one frame", () => {
    const queries: Record<string, SearchQuery> = {
      exact: { query: "Clockwork Piezoblade" },
      prefix: { query: "Clockwork" },
      multiToken: { query: "blade clockwork" },
      filtered: { query: "clockwork", kinds: ["item"], category: "weapon" },
    };

    for (const [label, query] of Object.entries(queries)) {
      const measurement = measureQuery(query);
      report(`query:${label}`, measurement);
      expect(measurement.p95Milliseconds).toBeLessThanOrEqual(
        budgets.queryP95Milliseconds,
      );
    }
  });

  it("keeps the deliberately slower zero-result spelling path responsive", () => {
    const suggestion = measure(
      () =>
        suggestSearchDocuments(searchArtifact.documents, {
          query: "clokwork piezoblade",
          kinds: ["item"],
        }),
      { runs: 100, warmups: 10 },
    );

    report("suggestion", suggestion);
    expect(suggestion.p95Milliseconds).toBeLessThanOrEqual(
      budgets.suggestionP95Milliseconds,
    );
  });

  it("proves the accepted relevance examples against the canonical dataset", () => {
    expect(
      querySearchDocuments(searchArtifact.documents, {
        query: "Clockwork Piezoblade",
      })[0]?.document.name,
    ).toBe("Clockwork Piezoblade");
    expect(
      querySearchDocuments(searchArtifact.documents, {
        query: "blade clockwork",
        kinds: ["item"],
      })[0]?.document.name,
    ).toBe("Clockwork Piezoblade");
    expect(
      suggestSearchDocuments(searchArtifact.documents, {
        query: "clokwork piezoblade",
        kinds: ["item"],
      })[0]?.document.name,
    ).toBe("Clockwork Piezoblade");
    expect(
      suggestSearchDocuments(searchArtifact.documents, {
        query: "clokwork piezoblade",
        kinds: ["spell"],
      }),
    ).toEqual([]);
  });
});
