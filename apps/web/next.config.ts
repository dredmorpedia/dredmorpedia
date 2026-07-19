import type { NextConfig } from "next";

function normalizedBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "";
  }
  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

const basePath = normalizedBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  transpilePackages: ["@dredmorpedia/domain"],
};

export default nextConfig;
