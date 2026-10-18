import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname, dirname, basename, resolve } from 'node:path';

const root = process.argv[2] ?? '.';
const EXTS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.jsx', '.tsx', '.vue', '.svelte']);
const IMG_EXT = '(?:png|jpe?g|gif|svg|webp|avif|ico)';
const IMG_RE = new RegExp(`\\.${IMG_EXT}([?#]|$)`, 'i');

const isExternal = (u) =>
  /^(https?:)?\/\//i.test(u) ||
  u.startsWith('data:') ||
  u.startsWith('#') ||
  u.startsWith('mailto:') ||
  u.startsWith('tel:');

const fileCache = new Map();

async function listDir(dir) {
  if (fileCache.has(dir)) return fileCache.get(dir);
  let entries = [];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    fileCache.set(dir, entries);
    return entries;
  }
  fileCache.set(dir, entries);
  return entries;
}

async function findRealName(baseDir, urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const segs = decoded.split('/').filter(Boolean);
  let cur = baseDir;
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i];
    const entries = await listDir(cur);
    let match = entries.find(e => e.name === seg);
    if (!match) {
      const lower = seg.toLowerCase();
      match = entries.find(e => e.name.toLowerCase() === lower);
      if (!match) return null;
    }
    cur = join(cur, match.name);
  }
  return cur;
}

async function resolveUrl(fromFile, url) {
  const m = url.match(/^([^?#]+)([?#].*)?$/);
  const pathPart = m[1];
  const tail = m[2] ?? '';
  const isRoot = pathPart.startsWith('/');
  const base = isRoot ? root : dirname(fromFile);
  const rel = isRoot ? pathPart.replace(/^\//, '') : pathPart;
  const real = await findRealName(base, rel);
  if (!real) return null;
  let relOut = real.slice(base.length).replace(/\\/g, '/');
  if (relOut.startsWith('/')) relOut = relOut.slice(1);
  return (isRoot ? '/' : '') + relOut + tail;
}

const ATTR_RE = /\b(src|href|data-src|data-bg|data-image|poster|content|xlink:href|background)\s*=\s*(["'])([^"']+)\2/gi;
const URL_RE = /url\(\s*(["']?)([^"')]+)\1\s*\)/gi;
const SRCSET_RE = /\bsrcset\s*=\s*(["'])([^"']+)\1/gi;
const DATA_KEY_RE = /\b(slug|image|cover)\s*:\s*(["'])([^"']+)\2/gi;

async function fixContent(file, src) {
  let out = src;

  const tasks = [];

  out = out.replace(ATTR_RE, (m, attr, q, val) => {
    if (isExternal(val) || !IMG_RE.test(val) || val.includes('${') || val.includes('%')) return m;
    const idx = `__FIX_${tasks.length}__`;
    tasks.push(resolveUrl(file, val).then(r => [m, r ? `${attr}=${q}${r}${q}` : m]));
    return idx;
  });

  out = out.replace(URL_RE, (m, q, val) => {
    if (isExternal(val) || !IMG_RE.test(val) || val.includes('${') || val.includes('%')) return m;
    const idx = `__FIX_${tasks.length}__`;
    tasks.push(resolveUrl(file, val).then(r => [m, r ? `url(${q}${r}${q})` : m]));
    return idx;
  });

  out = out.replace(SRCSET_RE, (m, q, val) => {
    if (val.includes('${') || val.includes('%')) return m;
    const parts = val.split(',').map(p => p.trim());
    const promises = parts.map(async part => {
      const [url, ...rest] = part.split(/\s+/);
      if (isExternal(url) || !IMG_RE.test(url)) return part;
      const r = await resolveUrl(file, url);
      return [r ?? url, ...rest].join(' ');
    });
    const idx = `__FIX_${tasks.length}__`;
    tasks.push(Promise.all(promises).then(parts2 => [m, `srcset=${q}${parts2.join(', ')}${q}`]));
    return idx;
  });

  await Promise.all(tasks.map(t => t));

  const replaced = await Promise.all(tasks);

  for (const [orig, fixed] of replaced) {
    out = out.replace(orig, fixed);
  }

  return out;
}

async function fixHtmlFile(file) {
  const src = await readFile(file, 'utf8');
  const fixed = await fixContent(file, src);
  if (fixed !== src) {
    await writeFile(file, fixed, 'utf8');
    console.log('fixed:', file);
  }
}

async function fixJsDataFile(file) {
  let src = await readFile(file, 'utf8');
  const dir = dirname(file);
  let out = src;
  const re = /\b(slug|image|cover)\s*:\s*(["'])([^"']+)\2/gi;
  const tasks = [];
  out = out.replace(re, (m, key, q, val) => {
    if (val.includes('/') || val.includes('\\') || val.includes('${') || val.includes('%')) return m;
    if (!IMG_RE.test(val)) return m;
    const idx = `__FIX_${tasks.length}__`;
    tasks.push(resolveUrl(file, val).then(r => {
      if (!r) return [m, m];
      const base = basename(r).replace(/[?#].*$/, '');
      return [m, `${key}: ${q}${base}${q}`];
    }));
    return idx;
  });
  if (tasks.length === 0) return;
  const replaced = await Promise.all(tasks);
  for (const [orig, fixed] of replaced) out = out.replace(orig, fixed);
  if (out !== src) {
    await writeFile(file, out, 'utf8');
    console.log('fixed data:', file);
  }
}

async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === 'dist') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) { await walk(p); continue; }
    const ext = extname(e.name).toLowerCase();
    if (!EXTS.has(ext)) continue;
    if (ext === '.js' || ext === '.mjs') {
      await fixJsDataFile(p);
    }
    await fixHtmlFile(p);
  }
}

await walk(root);
