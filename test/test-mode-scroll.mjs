import { chromium } from "playwright-core";
import { createServer } from "http";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, "..", "index.html"));
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.__RG);
await page.evaluate(() => window.__RG.showTitle());
await page.locator("#btn-modes").click();
await page.waitForTimeout(80);
const n = await page.locator("#mode-cards [data-mode]").count();
const box = await page.evaluate(() => {
  const el = document.getElementById("mode-cards");
  return { scrollH: el.scrollHeight, clientH: el.clientHeight, canScroll: el.scrollHeight > el.clientHeight };
});
const dailyVisible = await page.locator('[data-mode="daily"]').isVisible();
// scroll to bottom and click daily
await page.locator("#mode-cards").evaluate(el => { el.scrollTop = el.scrollHeight; });
await page.waitForTimeout(50);
const dailyBox = await page.locator('[data-mode="daily"]').boundingBox();
console.log(JSON.stringify({ n, ...box, dailyVisible, dailyBox }));
const ok = n === 7 && box.canScroll && dailyBox && dailyBox.y < 760;
console.log(ok ? "OK scrollable mode list 7 modes daily reachable" : "FAIL");
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
