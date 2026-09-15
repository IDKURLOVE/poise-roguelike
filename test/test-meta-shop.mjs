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
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!window.__RG);

// 塞钱并刷新标题
await page.evaluate(() => {
  const raw = JSON.parse(localStorage.getItem("breakgulf.save") || "{}");
  raw.currency = 400;
  raw.unlocked = [];
  localStorage.setItem("breakgulf.save", JSON.stringify(raw));
  window.__RG.G.save = null;
});
// 重新 showTitle via start? force reload title
await page.keyboard.press("Escape");
await page.evaluate(() => {
  // trigger showTitle by ending to title from dead isn't set; call via start then abandon is heavy
  location.reload();
});
await page.waitForFunction(() => !!window.__RG);
await page.waitForTimeout(100);

const money = await page.evaluate(() => JSON.parse(localStorage.getItem("breakgulf.save")).currency);
console.log("money", money);
const card = page.locator('[data-meta="hex_pick4"]');
await card.click();
await page.waitForTimeout(100);
const after = await page.evaluate(() => JSON.parse(localStorage.getItem("breakgulf.save")));
const ok = after.unlocked.includes("hex_pick4") && after.currency === 400-120;
console.log(ok ? "OK buy hex_pick4 currency="+after.currency : "FAIL "+JSON.stringify(after));
console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(ok && !errors.length ? 0 : 1);
