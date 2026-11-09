import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  permissions: ["clipboard-read", "clipboard-write"],
});
const page = await context.newPage();
const logs = [];
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") logs.push(msg.type() + ": " + msg.text());
});
page.on("pageerror", (err) => logs.push("page: " + err.message));
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForSelector(".card");
const names = await page.$$eval(".cname", (els) => els.map((el) => el.textContent.trim()));
const results = [];
for (let i = 0; i < names.length; i++) {
  const before = logs.length;
  const name = names[i];
  await page.evaluate((index) => {
    const card = document.querySelectorAll(".card")[index];
    card.querySelector(".copy").click();
  }, i);
  try {
    await page.waitForFunction(
      (index) => {
        const toast = document.querySelector(".toast");
        const on = toast?.getAttribute("data-on") === "true";
        const text = toast?.textContent || "";
        const copying = document.querySelectorAll(".copy")[index]?.textContent?.includes("Copying");
        return on && !copying && (text.includes("Couldn") || text.includes("Ready"));
      },
      i,
      { timeout: 12000 },
    );
  } catch {
    results.push({ name, ok: false, toast: "timeout", err: logs.slice(before).join(" | ") });
    continue;
  }
  const toast = await page.$eval(".toast", (el) => el.textContent.trim());
  const ok = !toast.includes("Couldn");
  results.push({ name, ok, toast, err: logs.slice(before).slice(-3).join(" | ") });
  process.stdout.write((ok ? "ok  " : "FAIL") + " " + name + (ok ? "" : " :: " + logs.slice(before).slice(-2).join(" | ")) + "\n");
}
const failed = results.filter((r) => !r.ok);
console.log("\nFAILED", failed.length, "/", results.length);
console.log(JSON.stringify(failed, null, 2));
await browser.close();
