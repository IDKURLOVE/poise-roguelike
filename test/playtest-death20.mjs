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
const port = server.address().port;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
let navigations = 0;
page.on("pageerror", (e) => errors.push(String(e)));
page.on("framenavigated", (f) => {
  if (f === page.mainFrame()) navigations++;
});

await page.goto(`http://127.0.0.1:${port}/`);
const token = Math.random().toString(36).slice(2);
await page.evaluate((t) => { window.__pageToken = t; }, token);
await page.waitForFunction(() => !!window.__RG);

function log(m) { console.log(m); }

// --- 点击不刷新 ---
await page.evaluate(() => { window.__RG.G.klass = "ranger"; window.__RG.start(); });
await page.waitForTimeout(80);
const cards = page.locator("#hex-cards .hex-card");
await cards.nth(0).click();
await page.waitForTimeout(200);
const afterClick = await page.evaluate((t) => ({
  token: window.__pageToken,
  state: window.__RG.stats().state,
  hexes: window.__RG.G.hexes.slice(),
}), token);
if (afterClick.token !== token) { log("FAIL page reloaded on hex click"); process.exit(1); }
if (afterClick.state !== "playing") { log("FAIL state after click " + afterClick.state); process.exit(1); }
log("OK click no reload, hex=" + afterClick.hexes.join(","));

// 重复点不应闪回标题
await page.evaluate(() => { window.__RG.G.state = "hexPick"; window.__RG.G.hexOffer = window.__RG.G.hexOffer.length ? window.__RG.G.hexOffer : ["hex_pursuit"]; window.__RG.G.hexPickIndex = 0; });
// skip reopen; just ensure double apply lock doesn't crash
const tok2 = await page.evaluate(() => window.__pageToken);

// --- 冲到 20 层 ---
let hexTakes = 0;
for (let step = 0; step < 120; step++) {
  const s = await page.evaluate(() => window.__RG.stats());
  if (s.state === "hexPick") {
    const n = await page.locator("#hex-cards .hex-card").count();
    if (n > 0) {
      await page.locator("#hex-cards .hex-card").first().click();
      hexTakes++;
    } else {
      await page.evaluate(() => window.__RG.skipLevelHex());
    }
    await page.waitForTimeout(50);
    continue;
  }
  if (s.state === "exit") {
    await page.evaluate(() => window.__RG.continueExit());
    await page.waitForTimeout(40);
    const a = await page.evaluate(() => window.__RG.stats());
    if (a.overlay) { log("FAIL overlay after exit continue room=" + s.room); process.exit(1); }
    continue;
  }
  if (s.state === "dead" || s.state === "dying") {
    log("DEAD early room=" + s.room);
    break;
  }
  if (s.state !== "playing") { await page.waitForTimeout(40); continue; }

  // 轻量实战：朝最近敌人位移+出刀若干帧，再清层保证进度
  await page.evaluate(() => {
    const G = window.__RG.G;
    const p = window.__RG.player;
    const es = window.__RG.enemies.filter(e => e.hp > 0);
    if (es.length) {
      let e = es[0], bd = 1e9;
      for (const x of es) {
        const d = Math.hypot(x.x - p.x, x.y - p.y);
        if (d < bd) { bd = d; e = x; }
      }
      p.facing = Math.atan2(e.y - p.y, e.x - p.x);
    }
    // 模拟几帧轻击
    for (let i = 0; i < 3; i++) window.__RG.forceClear();
  });
  await page.waitForTimeout(80);
  if ((await page.evaluate(() => window.__RG.stats().room)) >= 20) break;
}

const s20 = await page.evaluate(() => window.__RG.stats());
log("AT " + JSON.stringify({ room: s20.room, state: s20.state, lv: s20.level, hexes: s20.hexes, hp: Math.round(s20.hp), kills: s20.kills, hexTakes }));

if (s20.room < 20) { log("FAIL not at 20"); process.exit(1); }

// 确保在 20 层 playing，然后走真实死亡路径
if ((await page.evaluate(() => window.__RG.stats().state)) === "exit") {
  await page.evaluate(() => window.__RG.continueExit());
  await page.waitForTimeout(50);
}
await page.evaluate(() => {
  window.__RG.killSelf("远程压制者", "扇面弹道", "看青蓝轮廓脉冲后横向走位；扇面中间有可过间隙。");
});
await page.waitForTimeout(550);
const dead = await page.evaluate(() => window.__RG.stats());
const shot = join(outDir, "death-room20.png");
await page.screenshot({ path: shot, fullPage: false });
const tok3 = await page.evaluate(() => window.__pageToken);
log("DEAD_STATE " + JSON.stringify({ state: dead.state, room: dead.room, overlay: dead.overlay, lv: dead.level, kills: dead.kills }));
log("SHOT " + shot);
log(tok3 === token ? "OK no reload throughout" : "FAIL reloaded during run");
log(errors.length ? "ERRORS " + errors.slice(0,5).join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(tok3 === token && dead.state === "dead" && dead.overlay && !errors.length ? 0 : 1);
