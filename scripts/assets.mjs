import { mkdir, copyFile } from 'node:fs/promises';
import sharp from 'sharp';
await mkdir('apps/web/public/maplibre', { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'])
  await copyFile('node_modules/maplibre-gl/dist/' + file, 'apps/web/public/maplibre/' + file);
for (const size of [192, 512])
  await sharp('apps/web/public/icon.svg')
    .resize(size, size)
    .png()
    .toFile(`apps/web/public/icon-${size}.png`);
