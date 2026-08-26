import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const baseURL = process.env.HAF_VISUAL_QA_URL ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve("qa/visual-refresh-2026-08-26");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1400, height: 1200 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(message.text());
});
page.on("pageerror", (error) => consoleErrors.push(error.message));

await page.addInitScript(() => {
  window.localStorage.setItem("haf-journey-onboarded", JSON.stringify(false));
  window.localStorage.setItem("haf-journey-profile", JSON.stringify({
    birth: { year: 1984, month: 6, day: 15 },
    birthTime: "23:23",
    gender: "女性",
    city: "苏州",
  }));
  window.localStorage.setItem("haf-journey-favorites:2025-validation-v1", JSON.stringify([]));
  window.localStorage.setItem("haf-journey-recent-courses:2025-validation-v1", JSON.stringify([]));
});

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
await page.getByTestId("welcome-screen").waitFor({ state: "visible", timeout: 8_000 });
await page.getByTestId("welcome-screen").getByRole("button", { name: "开启今日探索" }).click();

const deviceScreen = page.getByTestId("device-screen");
const profileScreen = page.getByTestId("profile-screen");
await profileScreen.waitFor({ state: "visible" });
const profileModule = profileScreen.locator("xpath=ancestor::section[@data-testid='journey-module']");

const deviceBox = await deviceScreen.boundingBox();
const moduleBox = await profileModule.boundingBox();
if (!deviceBox || Math.abs(deviceBox.width - 393) > 1 || Math.abs(deviceBox.height - 852) > 1) {
  throw new Error(`Expected device screen at 393 x 852, got ${deviceBox?.width} x ${deviceBox?.height}`);
}
if (!moduleBox || Math.abs(moduleBox.width - 393) > 1 || Math.abs(moduleBox.height - 852) > 1) {
  throw new Error(`Expected full-screen HAF module at 393 x 852, got ${moduleBox?.width} x ${moduleBox?.height}`);
}

const profilePath = path.join(outputDir, "profile-implementation.png");
await page.mouse.move(1360, 1160);
await profileModule.screenshot({ path: profilePath });

await page.getByRole("button", { name: "year增加" }).click();
await page.getByRole("button", { name: "year增加" }).click();
await page.getByLabel("当前城市").fill("苏州");
await page.getByRole("button", { name: "day增加" }).click();
await profileScreen.getByRole("button", { name: "开启今日探索" }).click();
await page.getByTestId("compass-screen").waitFor({ state: "visible" });

const compass = page.locator(".compass-map");
const compassBox = await compass.boundingBox();
if (!compassBox) throw new Error("Compass did not render");
await page.mouse.click(compassBox.x + compassBox.width * 0.8, compassBox.y + compassBox.height * 0.42);
await page.getByTestId("compass-screen").getByRole("button", { name: "完成感应" }).click();
const resultScreen = page.getByTestId("result-screen");
await resultScreen.waitFor({ state: "visible", timeout: 12_000 });
const resultModule = resultScreen.locator("xpath=ancestor::section[@data-testid='journey-module']");

const resultPath = path.join(outputDir, "result-implementation.png");
await page.mouse.move(1360, 1160);
await resultModule.screenshot({ path: resultPath });

const cards = page.getByTestId("course-card");
if (await cards.count() !== 3) throw new Error(`Expected exactly 3 course cards, got ${await cards.count()}`);
const firstCardBox = await cards.first().boundingBox();
if (!firstCardBox || Math.abs(firstCardBox.height - 285) > 1) {
  throw new Error(`Expected compact 285px course card, got ${firstCardBox?.height}`);
}
const cardClipping = await cards.first().evaluate((element) => {
  const style = window.getComputedStyle(element);
  return { borderRadius: style.borderRadius, clipPath: style.clipPath };
});
if (cardClipping.borderRadius !== "22px" || cardClipping.clipPath === "none") {
  throw new Error(`Expected rounded card clipping, got ${JSON.stringify(cardClipping)}`);
}
const facetsBox = await page.locator(".energy-facets").boundingBox();
const savedEntryBox = await page.locator(".recommendation-saved").boundingBox();
const savedEntryTopGap = facetsBox && savedEntryBox
  ? savedEntryBox.y - (facetsBox.y + facetsBox.height)
  : 0;
const savedEntryBottomGap = savedEntryBox && firstCardBox
  ? firstCardBox.y - (savedEntryBox.y + savedEntryBox.height)
  : 0;
if (savedEntryTopGap < 6 || savedEntryBottomGap < 6) {
  throw new Error(`Expected breathing room around saved entry, got ${savedEntryTopGap}px / ${savedEntryBottomGap}px`);
}
const reSenseBox = await resultScreen.getByRole("button", { name: "重新感应", exact: true }).boundingBox();
const resultModuleBox = await resultModule.boundingBox();
const bottomActionBuffer = reSenseBox && resultModuleBox
  ? resultModuleBox.y + resultModuleBox.height - (reSenseBox.y + reSenseBox.height)
  : 0;
if (bottomActionBuffer < 70) {
  throw new Error(`Expected at least 70px below re-sense action, got ${bottomActionBuffer}`);
}
const seenCourseIds = new Set(await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-course-id"))));
const firstTitles = await page.locator(".course-card h3").allTextContents();
const rail = page.locator(".course-rail");
const railBox = await rail.boundingBox();
if (!railBox) throw new Error("Course carousel did not render");
await page.mouse.move(railBox.x + railBox.width * 0.78, railBox.y + railBox.height * 0.5);
await page.mouse.down();
await page.mouse.move(railBox.x + railBox.width * 0.22, railBox.y + railBox.height * 0.5, { steps: 8 });
await page.mouse.up();
const railScrollLeft = await rail.evaluate((element) => element.scrollLeft);
if (railScrollLeft <= 0) throw new Error("Course carousel did not move horizontally");

const firstHeart = page.locator(".course-heart").first();
await firstHeart.click();
if (!(await firstHeart.getAttribute("class"))?.includes("saved")) throw new Error("Favorite state did not update");

let refreshedTitles = firstTitles;
for (let refreshIndex = 0; refreshIndex < 4; refreshIndex += 1) {
  await page.getByTestId("result-screen").getByRole("button", { name: "换一批" }).click();
  await page.waitForTimeout(150);
  const refreshedIds = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-course-id")));
  const repeatedId = refreshedIds.find((id) => id && seenCourseIds.has(id));
  if (repeatedId) throw new Error(`Course ${repeatedId} repeated before the unseen catalog pool was exhausted`);
  refreshedIds.forEach((id) => { if (id) seenCourseIds.add(id); });
  refreshedTitles = await page.locator(".course-card h3").allTextContents();
}
const persistedCourseHistory = await page.evaluate(() => JSON.parse(
  window.localStorage.getItem("haf-journey-recent-courses:2025-validation-v1") ?? "[]",
));
if (persistedCourseHistory.length !== 15) {
  throw new Error(`Expected 15 persisted unique course IDs after five batches, got ${persistedCourseHistory.length}`);
}
await page.getByTestId("result-screen").getByRole("button", { name: "重新感应", exact: true }).click();
await page.getByTestId("compass-screen").waitFor({ state: "visible" });
await page.getByTestId("compass-screen").getByRole("button", { name: "完成感应" }).click();
await page.getByTestId("result-screen").waitFor({ state: "visible", timeout: 12_000 });
await page.getByTestId("result-screen").getByRole("button", { name: "修改档案" }).click();
await page.getByTestId("profile-screen").last().waitFor({ state: "visible" });

const summary = {
  baseURL,
  viewport: { width: 1400, height: 1200, deviceScaleFactor: 1 },
  deviceScreen: deviceBox,
  module: moduleBox,
  screenshots: { profile: profilePath, result: resultPath },
  interactions: {
    profileControls: "passed",
    primaryCTA: "passed",
    carousel: railScrollLeft > 0 ? "passed" : "failed",
    favorite: "passed",
    refresh: firstTitles.join("|") !== refreshedTitles.join("|") && seenCourseIds.size === 15 ? "no-repeats-across-5-batches" : "failed",
    persistedCourseHistory: persistedCourseHistory.length,
    reSense: "passed",
    editProfile: "passed",
    compactCardHeight: firstCardBox.height,
    roundedCardClipping: cardClipping,
    savedEntrySpacing: { top: savedEntryTopGap, bottom: savedEntryBottomGap },
    bottomActionBuffer,
  },
  consoleErrors,
};

await writeFile(path.join(outputDir, "capture-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(summary, null, 2));
