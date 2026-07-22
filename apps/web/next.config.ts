import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

function normalizedBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "";
  }
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

const basePath = normalizedBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

export default function nextConfig(phase: string): NextConfig {
  return {
    output: phase === PHASE_DEVELOPMENT_SERVER ? undefined : "export",
    trailingSlash: true,
    basePath,
    images: { unoptimized: true },
    transpilePackages: ["@dredmorpedia/domain"],
  };
}
