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
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push("console:" + m.text()); });
await page.goto(url);
const token = "v" + Date.now();
await page.evaluate((t) => { window.__pageToken = t; localStorage.removeItem("breakgulf.save"); }, token);
await page.waitForFunction(() => !!window.__RG);

let fail = 0;
const ok = (m) => console.log("OK", m);
const bad = (m) => { console.log("FAIL", m); fail++; };

async function stats() { return page.evaluate(() => window.__RG.stats()); }
async function tokenOk() {
  return page.evaluate((t) => window.__pageToken === t, token);
}

async function clearTo(targetRoom, maxSteps = 40) {
  for (let i = 0; i < maxSteps; i++) {
    const s = await stats();
    if (s.state === "hexPick") { await page.evaluate(() => window.__RG.skipLevelHex()); await page.waitForTimeout(40); continue; }
    if (s.state === "exit") { await page.evaluate(() => window.__RG.continueExit()); await page.waitForTimeout(40); continue; }
    if (s.state === "dead" || s.state === "dying" || s.state === "win") return s;
    if (s.state !== "playing") { await page.waitForTimeout(40); continue; }
    if (targetRoom && s.room >= targetRoom) return s;
    await page.evaluate(() => window.__RG.forceClear());
    await page.waitForTimeout(85);
  }
  return stats();
}

async function backToTitle() {
  await page.evaluate(() => window.__RG.showTitle());
  await page.waitForTimeout(50);
}

// --- 0 署名 ---
await page.waitForTimeout(80);
const credit = await page.locator(".dev-credit").innerText();
if (credit.includes("POPOult")) ok("credit " + credit.trim());
else bad("credit missing " + credit);

// --- 1 无尽到 20 + 死亡 ---
await backToTitle();
await page.evaluate(() => { window.__RG.G.klass = "melee"; window.__RG.start("endless"); });
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
let s = await clearTo(20);
if (s.room >= 20) ok("endless room " + s.room);
else bad("endless room " + s.room);
await page.evaluate(() => window.__RG.killSelf("回归", "无尽"));
await page.waitForTimeout(520);
s = await stats();
if (s.state === "dead") ok("endless death overlay " + s.overlay);
else bad("endless death " + s.state);
await page.screenshot({ path: join(outDir, "reg-endless-20.png") });

// --- 2 战役通关 ---
await backToTitle();
await page.evaluate(() => window.__RG.start("campaign"));
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
s = await clearTo(13);
if (s.state === "win") ok("campaign win");
else bad("campaign " + JSON.stringify({ state: s.state, room: s.room }));

// --- 3 Boss 连战 ---
await backToTitle();
await page.evaluate(() => window.__RG.start("bossrush"));
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
s = await clearTo(11);
if (s.state === "win" || s.room >= 10) ok("bossrush " + s.state + " room=" + s.room);
else bad("bossrush " + JSON.stringify({ state: s.state, room: s.room }));

// --- 4 竞技场 ---
await backToTitle();
await page.evaluate(() => window.__RG.start("arena"));
await page.waitForTimeout(120);
if ((await stats()).state === "hexPick") await page.evaluate(() => window.__RG.skipLevelHex());
await page.waitForTimeout(80);
s = await clearTo(null, 14);
const arenaScore = await page.evaluate(() => window.__RG.G.modeScore);
if (s.state === "playing" || s.state === "win") ok("arena " + s.state + " room=" + s.room + " score=" + arenaScore);
else bad("arena " + s.state + " room=" + s.room);
await page.evaluate(() => window.__RG.killSelf("回归", "竞技场"));
await page.waitForTimeout(500);

// --- 5 挑战之书 ---
await backToTitle();
await page.evaluate(() => {
  window.__RG.G.mode = "challenge";
  window.__RG.G.modeMods = ["lowhp", "fastenemy"];
  window.__RG.G.modeSeed = 101;
  window.__RG.G.modeChallenge = "玻璃舞步";
  window.__RG.start("challenge");
});
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
const chHp = await page.evaluate(() => window.__RG.player.maxHp);
if (chHp <= 45) ok("challenge lowhp maxHp=" + chHp);
else bad("challenge maxHp " + chHp);
s = await clearTo(null, 10);
if (s.state === "playing" || s.state === "win" || s.state === "dead") ok("challenge flow " + s.state + " room=" + s.room);
else bad("challenge " + s.state);

// --- 6 自定义玻璃 ---
await backToTitle();
await page.evaluate(() => {
  window.__RG.G.mode = "custom";
  window.__RG.G.modeMods = ["glass"];
  window.__RG.G.customSelected = ["glass"];
  window.__RG.start("custom");
});
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
const cuHp = await page.evaluate(() => window.__RG.player.maxHp);
if (cuHp <= 30) ok("custom glass maxHp=" + cuHp);
else bad("custom maxHp " + cuHp);
await page.evaluate(() => window.__RG.killSelf("回归", "自定义"));
await page.waitForTimeout(480);

// --- 7 每日种子 ---
await backToTitle();
await page.evaluate(() => {
  window.__RG.G.mode = "daily";
  window.__RG.G.modeMods = [];
  window.__RG.G.modeSeed = 0;
  window.__RG.start("daily");
});
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
s = await clearTo(null, 10);
await page.evaluate(() => window.__RG.killSelf("回归", "每日"));
await page.waitForTimeout(520);
const daily = await page.evaluate(() => JSON.parse(localStorage.getItem("breakgulf.save")).daily || []);
if (daily.length) ok("daily recorded " + daily[daily.length-1].score);
else bad("daily no record");

// --- 8 三角色 ---
for (const klass of ["melee", "ranger", "bulwark"]) {
  await backToTitle();
  await page.evaluate((kk) => { window.__RG.G.klass = kk; window.__RG.start("endless"); }, klass);
  await page.waitForTimeout(70);
  await page.evaluate(() => window.__RG.skipLevelHex());
  const hp = await page.evaluate(() => window.__RG.player.maxHp);
  if (hp > 0) ok("klass " + klass + " hp=" + hp);
  else bad("klass " + klass);
  await page.evaluate((kk) => window.__RG.killSelf("r", kk), klass);
  await page.waitForTimeout(450);
}

// --- 8b 暂停 → 放弃本局 ---
await backToTitle();
await page.evaluate(() => { window.__RG.G.klass = "melee"; window.__RG.start("endless"); });
await page.waitForTimeout(80);
await page.evaluate(() => window.__RG.skipLevelHex());
await page.waitForTimeout(100);
await page.keyboard.press("Escape");
await page.waitForTimeout(80);
if ((await stats()).state === "pause") ok("pause open");
else bad("pause " + (await stats()).state);
await page.locator(".hex-card").nth(1).click();
await page.waitForTimeout(90);
if ((await stats()).state === "pauseConfirm") ok("abandon confirm dialog");
else bad("abandon confirm " + (await stats()).state);
await page.locator("#ab-yes").click();
await page.waitForTimeout(180);
if ((await stats()).state === "title") ok("abandon -> title");
else bad("abandon end " + (await stats()).state);

// --- 9 重开按钮 ---
await page.evaluate(() => window.__RG.showTitle());
await page.waitForTimeout(40);
await page.evaluate(() => { window.__RG.start("endless"); });
await page.waitForTimeout(70);
await page.evaluate(() => window.__RG.skipLevelHex());
await page.evaluate(() => window.__RG.killSelf("r", "btn"));
await page.waitForTimeout(500);
if (await page.locator('[data-act="restart"]').count()) {
  await page.locator('[data-act="restart"]').click();
  await page.waitForTimeout(100);
  s = await stats();
  if (s.state === "hexPick" || s.state === "playing") ok("restart button " + s.state);
  else bad("restart button " + s.state);
} else bad("no restart btn");

const tok = await page.evaluate(() => window.__pageToken);
if (tok === token) ok("no page reload");
else bad("PAGE RELOADED");

console.log(errors.length ? "ERRORS " + errors.slice(0, 8).join(" | ") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
