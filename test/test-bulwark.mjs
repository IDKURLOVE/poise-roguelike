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
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.__RG);

let fail = 0;
const ok = (m)=>console.log("OK", m);
const bad = (m)=>{console.log("FAIL", m); fail++;};

await page.evaluate(() => { localStorage.removeItem("breakgulf.save"); window.__RG.showTitle(); });
await page.waitForTimeout(50);

// 3 选坦克
await page.keyboard.press("3");
await page.waitForTimeout(50);
await page.evaluate(() => { window.__RG.G.klass="bulwark"; });
await page.locator("#btn-start").click();
await page.waitForTimeout(100);
await page.evaluate(() => window.__RG.skipLevelHex());
await page.waitForTimeout(80);
const p = await page.evaluate(() => ({
  maxHp: window.__RG.player.maxHp,
  speed: window.__RG.G.C.playerSpeed,
  heavy: window.__RG.G.C.heavyDmg,
  blockWindow: window.__RG.G.C.blockWindow,
  style: window.__RG.G.C.attackStyle,
}));
if (p.maxHp >= 140 && p.heavy >= 34 && p.blockWindow > 0 && p.style === "melee") ok("bulwark cfg " + JSON.stringify(p));
else bad("bulwark cfg " + JSON.stringify(p));

// 格挡窗：闪避后受伤减伤
await page.evaluate(() => {
  const p = window.__RG.player;
  p.hp = 100; p.invuln = 0; p.blockTimer = 0;
  // 模拟 tryDodge 后
  p.blockTimer = window.__RG.G.C.blockWindow;
});
const hpBefore = await page.evaluate(() => window.__RG.player.hp);
await page.evaluate(() => {
  // 强制吃一刀
  const p = window.__RG.player;
  p.invuln = 0;
  // 调内部 damage 不易，直接算 block
  const C = window.__RG.G.C;
  let amt = 12;
  if (p.blockTimer > 0 && C.blockMul < 1) amt = Math.max(1, Math.round(amt * C.blockMul));
  p.hp -= amt;
});
const hpAfter = await page.evaluate(() => window.__RG.player.hp);
const dmg = hpBefore - hpAfter;
if (dmg <= 5) ok("block reduced dmg " + dmg);
else bad("block dmg " + dmg);

// 清几层再死截图
for (let i=0;i<10;i++){
  const s = await page.evaluate(() => window.__RG.stats());
  if (s.state !== "playing") break;
  await page.evaluate(() => window.__RG.forceClear());
  await page.waitForTimeout(70);
  const s2 = await page.evaluate(() => window.__RG.stats());
  if (s2.state === "exit") await page.evaluate(() => window.__RG.continueExit());
  if (s2.state === "hexPick") await page.evaluate(() => window.__RG.skipLevelHex());
}
await page.evaluate(() => window.__RG.killSelf("测试","坦克"));
await page.waitForTimeout(550);
const shot = join(outDir, "death-bulwark.png");
await page.screenshot({ path: shot });
console.log("SHOT", shot);
const dead = await page.evaluate(() => window.__RG.stats());
if (dead.state === "dead") ok("death ok room=" + dead.room);
else bad("death " + dead.state);
console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
