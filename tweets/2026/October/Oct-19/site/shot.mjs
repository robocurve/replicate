/* Serve dist/ and screenshot the card at 1200x1500: a 420x525 CSS clip at
   1200/420 device pixels, the way the posted cards were shot. Also dumps the
   chart's screen-reader table (the exact values plotted) to ../data/chart-values.json. */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, 'dist');
const OUT = join(HERE, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  try {
    const body = await readFile(join(DIST, p));
    res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const W = 420, H = 525, DPR = 1200 / 420;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1800 }, deviceScaleFactor: DPR });
await page.goto(url);
await page.waitForSelector('#d1-time-log svg');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1200);
const bb = await page.locator('#d1-time-log').boundingBox();
const clip = { x: bb.x, y: bb.y, width: W, height: H };
await page.screenshot({ clip, path: join(OUT, 'dream-1.png') });
await page.screenshot({ clip, path: join(OUT, 'dream-1.jpeg'), type: 'jpeg', quality: 95 });
const rows = await page.$$eval('#d1-time-log .rc-sr-only table tbody tr', (trs) => trs.map((tr) => [...tr.children].map((td) => td.textContent)));
const aria = await page.$eval('#d1-time-log svg', (s) => s.getAttribute('aria-label'));
await writeFile(join(OUT, 'data', 'chart-values.json'), JSON.stringify({ columns: ['model', 'mean_score', 'minutes_per_attempt', 'pareto_frontier'], rows, aria_label: aria }, null, 1) + '\n');
console.log(`wrote dream-1.png and dream-1.jpeg (${Math.round(W * DPR)}x${Math.round(H * DPR)}) and data/chart-values.json`);
await browser.close();
server.close();
