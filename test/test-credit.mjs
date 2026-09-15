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
const ok = (m)=>console.log("OK", m);
const bad = (m)=>{console.log("FAIL", m); fail++;};

// 布局：署名与目标面板不重叠
const boxes = await page.evaluate(() => {
  const c = document.getElementById("dev-credit").getBoundingClientRect();
  const o = document.querySelector(".obj").getBoundingClientRect();
  const overlap = !(c.bottom <= o.top || c.top >= o.bottom || c.right <= o.left || c.left >= o.right);
  return { c:{t:c.top,b:c.bottom,l:c.left,r:c.right}, o:{t:o.top,b:o.bottom,l:o.left,r:o.right}, overlap };
});
console.log(JSON.stringify(boxes));
if (!boxes.overlap) ok("credit vs obj no overlap");
else bad("credit overlaps obj");

// 删除 DOM 后应自愈
await page.evaluate(() => document.getElementById("dev-credit").remove());
await page.waitForTimeout(1700);
const back = await page.evaluate(() => {
  const el = document.getElementById("dev-credit");
  return el && el.textContent.includes("POPOult");
});
if (back) ok("credit self-heal after remove");
else bad("credit not restored");

// 窗口只读
const locked = await page.evaluate(() => {
  try { window.__POISE_CREDIT = 1; } catch(e){}
  return window.__POISE_CREDIT && window.__POISE_CREDIT.author === "POPOult";
});
if (locked) ok("window credit frozen");
else bad("credit not locked");

// 控制台与画布水印函数存在
const hasL = await page.evaluate(() => typeof window.__POISE_CREDIT === "object" && !!window.__POISE_CREDIT.url);
if (hasL) ok("license object present");
else bad("no license");

await page.evaluate(() => { window.__RG.start("endless"); });
await page.waitForTimeout(80);
await page.evaluate(() => { if (window.__RG.stats().state==="hexPick") window.__RG.skipLevelHex(); });
await page.waitForTimeout(100);
await page.screenshot({ path: join(__dirname, "shots", "credit-layout.png") });
console.log("SHOT credit-layout.png");
console.log(errors.length ? "ERRORS "+errors.join("|") : "NO_PAGE_ERRORS");
await browser.close();
server.close();
process.exit(fail || errors.length ? 1 : 0);
