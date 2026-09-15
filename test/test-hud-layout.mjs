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
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.__RG);
await page.evaluate(() => {
  window.__RG.G.klass = "ranger";
  window.__RG.start();
});
await page.waitForTimeout(80);
await page.locator("#hex-cards .hex-card").first().click();
// 给点经验让等级条有内容
await page.evaluate(() => {
  const G = window.__RG.G;
  G.level = 13;
  G.exp = 434;
  G.expNext = 647;
  G.hexes = ["hex_glassleech","hex_barrage"];
  G.hexLevels = { hex_glassleech: 2, hex_barrage: 2 };
  // 清几层拿 hex-hud
  window.__RG.forceClear();
});
await page.waitForTimeout(400);
// 确保 hex-hud 显示
await page.evaluate(() => {
  document.getElementById("hex-hud").classList.add("show");
  document.getElementById("hex-hud").innerHTML = `
    <div class="hex-chip" style="--c:#d7a6ff"><span class="dot"></span><span>血债</span><span class="lv">Lv2 · 0/15</span></div>
    <div class="hex-chip" style="--c:#ffd27a"><span class="dot"></span><span>弹幕节拍</span><span class="lv">Lv2 · 4/80</span></div>`;
});
const boxes = await page.evaluate(() => {
  const hp = document.querySelector(".hp-card").getBoundingClientRect();
  const hx = document.getElementById("hex-hud").getBoundingClientRect();
  const overlap = !(hx.top >= hp.bottom - 2 || hx.bottom <= hp.top + 2 || hx.left >= hp.right - 2 || hx.right <= hp.left + 2);
  return { hp: {t:hp.top,b:hp.bottom,l:hp.left,r:hp.right}, hx:{t:hx.top,b:hx.bottom,l:hx.left,r:hx.right}, overlap };
});
console.log(boxes.overlap ? "FAIL overlap" : "OK no overlap", JSON.stringify(boxes));
const shot = join(outDir, "hud-layout.png");
await page.screenshot({ path: shot });
console.log("SHOT", shot);
console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(boxes.overlap || errors.length ? 1 : 0);
