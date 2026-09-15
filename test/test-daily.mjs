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
const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.__RG);

let fail = 0;
const ok = (m)=>console.log("OK", m);
const bad = (m)=>{console.log("FAIL", m); fail++;};

await page.evaluate(() => {
  localStorage.removeItem("breakgulf.save");
  window.__RG.showTitle();
});
await page.waitForTimeout(60);
await page.locator("#btn-modes").click();
await page.waitForTimeout(80);
await page.locator('[data-mode="daily"]').click();
await page.waitForTimeout(100);
if (await page.locator("#daily-go").count()) ok("daily select UI");
else bad("no daily-go");

await page.locator("#daily-go").click();
await page.waitForTimeout(120);
let s = await page.evaluate(() => window.__RG.stats());
if (s.state === "hexPick" || s.state === "playing") ok("daily start " + s.state);
else bad("daily start " + s.state);
if (s.state === "hexPick") {
  await page.locator("#hex-cards .hex-card").first().click();
  await page.waitForTimeout(80);
}

// 清几层再死
for (let i=0;i<6;i++){
  s = await page.evaluate(() => window.__RG.stats());
  if (s.state !== "playing") break;
  await page.evaluate(() => window.__RG.forceClear());
  await page.waitForTimeout(80);
  s = await page.evaluate(() => window.__RG.stats());
  if (s.state === "exit") await page.evaluate(() => window.__RG.continueExit());
  await page.waitForTimeout(40);
  if (s.state === "hexPick") await page.evaluate(() => window.__RG.skipLevelHex());
}
await page.evaluate(() => window.__RG.killSelf("测试","每日"));
await page.waitForTimeout(550);
const save = await page.evaluate(() => JSON.parse(localStorage.getItem("breakgulf.save")));
const d = save.daily || [];
if (d.length && d[d.length-1].score > 0) ok("daily recorded score=" + d[d.length-1].score + " depth=" + d[d.length-1].depth);
else bad("daily not recorded " + JSON.stringify(d));

// 回排行 UI
await page.evaluate(() => window.__RG.showTitle());
await page.waitForTimeout(50);
await page.locator("#btn-modes").click();
await page.waitForTimeout(50);
await page.locator('[data-mode="daily"]').click();
await page.waitForTimeout(80);
const txt = await page.locator("#overlay-card").innerText();
if (txt.includes("深度") || txt.includes("最佳")) ok("board shows record");
else bad("board empty? " + txt.slice(0,120));

console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
