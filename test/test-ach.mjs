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

await page.evaluate(() => { localStorage.removeItem("breakgulf.save"); window.__RG.showTitle(); });
await page.waitForTimeout(50);

// 成就面板
await page.locator("#btn-ach").click();
await page.waitForTimeout(80);
const n = await page.locator("#ach-list .hex-card").count();
if (n === 28) ok("28 achievements listed");
else bad("ach count " + n);

await page.locator("#ach-back").click();
await page.waitForTimeout(50);

// 打一局触发击杀成就
await page.evaluate(() => { window.__RG.G.klass="melee"; window.__RG.start("endless"); });
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
for (let i=0;i<8;i++){
  const s = await page.evaluate(() => window.__RG.stats());
  if (s.state !== "playing") break;
  await page.evaluate(() => window.__RG.forceClear());
  await page.waitForTimeout(90);
  const s2 = await page.evaluate(() => window.__RG.stats());
  if (s2.state === "exit") await page.evaluate(() => window.__RG.continueExit());
  if (s2.state === "hexPick") await page.evaluate(() => window.__RG.skipLevelHex());
}
await page.evaluate(() => window.__RG.killSelf("t","t"));
await page.waitForTimeout(550);

const save = await page.evaluate(() => JSON.parse(localStorage.getItem("breakgulf.save")));
const ach = Object.keys(save.ach||{});
console.log("unlocked", ach.join(","));
if (ach.includes("a01") && ach.includes("a03")) ok("kill achievements");
else if (ach.includes("a01")) ok("at least first blood + more " + ach.length);
else bad("no kill ach " + ach.join(","));

// 面板显示已达成
await page.evaluate(() => window.__RG.showTitle());
await page.waitForTimeout(40);
await page.locator("#btn-ach").click();
await page.waitForTimeout(60);
const t = await page.locator("#overlay-card").innerText();
if (t.includes("已达成")) ok("panel marks unlocked");
else bad("no unlocked mark");

console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
