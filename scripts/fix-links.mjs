import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const root = process.argv[2] ?? '.';
const EXTS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.jsx', '.tsx', '.vue', '.svelte']);
const IMG_RE = /\.(png|jpe?g|gif|svg|webp|avif|ico)(\?.*)?(#.*)?$/i;

const toLowerPath = (url) => {
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('#')) return null;
  if (!IMG_RE.test(url)) return null;
  const m = url.match(/^([^?#]+)([?#].*)?$/);
  return m[1].toLowerCase() + (m[2] ?? '');
};

const fixContent = (src) => {
  let out = src;

  out = out.replace(/\b(src|href)\s*=\s*(["'])([^"']+)\2/gi, (m, attr, q, val) => {
    const nv = toLowerPath(val);
    return nv ? `${attr}=${q}${nv}${q}` : m;
  });

  out = out.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (m, q, val) => {
    const nv = toLowerPath(val);
    return nv ? `url(${q}${nv}${q})` : m;
  });

  out = out.replace(/\bsrcset\s*=\s*(["'])([^"']+)\1/gi, (m, q, val) => {
    const parts = val.split(',').map(part => {
      const [url, ...rest] = part.trim().split(/\s+/);
      const nv = toLowerPath(url);
      return [nv ?? url, ...rest].join(' ');
    });
    return `srcset=${q}${parts.join(', ')}${q}`;
  });

  return out;
};

const walk = async (dir) => {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dist') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { await walk(p); continue; }
    if (!EXTS.has(extname(e.name).toLowerCase())) continue;
    const src = await readFile(p, 'utf8');
    const fixed = fixContent(src);
    if (fixed !== src) {
      await writeFile(p, fixed, 'utf8');
      console.log('fixed:', p);
    }
  }
};

await walk(root);
