/**
 * Gera os ícones PNG do PWA a partir de um SVG.
 * Usa Node puro + @resvg/resvg-js (ou cai pra SVG-only no manifest se faltar).
 *
 * Uso:  node scripts/generate-icons.mjs
 *
 * Saída:
 *   public/icons/icon-192.png
 *   public/icons/icon-512.png
 *   public/icons/maskable/icon-maskable-512.png
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'favicon.svg');

const out = path.join(root, 'public', 'icons');
await fs.mkdir(path.join(out, 'maskable'), { recursive: true });

const svg = await fs.readFile(svgPath, 'utf8');

async function tryResvg() {
  try {
    const { Resvg } = await import('@resvg/resvg-js');
    return new Resvg(svg);
  } catch {
    return null;
  }
}

const resvg = await tryResvg();
if (!resvg) {
  console.warn(
    '\n  Aviso: instale @resvg/resvg-js (`npm i -D @resvg/resvg-js`) para gerar PNGs.',
  );
  console.warn(
    '  Por enquanto, o app usa apenas favicon.svg como ícone (suportado por Chrome/Edge/Android).\n',
  );
  process.exit(0);
}

async function renderToFile(size, filePath) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'transparent',
  });
  const png = r.render().asPng();
  await fs.writeFile(filePath, png);
  console.log('  ✓', path.relative(root, filePath));
}

// "any" (sem área segura)
await renderToFile(192, path.join(out, 'icon-192.png'));
await renderToFile(512, path.join(out, 'icon-512.png'));

// Maskable: precisa de padding ≥ 10% (Android adaptive icon).
// Truques: desenhamos o mesmo svg centralizado num canvas maior com fundo.
async function renderMaskable() {
  const { Resvg } = await import('@resvg/resvg-js');
  const padded = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="512" height="512">
      <rect width="64" height="64" fill="#0f766e"/>
      <g transform="translate(9.6,9.6) scale(0.7)">
        <path d="M16 24h32M16 32h32M16 40h22" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
        <circle cx="48" cy="40" r="5" fill="#f59e0b"/>
      </g>
    </svg>
  `;
  const r = new Resvg(padded, {
    fitTo: { mode: 'width', value: 512 },
  });
  const png = r.render().asPng();
  const filePath = path.join(out, 'maskable', 'icon-maskable-512.png');
  await fs.writeFile(filePath, png);
  console.log('  ✓', path.relative(root, filePath));
}
await renderMaskable();

console.log('\n  Ícones PNG gerados em public/icons/. Atualize vite.config.ts para apontar para os PNGs:\n');
console.log('    icons: [');
console.log("      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },");
console.log("      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },");
console.log("      { src: 'icons/maskable/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },");
console.log('    ],\n');
