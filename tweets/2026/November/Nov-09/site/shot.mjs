/* Serve dist/ and screenshot the four 5:4 cards at 1600x1280: a 580x464 CSS clip at 1600/580 device pixels,
   the way the posted cards were shot. */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
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

const W = 580, H = 464, DPR = 1600 / 580;
const CARDS = { 'kw-fk': 'franka-fk', 'kw-mc': 'franka-mcq', 'kw-ik': 'franka-ik', 'kw-twist': 'franka-overfitting' };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 2400 }, deviceScaleFactor: DPR });
await page.goto(url);
await page.waitForSelector('#kw-twist svg');
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(1500); // charts and the cross-panel arrows settle after their own size measurement
for (const [id, name] of Object.entries(CARDS)) {
  const bb = await page.locator('#' + id).boundingBox();
  await page.screenshot({ fullPage: true, clip: { x: bb.x, y: bb.y, width: W, height: H }, path: join(OUT, `${name}.png`) });
}
console.log(`wrote ${Object.values(CARDS).map((n) => n + '.png').join(', ')} (${Math.round(W * DPR)}x${Math.round(H * DPR)})`);
await browser.close();
server.close();
