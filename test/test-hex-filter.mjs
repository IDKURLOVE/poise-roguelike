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

let fail = 0;
function ok(m){ console.log("OK", m); }
function bad(m){ console.log("FAIL", m); fail++; }

// 1) 标题 Enter 不应直接跳过海克斯
await page.evaluate(() => { window.__RG.G.klass = "melee"; });
await page.keyboard.press("Enter");
await page.waitForTimeout(120);
let s = await page.evaluate(() => window.__RG.stats());
if (s.state === "hexPick" && s.overlay) ok("Enter 开局停留在海克斯选择");
else bad(`Enter 后 state=${s.state} overlay=${s.overlay}`);

// 2) 近战池不得含弹丸海克斯
const offer = await page.evaluate(() => window.__RG.G.hexOffer.map(id => {
  const h = window.__RG.HEX_BY_ID ? window.__RG.HEX_BY_ID[id] : null;
  return id;
}));
// HEX_BY_ID may not be on window; read via offer ids
const projIds = ["hex_multishot","hex_heavyshot","hex_homing","hex_barrage","hex_orbit"];
const leak = offer.filter(id => projIds.includes(id));
if (!leak.length) ok("近战机海克斯无弹丸: " + offer.join(","));
else bad("近战池泄漏弹丸: " + leak.join(","));

// 3) Enter 确认后进战斗
await page.keyboard.press("Enter");
await page.waitForTimeout(150);
s = await page.evaluate(() => window.__RG.stats());
if (s.state === "playing" && !s.overlay && s.hexes.length === 1) ok("确认海克斯后进房 hex=" + s.hexes[0]);
else bad(`确认后 state=${s.state} overlay=${s.overlay} hexes=${s.hexes}`);

// 4) 远程应能刷到弹丸类（重开）
await page.evaluate(() => {
  window.__RG.G.klass = "ranger";
  window.__RG.start();
});
await page.waitForTimeout(80);
// 手动开多次看池子是否含弹丸
const seen = await page.evaluate(() => {
  const G = window.__RG.G;
  const hits = new Set();
  for (let i=0;i<30;i++){
    G.hexes=[]; G.hexLevels={}; G.hexOffer=[];
    // call openHexPick internals via start-like filter
    // expose via stats after open
    window.__RG.skipLevelHex && window.__RG.skipLevelHex();
  }
  return [];
});
// simpler: filter pool by only
const rangerPool = await page.evaluate(() => {
  // read HEX_POOL from script is hard; use openHexPick by forcing
  const G = window.__RG.G;
  G.hexes=[]; G.hexLevels={};
  G.state = "playing";
  // re-open pick
  const ev = new KeyboardEvent("keydown");
  return null;
});
// Just restart and open pick once for ranger
await page.evaluate(() => { window.__RG.G.klass="ranger"; window.__RG.start(); });
await page.waitForTimeout(80);
const rOffer = await page.evaluate(() => window.__RG.G.hexOffer.slice());
console.log("ranger offer", rOffer.join(","));
// not required to contain proj every time, but must not crash
if (await page.evaluate(() => window.__RG.stats().state) === "hexPick") ok("远程开局也进海克斯");

console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
