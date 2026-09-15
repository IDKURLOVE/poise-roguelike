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
const token = "t1";
await page.evaluate((t) => { window.__pageToken = t; }, token);

await page.locator("#btn-start").click();
await page.waitForTimeout(120);
let s = await page.evaluate(() => window.__RG.stats());
console.log(s.state === "hexPick" ? "OK click start -> hexPick" : "FAIL " + s.state);

await page.locator("#hex-cards .hex-card").first().click();
await page.waitForTimeout(150);
s = await page.evaluate(() => window.__RG.stats());
const tok = await page.evaluate(() => window.__pageToken);
const ok = s.state === "playing" && !s.overlay && tok === token;
console.log(ok ? "OK into room hex=" + s.hexes[0] : "FAIL " + JSON.stringify(s));
console.log(errors.length ? "ERRORS " + errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(ok && !errors.length ? 0 : 1);
