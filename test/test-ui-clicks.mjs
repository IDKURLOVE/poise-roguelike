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
const page = await browser.newPage({ viewport: { width: 1100, height: 820 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push("c:" + m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.evaluate(() => localStorage.removeItem("breakgulf.save"));
await page.reload();
await page.waitForFunction(() => !!window.__RG);

let fail = 0;
const ok = (m) => console.log("OK", m);
const bad = (m) => { console.log("FAIL", m); fail++; };
const st = async () => (await page.evaluate(() => window.__RG.stats())).state;

async function toTitle() {
  await page.evaluate(() => window.__RG.showTitle());
  await page.waitForTimeout(50);
}
async function skipHexIfAny() {
  if ((await st()) === "hexPick") {
    await page.evaluate(() => window.__RG.skipLevelHex());
    await page.waitForTimeout(50);
  }
}

// ========== 1 标题区 ==========
await toTitle();
for (const k of ["ranger", "bulwark", "melee"]) {
  await page.locator(`button[data-k="${k}"]`).click();
  await page.waitForTimeout(40);
  const klass = await page.evaluate(() => window.__RG.G.klass);
  if (klass === k) ok("klass btn " + k);
  else bad("klass btn " + k + " got " + klass);
}

// 商店：先给钱再买
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("breakgulf.save") || "{}");
  s.currency = 400; s.unlocked = [];
  localStorage.setItem("breakgulf.save", JSON.stringify(s));
  window.__RG.showTitle();
});
await page.waitForTimeout(40);
await page.locator('[data-meta="hex_pick4"]').click();
await page.waitForTimeout(80);
const bought = await page.evaluate(() => JSON.parse(localStorage.getItem("breakgulf.save")));
if (bought.unlocked.includes("hex_pick4") && bought.currency === 280) ok("meta buy");
else bad("meta buy " + JSON.stringify(bought));

// 成就面板进出
await page.locator("#btn-ach").click();
await page.waitForTimeout(60);
if ((await st()) === "achievements") ok("ach open");
else bad("ach open " + await st());
await page.locator("#ach-back").click();
await page.waitForTimeout(50);
if ((await st()) === "title") ok("ach back");
else bad("ach back " + await st());

// ========== 2 模式大厅全部可点 ==========
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("breakgulf.save") || "{}");
  s.best = s.best || {};
  s.best.depth = Math.max(s.best.depth || 0, 8);
  s.runs = Math.max(s.runs || 0, 2);
  localStorage.setItem("breakgulf.save", JSON.stringify(s));
  window.__RG.showTitle();
});
await page.waitForTimeout(40);
await page.locator("#btn-modes").click();
await page.waitForTimeout(60);
if ((await st()) === "modeSelect") ok("mode hub");
else bad("mode hub " + await st());

// 战锁的竞技场
await page.locator('[data-mode="arena"]').click();
await page.waitForTimeout(60);
const arenaLocked = (await st()) === "modeSelect";
if (arenaLocked) ok("arena locked without campaign");
else bad("arena should lock, got " + await st());

// 挑战进入与返回
await page.locator('[data-mode="challenge"]').click();
await page.waitForTimeout(60);
if ((await st()) === "challengeSelect") ok("challenge select");
else bad("challenge select " + await st());
await page.locator("#ch-back").click();
await page.waitForTimeout(50);
if ((await st()) === "modeSelect") ok("ch back");
else bad("ch back " + await st());

// 自定义：勾选 + 返回 + 再进 + 开始
await page.locator('[data-mode="custom"]').click();
await page.waitForTimeout(50);
await page.locator('[data-cm="noheal"]').click();
await page.waitForTimeout(40);
await page.locator('[data-cm="glass"]').click();
await page.waitForTimeout(40);
const mods = await page.evaluate(() => window.__RG.G.customSelected.slice());
if (mods.includes("glass") && mods.includes("noheal")) ok("custom mods " + mods.join(","));
else bad("custom mods " + mods);
await page.locator("#cm-go").click();
await page.waitForTimeout(80);
await skipHexIfAny();
if ((await st()) === "playing") {
  const hp = await page.evaluate(() => window.__RG.player.maxHp);
  if (hp <= 30) ok("custom start hp=" + hp);
  else bad("custom hp " + hp);
} else bad("custom start " + await st());
await page.evaluate(() => window.__RG.killSelf("ui", "custom"));
await page.waitForTimeout(480);
await page.locator('[data-act="title"]').click();
await page.waitForTimeout(80);
if ((await st()) === "title") ok("death title btn");
else bad("death title " + await st());

// 每日
await page.locator("#btn-modes").click();
await page.waitForTimeout(50);
await page.locator('[data-mode="daily"]').click();
await page.waitForTimeout(60);
await page.locator("#daily-back").click();
await page.waitForTimeout(50);
if ((await st()) === "modeSelect") ok("daily back");
else bad("daily back " + await st());
await page.locator('[data-mode="daily"]').click();
await page.waitForTimeout(50);
await page.locator("#daily-go").click();
await page.waitForTimeout(80);
await skipHexIfAny();
if ((await st()) === "playing") ok("daily go");
else bad("daily go " + await st());

// ========== 3 暂停三条路径 ==========
await page.keyboard.press("Escape");
await page.waitForTimeout(60);
await page.locator(".hex-card").nth(0).click(); // 继续
await page.waitForTimeout(60);
if ((await st()) === "playing") ok("pause continue click");
else bad("pause continue " + await st());

await page.keyboard.press("Escape");
await page.waitForTimeout(50);
await page.locator(".hex-card").nth(2).click(); // 重新开始
await page.waitForTimeout(80);
await skipHexIfAny();
if ((await st()) === "playing" || (await st()) === "hexPick") ok("pause restart click " + await st());
else bad("pause restart " + await st());

// 放弃 → 再想想 → 再放弃 → 确认
await page.keyboard.press("Escape");
await page.waitForTimeout(50);
await page.locator(".hex-card").nth(1).click();
await page.waitForTimeout(60);
await page.locator("#ab-no").click();
await page.waitForTimeout(60);
if ((await st()) === "pause") ok("abandon cancel back pause");
else bad("abandon cancel " + await st());
await page.locator(".hex-card").nth(1).click();
await page.waitForTimeout(50);
await page.locator("#ab-yes").click();
await page.waitForTimeout(120);
if ((await st()) === "title") ok("abandon confirm yes");
else bad("abandon yes " + await st());

// ========== 4 海克斯：点击选中 + 跳过按钮 ==========
await page.evaluate(() => { window.__RG.G.klass = "ranger"; window.__RG.start("endless"); });
await page.waitForTimeout(80);
if ((await st()) === "hexPick") ok("hex pick open");
else bad("hex open " + await st());
await page.locator("#hex-cards .hex-card").nth(0).click();
await page.waitForTimeout(80);
if ((await st()) === "playing") ok("hex card click select");
else bad("hex select " + await st());

// 下次升级海克斯用跳过按钮（先给经验）
await page.evaluate(() => {
  window.__RG.G.exp = 9999;
  window.__RG.G.levelUpPending = 1;
  window.__RG.G.level = 2;
  // 触发
  const G = window.__RG.G;
  G.state = "playing";
  window.__RG.start("endless"); // 会重置，改为手动 open
});
await page.waitForTimeout(50);
await skipHexIfAny();
// 手动进 hexPick 测跳过按钮
await page.evaluate(() => {
  const G = window.__RG.G;
  G.state = "title";
});
await page.evaluate(() => { window.__RG.G.klass = "melee"; window.__RG.start("campaign"); });
await page.waitForTimeout(80);
if ((await st()) === "hexPick") {
  await page.locator('[data-act="skipHex"]').click();
  await page.waitForTimeout(80);
  if ((await st()) === "playing") ok("skipHex button");
  else bad("skipHex " + await st());
} else bad("no hex for skip " + await st());

// ========== 5 出口双按钮（无尽才有出口节点）==========
await toTitle();
await page.evaluate(() => { window.__RG.G.klass = "melee"; window.__RG.start("endless"); });
await page.waitForTimeout(80);
await skipHexIfAny();
for (let i = 0; i < 16; i++) {
  const s = await page.evaluate(() => window.__RG.stats());
  if (s.state === "hexPick") { await skipHexIfAny(); await page.waitForTimeout(40); continue; }
  if (s.state === "exit") break;
  if (s.state !== "playing") break;
  await page.evaluate(() => window.__RG.forceClear());
  await page.waitForTimeout(100);
}
if ((await st()) === "exit") {
  ok("exit reached");
  await page.locator("#ex-go").click();
  await page.waitForTimeout(80);
  if ((await st()) === "playing") ok("exit continue click");
  else bad("exit continue " + await st());
  for (let i = 0; i < 16; i++) {
    const s = await page.evaluate(() => window.__RG.stats());
    if (s.state === "hexPick") { await skipHexIfAny(); await page.waitForTimeout(40); continue; }
    if (s.state === "exit") break;
    if (s.state !== "playing") break;
    await page.evaluate(() => window.__RG.forceClear());
    await page.waitForTimeout(90);
  }
  if ((await st()) === "exit") {
    await page.locator("#ex-take").click();
    await page.waitForTimeout(120);
    if ((await st()) === "title") ok("exit take click");
    else bad("exit take " + await st());
  } else bad("no second exit " + await st());
} else bad("no exit " + await st());

// ========== 6 战役通关后竞技场解锁 ==========
await toTitle();
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("breakgulf.save") || "{}");
  s.best = s.best || {}; s.best.campaignWin = true; s.best.depth = 20;
  localStorage.setItem("breakgulf.save", JSON.stringify(s));
  window.__RG.showTitle();
});
await page.waitForTimeout(40);
await page.locator("#btn-modes").click();
await page.waitForTimeout(50);
await page.locator('[data-mode="arena"]').click();
await page.waitForTimeout(80);
await skipHexIfAny();
if ((await st()) === "playing") ok("arena unlocked after campaign");
else bad("arena unlock " + await st());
await page.evaluate(() => window.__RG.killSelf("ui", "arena"));
await page.waitForTimeout(480);

// ========== 7 连点防抖 ==========
await toTitle();
await page.evaluate(() => window.__RG.start("endless"));
await page.waitForTimeout(70);
const before = await page.evaluate(() => window.__RG.G.hexes.length);
const card = page.locator("#hex-cards .hex-card").first();
await card.click({ clickCount: 3, delay: 10 });
await page.waitForTimeout(200);
const after = await page.evaluate(() => ({ n: window.__RG.G.hexes.length, state: window.__RG.stats().state }));
if (after.n <= before + 1 && after.state === "playing") ok("double click guard hexes=" + after.n);
else bad("double click " + JSON.stringify(after));

console.log(errors.length ? "ERRORS " + errors.slice(0, 10).join(" | ") : "NO_PAGE_ERRORS");
await page.screenshot({ path: join(outDir, "ui-scan-end.png") });
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
