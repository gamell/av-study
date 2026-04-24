import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const publicIcons = join(process.cwd(), "public/icons");

async function render(svgName: string, size: number, outName: string) {
  const svg = readFileSync(join(publicIcons, svgName));
  await sharp(svg).resize(size, size).png().toFile(join(publicIcons, outName));
  console.log(`wrote ${outName} (${size}x${size})`);
}

await render("icon.svg", 192, "icon-192.png");
await render("icon.svg", 512, "icon-512.png");
await render("icon.svg", 180, "apple-touch-icon.png");
await render("icon-maskable.svg", 512, "icon-maskable-512.png");
