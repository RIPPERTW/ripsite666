import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const root = process.argv[2] ?? '.';
const EXTS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.jsx', '.tsx', '.vue', '.svelte']);
const IMG_RE = /\.(png|jpe?g|gif|svg|webp|avif|ico)(\?.*)?(#.*)?$/i;

const isExternal = (u) => /^(https?:)?\/\//i.test(u) || u.startsWith('data:') || u.startsWith('#');

const lowerUrl = (u) => {
  if (isExternal(u)) return null;
  if (!IMG_RE.test(u)) return null;
  const m = u.match(/^([^?#]+)([?#].*)?$/);
  const lower = m[1].toLowerCase() + (m[2] ?? '');
  return lower === u ? null : lower;
};

const ATTR_RE = /\b(src|href)\s*=\s*(["'])([^"']+)\2/gi;
const URL_RE = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
const SRCSET_RE = /\bsrcset\s*=\s*(["'])([^"']+)\1/gi;

const DATA_KEY_RE = /\b(slug|image|cover|folder)\s*:\s*(["'])([^"']+)\2/gi;

const fixContent = (src) => {
  let out = src;

  out = out.replace(ATTR_RE, (m, attr, q, val) => {
    const nv = lowerUrl(val);
    return nv ? `${attr}=${q}${nv}${q}` : m;
  });

  out = out.replace(URL_RE, (m, q, val) => {
    const nv = lowerUrl(val);
    return nv ? `url(${q}${nv}${q})` : m;
  });

  out = out.replace(SRCSET_RE, (m, q, val) => {
    let changed = false;
    const parts = val.split(',').map(part => {
      const [url, ...rest] = part.trim().split(/\s+/);
      const nv = lowerUrl(url);
      if (nv) changed = true;
      return [nv ?? url, ...rest].join(' ');
    });
    return changed ? `srcset=${q}${parts.join(', ')}${q}` : m;
  });

  out = out.replace(DATA_KEY_RE, (m, key, q, val) => {
    const lower = val.toLowerCase();
    return lower === val ? m : `${key}: ${q}${lower}${q}`;
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
