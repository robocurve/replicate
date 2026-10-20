/* Bundle entry.jsx and the site stylesheet into dist/ (same esbuild settings as
   the website's build.mjs: iife, automatic JSX, root-absolute /assets left external). */
import esbuild from 'esbuild';
import { mkdir, writeFile, cp, rm } from 'node:fs/promises';

const DIST = 'dist';
await rm(DIST, { recursive: true, force: true });
await mkdir(`${DIST}/assets`, { recursive: true });
await esbuild.build({
  entryPoints: { app: 'entry.jsx', site: 'src/styles.css' },
  bundle: true, minify: false, format: 'iife', outdir: `${DIST}/assets`,
  jsx: 'automatic', external: ['/assets/*'], loader: { '.svg': 'text' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
});
await cp('assets/fonts', `${DIST}/assets/fonts`, { recursive: true });
await cp('assets/logo', `${DIST}/assets/logo`, { recursive: true });
await writeFile(`${DIST}/index.html`, '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dream-1 time card</title><link rel="stylesheet" href="/assets/site.css"></head><body><div id="root"></div><script src="/assets/app.js"></script></body></html>\n');
console.log('built dist/');
