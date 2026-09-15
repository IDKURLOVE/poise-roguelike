import { chromium } from "playwright-core";
import { createServer } from "http";
import { readFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "test", "shots");
mkdirSync(outDir, { recursive: true });
const html = readFileSync(join(root, "index.html"));
const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.__RG);

let fail = 0;
const ok = (m) => console.log("OK", m);
const bad = (m) => { console.log("FAIL", m); fail++; };

// 模式大厅
await page.locator("#btn-modes").click();
await page.waitForTimeout(100);
const modes = await page.locator("#mode-cards [data-mode]").count();
if (modes >= 6) ok("mode hub " + modes + " modes");
else bad("modes " + modes);

// 进战役
await page.locator('[data-mode="campaign"]').click();
await page.waitForTimeout(150);
let s = await page.evaluate(() => window.__RG.stats());
if (s.state === "hexPick" || s.state === "playing") ok("campaign start " + s.state);
else bad("campaign " + s.state);
if (s.state === "hexPick") {
  await page.locator("#hex-cards .hex-card").first().click();
  await page.waitForTimeout(80);
}

// 清 12 层应通关
for (let i = 0; i < 20; i++) {
  s = await page.evaluate(() => window.__RG.stats());
  if (s.state === "win") break;
  if (s.state === "hexPick") { await page.evaluate(() => window.__RG.skipLevelHex()); await page.waitForTimeout(40); continue; }
  if (s.state !== "playing") break;
  await page.evaluate(() => window.__RG.forceClear());
  await page.waitForTimeout(90);
}
s = await page.evaluate(() => window.__RG.stats());
if (s.state === "win") ok("campaign win room=" + s.room);
else bad("campaign no win " + JSON.stringify({state:s.state,room:s.room}));

// 回模式进自定义
await page.evaluate(() => { window.__RG.showTitle(); });
await page.waitForTimeout(80);
await page.locator("#btn-modes").click();
await page.waitForTimeout(80);
await page.locator('[data-mode="custom"]').click();
await page.waitForTimeout(80);
await page.locator('[data-cm="glass"]').click();
await page.waitForTimeout(50);
await page.locator("#cm-go").click();
await page.waitForTimeout(120);
s = await page.evaluate(() => window.__RG.stats());
const maxHp = await page.evaluate(() => window.__RG.player.maxHp);
if (s.state === "hexPick" || s.state === "playing") {
  if (s.state === "hexPick") { await page.evaluate(() => window.__RG.skipLevelHex()); await page.waitForTimeout(60); }
  const m = await page.evaluate(() => ({ maxHp: window.__RG.player.maxHp, mods: window.__RG.G.modeMods }));
  if (m.maxHp <= 30) ok("custom glass maxHp=" + m.maxHp + " mods=" + m.mods.join(","));
  else bad("custom maxHp " + m.maxHp);
} else bad("custom state " + s.state);

// 20 层无尽自测 + 死亡截图
await page.evaluate(() => { window.__RG.G.mode="endless"; window.__RG.G.modeMods=[]; window.__RG.start("endless"); });
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
for (let i=0;i<40;i++){
  s = await page.evaluate(() => window.__RG.stats());
  if (s.state==="hexPick"){ await page.evaluate(()=>window.__RG.skipLevelHex()); await page.waitForTimeout(40); continue; }
  if (s.state==="exit"){ await page.evaluate(()=>window.__RG.continueExit()); await page.waitForTimeout(40); continue; }
  if (s.state==="dead") break;
  if (s.room>=20) break;
  if (s.state!=="playing") break;
  await page.evaluate(()=>window.__RG.forceClear());
  await page.waitForTimeout(80);
}
s = await page.evaluate(() => window.__RG.stats());
if (s.room >= 20) ok("endless depth " + s.room);
else bad("endless depth " + s.room);
await page.evaluate(() => window.__RG.killSelf("远程压制者","扇面弹道","自测"));
await page.waitForTimeout(550);
const shot = join(outDir, "death-room20-modes.png");
await page.screenshot({ path: shot });
console.log("SHOT", shot);
console.log(errors.length ? "ERRORS " + errors.slice(0,5).join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
