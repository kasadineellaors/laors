/** Generate PWA icons from public/icons/icon.svg */
import fs from "node:fs";
import sharp from "sharp";

const svg = fs.readFileSync("public/icons/icon.svg");

for (const size of [192, 512]) {
  await sharp(svg).resize(size, size).png().toFile(`public/icons/icon-${size}.png`);
}

console.log("Generated public/icons/icon-192.png and icon-512.png");
