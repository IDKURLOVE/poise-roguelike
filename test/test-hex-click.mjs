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

await page.evaluate(() => { window.__RG.G.klass = "melee"; window.__RG.start(); });
await page.waitForTimeout(100);

// 点第 2 张卡
const cards = page.locator("#hex-cards .hex-card");
const n = await cards.count();
if (n < 2) { console.log("FAIL only", n, "cards"); process.exit(1); }
await cards.nth(1).hover();
await page.waitForTimeout(30);
const hasSel = await cards.nth(1).evaluate((el) => el.classList.contains("sel"));
console.log(hasSel ? "OK hover selects without re-render" : "FAIL hover sel");
await cards.nth(1).click();
await page.waitForTimeout(150);
const s = await page.evaluate(() => window.__RG.stats());
const ok = s.state === "playing" && s.hexes.length === 1 && !s.overlay;
console.log(ok ? "OK click hex -> playing " + s.hexes[0] : "FAIL " + JSON.stringify(s));
console.log(errors.length ? "ERRORS " + errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(ok && hasSel && !errors.length ? 0 : 1);
