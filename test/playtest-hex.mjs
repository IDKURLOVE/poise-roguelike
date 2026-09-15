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
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(url);
await page.waitForFunction(() => !!window.__RG);

// 选近战，拿第一个海克斯
await page.evaluate(() => {
  window.__RG.G.klass = "melee";
  window.__RG.start();
});
await page.waitForTimeout(150);
await page.evaluate(() => window.__RG.applyHex(0));
await page.waitForTimeout(200);

let hexPicks = 0;
let exits = 0;
let fail = 0;

for (let step = 0; step < 100; step++) {
  const s = await page.evaluate(() => window.__RG.stats());
  if (s.state === "hexPick") {
    hexPicks++;
    await page.evaluate(() => window.__RG.applyHex(0));
    await page.waitForTimeout(60);
    continue;
  }
  if (s.state === "exit") {
    exits++;
    await page.evaluate(() => window.__RG.continueExit());
    await page.waitForTimeout(40);
    const after = await page.evaluate(() => window.__RG.stats());
    if (after.overlay) { console.log("FAIL overlay at exit", s.room); fail++; }
    if (after.state !== "playing") { console.log("FAIL state after exit", after.state); fail++; }
    continue;
  }
  if (s.state === "dead" || s.state === "dying") {
    console.log("DEAD", JSON.stringify(s));
    break;
  }
  if (s.state !== "playing") {
    await page.waitForTimeout(40);
    continue;
  }
  if (s.room >= 20) {
    console.log("OK reached 20 hexes=", s.hexes.join("+"), "lv=", s.level, "hexPicks=", hexPicks, "exits=", exits);
    break;
  }
  await page.evaluate(() => window.__RG.forceClear());
  await page.waitForTimeout(100);
}

const final = await page.evaluate(() => window.__RG.stats());
console.log("FINAL", JSON.stringify({
  room: final.room, level: final.level, state: final.state,
  overlay: final.overlay, hexes: final.hexes, hexLevels: window.__RG.G.hexLevels,
}));
console.log(errors.length ? "ERRORS " + errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
