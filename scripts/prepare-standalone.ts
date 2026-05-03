import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next/standalone");

function copyRuntimePath(from: string, to: string) {
  const source = join(root, from);
  if (!existsSync(source)) {
    throw new Error(`Missing runtime path: ${from}. Run bun run build first.`);
  }

  const destination = join(standalone, to);
  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
  console.log(`copied ${from} -> .next/standalone/${to}`);
}

if (!existsSync(standalone)) {
  throw new Error("Missing .next/standalone. Run bun run build first.");
}

copyRuntimePath("public", "public");
copyRuntimePath(".next/static", ".next/static");
copyRuntimePath("drizzle", "drizzle");
copyRuntimePath("src/data", "src/data");
