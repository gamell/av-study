import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  output: "standalone",
  // bun:sqlite is a Bun built-in module; Next 16 marks bun:* imports as
  // webpack externals automatically, so no entry needed here. The previous
  // `better-sqlite3` external was dropped along with that dependency.
};

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
