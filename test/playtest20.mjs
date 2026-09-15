import { chromium } from "playwright-core";
import { createServer } from "http";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const gamePath = join(__dirname, "..", "index.html");
const html = readFileSync(gamePath);

const server = createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const url = `http://127.0.0.1:${port}/`;

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
}).catch(async () => {
  return chromium.launch({ headless: true });
});

const page = await browser.newPage({ viewport: { width: 1100, height: 760 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push("console:" + msg.text());
});

await page.goto(url);
await page.waitForFunction(() => !!window.__RG);

const log = [];
function push(s) { log.push(s); console.log(s); }

// 开局
await page.evaluate(() => {
  window.__RG.G.klass = "ranger";
  window.__RG.start();
});
await page.waitForTimeout(200);
await page.evaluate(() => window.__RG.skipHex());
await page.waitForTimeout(300);

let prevRoom = 0;
for (let step = 0; step < 80; step++) {
  const s = await page.evaluate(() => window.__RG.stats());
  if (s.state === "hexPick") {
    await page.evaluate(() => window.__RG.skipLevelHex());
    await page.waitForTimeout(80);
    continue;
  }
  if (s.state === "exit") {
    // 关键回归：点「继续」后 overlay 必须消失
    const before = s.overlay;
    const ok = await page.evaluate(() => window.__RG.continueExit());
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => window.__RG.stats());
    if (!ok) push(`FAIL exit continue no-op room=${s.room}`);
    if (after.overlay) {
      push(`FAIL exit overlay still shown after continue room=${s.room}`);
    } else {
      push(`OK exit continue overlay hidden room=${s.room} -> ${after.room} state=${after.state}`);
    }
    if (after.state !== "playing" && after.state !== "hexPick") {
      push(`FAIL after exit continue state=${after.state}`);
    }
    prevRoom = s.room;
    continue;
  }
  if (s.state === "dead" || s.state === "dying") {
    push(`DEAD room=${s.room} lv=${s.level} kills=${s.kills}`);
    break;
  }
  if (s.state !== "playing") {
    push(`state=${s.state} room=${s.room}`);
    await page.waitForTimeout(50);
    continue;
  }
  if (s.room !== prevRoom) {
    push(`reach room ${s.room} lv=${s.level} hp=${Math.round(s.hp)}/${s.maxHp} mul=${s.waveMul?.toFixed?.(2)} enemies=${s.enemies.length}+q${s.queue.length} hex=${s.hexes.join(",") || "-"}`);
    prevRoom = s.room;
    if (s.room >= 20) {
      push("SUCCESS reached room 20+");
      break;
    }
  }
  // 清层（含场上+队列）
  await page.evaluate(() => window.__RG.forceClear());
  await page.waitForTimeout(120);
}

const final = await page.evaluate(() => window.__RG.stats());
push("FINAL " + JSON.stringify(final));
if (errors.length) push("ERRORS " + errors.slice(0, 8).join(" | "));
else push("NO_PAGE_ERRORS");

await browser.close();
server.close();
process.exit(log.some((l) => l.startsWith("FAIL") || l.startsWith("ERRORS")) ? 1 : 0);
