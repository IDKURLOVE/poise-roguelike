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
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.__RG);

await page.evaluate(() => { window.__RG.G.klass="melee"; window.__RG.start(); });
await page.waitForTimeout(80);
await page.locator("#hex-cards .hex-card").first().click();
await page.waitForTimeout(100);
await page.evaluate(() => window.__RG.killSelf("测试", "按钮重开"));
await page.waitForTimeout(500);
const btn = page.locator('[data-act="restart"]');
const n = await btn.count();
console.log(n ? "OK death has restart button" : "FAIL no restart button");
await btn.click();
await page.waitForTimeout(150);
const s = await page.evaluate(() => window.__RG.stats());
const ok = s.state === "hexPick" || s.state === "playing";
console.log(ok ? "OK click restart -> " + s.state : "FAIL " + s.state);
// title button
await page.evaluate(() => {
  if (window.__RG.stats().state === "hexPick") window.__RG.skipLevelHex();
});
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.killSelf("t","t"));
await page.waitForTimeout(500);
await page.locator('[data-act="title"]').click();
await page.waitForTimeout(120);
const t = await page.evaluate(() => window.__RG.stats().state);
console.log(t === "title" ? "OK title button" : "FAIL title " + t);
console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(ok && t==="title" && !errors.length ? 0 : 1);
