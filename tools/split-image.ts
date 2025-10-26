import sharp from "sharp";
import fs from "fs";
import path from "path";

export async function splitImage(
  inputPath: string,
  rows: number,
  cols: number,
  outputDir: string = "./output"
) {
  const metadata = await sharp(inputPath).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error("画像の幅または高さを取得できませんでした。");
  }

  const { width, height } = metadata;
  const tileWidth = Math.floor(width / cols);
  const tileHeight = Math.floor(height / rows);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let count = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const left = col * tileWidth;
      const top = row * tileHeight;

      const w = col === cols - 1 ? width - left : tileWidth;
      const h = row === rows - 1 ? height - top : tileHeight;

      const outputPath = path.join(outputDir, `aspect_${row * cols + col}.png`);

      await sharp(inputPath)
        .extract({ left, top, width: w, height: h })
        .toFile(outputPath);

      console.log(`Saved: ${outputPath}`);
      count++;
    }
  }

  console.log(`✅ ${count} 枚の画像を ${outputDir} に出力しました。`);
}

splitImage("./tools/T4aspects.png", 5, 16).catch(console.error);
