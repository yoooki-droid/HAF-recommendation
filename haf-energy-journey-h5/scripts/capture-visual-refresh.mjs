import { chromium } from "@playwright/test";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const baseURL = process.env.HAF_VISUAL_QA_URL ?? "http://127.0.0.1:4173/";
const outputDir = path.resolve("qa/visual-refresh-2026-08-26");
const historicalCatalog = JSON.parse(await readFile(path.resolve("qa/course-recall-2025/catalog-normalized.json"), "utf8"));
const historicalValidationTime = Date.parse("2025-10-24T08:00:00+08:00");
const activeCatalogCourses = historicalCatalog.courses.filter((course) => (
  course.status === "published"
  && course.sessions.some((session) => Date.parse(`${session.end_at.replace(" ", "T")}+08:00`) > historicalValidationTime)
));
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1400, height: 1200 },
  deviceScaleFactor: 1,
  reducedMotion: "no-preference",
});
const page = await context.newPage();
const consoleErrors = [];
const screenshots = {};
const sharedBackgrounds = {};
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

async function captureJourneyScreen(testId, key, targetPage = page) {
  const screen = targetPage.getByTestId(testId);
  await screen.waitFor({ state: "visible", timeout: 8_000 });
  const journeyModule = screen.locator("xpath=ancestor::section[@data-testid='journey-module']");
  const layers = journeyModule.locator(".ambient-flow");
  const layerSources = await layers.evaluateAll((elements) => elements.map((element) => element.getAttribute("src")));
  if (layerSources.length !== 2 || layerSources.some((source) => source !== "/assets/haf/visual-refresh/energy-gradient.jpeg")) {
    throw new Error(`Expected two shared raster background layers on ${key}, got ${JSON.stringify(layerSources)}`);
  }
  const screenshotPath = path.join(outputDir, `${key}-implementation.png`);
  await targetPage.mouse.move(1360, 1160);
  await journeyModule.screenshot({ path: screenshotPath, animations: "allow" });
  screenshots[key] = screenshotPath;
  sharedBackgrounds[key] = layerSources;
  return { screen, journeyModule };
}

await page.goto(baseURL, { waitUntil: "domcontentloaded" });
const { journeyModule: loadingModule } = await captureJourneyScreen("loading-screen", "loading");
const primaryFlow = loadingModule.locator(".ambient-flow-primary");
const initialBackgroundTransform = await primaryFlow.evaluate((element) => window.getComputedStyle(element).transform);
await page.waitForTimeout(450);
const animatedBackgroundTransform = await primaryFlow.evaluate((element) => window.getComputedStyle(element).transform);
if (initialBackgroundTransform === animatedBackgroundTransform) {
  throw new Error(`Expected the shared background raster to move subtly, but transform remained ${initialBackgroundTransform}`);
}
const { screen: welcomeScreen } = await captureJourneyScreen("welcome-screen", "welcome");
await welcomeScreen.getByRole("button", { name: "开启今日探索" }).click();

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

await captureJourneyScreen("profile-screen", "profile");

await page.getByRole("button", { name: "year增加" }).click();
await page.getByRole("button", { name: "year增加" }).click();
await page.getByLabel("当前城市").fill("苏州");
await page.getByRole("button", { name: "day增加" }).click();
await profileScreen.getByRole("button", { name: "开启今日探索" }).click();
await captureJourneyScreen("compass-screen", "compass");

const compass = page.locator(".compass-map");
const compassBox = await compass.boundingBox();
if (!compassBox) throw new Error("Compass did not render");
await page.mouse.click(compassBox.x + compassBox.width * 0.8, compassBox.y + compassBox.height * 0.68);
await page.getByTestId("compass-screen").getByRole("button", { name: "完成感应" }).click();
await captureJourneyScreen("synthesis-screen", "synthesis");
const resultScreen = page.getByTestId("result-screen");
await resultScreen.waitFor({ state: "visible", timeout: 12_000 });
const resultModule = resultScreen.locator("xpath=ancestor::section[@data-testid='journey-module']");

await captureJourneyScreen("result-screen", "result");

const cards = page.getByTestId("course-card");
if (await cards.count() !== 3) throw new Error(`Expected exactly 3 course cards, got ${await cards.count()}`);
const chakraIdByLabel = {
  海底轮: "root",
  生殖轮: "sacral",
  太阳神经丛: "solar_plexus",
  心轮: "heart",
  喉轮: "throat",
  眉心轮: "third_eye",
  顶轮: "crown",
};
const primaryChakraLabel = await page.locator(".energy-facets > span").nth(2).locator("strong").textContent();
const primaryChakraId = chakraIdByLabel[primaryChakraLabel?.trim()];
if (primaryChakraId !== "solar_plexus") {
  throw new Error(`Expected the recommendation regression fixture to resolve to solar_plexus, got ${primaryChakraId}`);
}
const primaryPoolIds = new Set(activeCatalogCourses
  .filter((course) => course.chakra_tags.includes(primaryChakraId))
  .map((course) => course.course_id));
const assertPrimaryChakraBatch = async () => {
  const courseIds = await cards.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-course-id")));
  if (courseIds.length !== 3 || new Set(courseIds).size !== 3) {
    throw new Error(`Expected three unique courses in a batch, got ${courseIds.join(", ")}`);
  }
  const unrelated = courseIds.find((id) => !id || !primaryPoolIds.has(id));
  if (unrelated) {
    throw new Error(`Course ${unrelated} does not match displayed primary chakra ${primaryChakraId}`);
  }
  return courseIds;
};
const firstCourseIds = await assertPrimaryChakraBatch();
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
const facetFooterTops = await page.locator(".energy-facets em").evaluateAll((elements) => (
  elements.map((element) => element.getBoundingClientRect().top)
));
if (Math.max(...facetFooterTops) - Math.min(...facetFooterTops) > 1) {
  throw new Error(`Expected aligned facet footers, got ${facetFooterTops.join(", ")}`);
}
const savedAction = resultScreen.getByRole("button", { name: /^查看已收藏/ });
const savedActionBox = await savedAction.boundingBox();
const refreshActionBox = await resultScreen.getByRole("button", { name: "换一批" }).boundingBox();
if (!savedActionBox || Math.abs(savedActionBox.width - savedActionBox.height) > 1 || Math.abs(savedActionBox.width - 52) > 1) {
  throw new Error(`Expected a 52px circular saved action, got ${JSON.stringify(savedActionBox)}`);
}
if (!refreshActionBox || refreshActionBox.width > 280 || Math.abs(refreshActionBox.height - 52) > 1) {
  throw new Error(`Expected a narrower 278 x 52 refresh action, got ${JSON.stringify(refreshActionBox)}`);
}
const reSenseBox = await resultScreen.getByRole("button", { name: "重新感应", exact: true }).boundingBox();
const resultModuleBox = await resultModule.boundingBox();
const bottomActionBuffer = reSenseBox && resultModuleBox
  ? resultModuleBox.y + resultModuleBox.height - (reSenseBox.y + reSenseBox.height)
  : 0;
if (bottomActionBuffer < 70) {
  throw new Error(`Expected at least 70px below re-sense action, got ${bottomActionBuffer}`);
}
const seenCourseIds = new Set(firstCourseIds);
let previousBatchIds = new Set(firstCourseIds);
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
await savedAction.click();
await captureJourneyScreen("favorites-screen", "favorites");
await page.getByTestId("favorites-screen").getByRole("button", { name: /回到今日能量/ }).click();
await resultScreen.waitFor({ state: "visible" });

for (let refreshIndex = 0; refreshIndex < 4; refreshIndex += 1) {
  await page.getByTestId("result-screen").getByRole("button", { name: "换一批" }).click();
  await page.waitForTimeout(150);
  const refreshedIds = await assertPrimaryChakraBatch();
  const immediateRepeat = refreshedIds.find((id) => id && previousBatchIds.has(id));
  if (immediateRepeat) throw new Error(`Course ${immediateRepeat} repeated from the immediately previous batch`);
  refreshedIds.forEach((id) => { if (id) seenCourseIds.add(id); });
  previousBatchIds = new Set(refreshedIds);
}
const persistedCourseHistory = await page.evaluate(() => JSON.parse(
  window.localStorage.getItem("haf-journey-recent-courses:2025-validation-v1") ?? "[]",
));
if (persistedCourseHistory.length !== primaryPoolIds.size || seenCourseIds.size !== primaryPoolIds.size) {
  throw new Error(`Expected all ${primaryPoolIds.size} primary-chakra courses to be exhausted before recycling, got ${seenCourseIds.size} seen and ${persistedCourseHistory.length} persisted`);
}
await page.getByTestId("result-screen").getByRole("button", { name: "重新感应", exact: true }).click();
await page.getByTestId("compass-screen").waitFor({ state: "visible" });
await page.getByTestId("compass-screen").getByRole("button", { name: "完成感应" }).click();
await page.getByTestId("result-screen").waitFor({ state: "visible", timeout: 12_000 });
await page.getByTestId("result-screen").getByRole("button", { name: "修改档案" }).click();
await page.getByTestId("profile-screen").last().waitFor({ state: "visible" });
const returnPage = await context.newPage();
await returnPage.addInitScript(() => {
  window.localStorage.setItem("haf-journey-onboarded", JSON.stringify(true));
});
await returnPage.goto(baseURL, { waitUntil: "domcontentloaded" });
await captureJourneyScreen("return-screen", "return", returnPage);
await returnPage.close();
const reducedContext = await browser.newContext({
  viewport: { width: 393, height: 852 },
  reducedMotion: "reduce",
});
const reducedPage = await reducedContext.newPage();
await reducedPage.addInitScript(() => {
  window.localStorage.setItem("haf-journey-onboarded", JSON.stringify(false));
});
await reducedPage.goto(baseURL, { waitUntil: "domcontentloaded" });
await reducedPage.getByTestId("loading-screen").waitFor({ state: "visible" });
const reducedAnimationName = await reducedPage.locator(".ambient-flow-primary").evaluate((element) => (
  window.getComputedStyle(element).animationName
));
if (reducedAnimationName !== "none") {
  throw new Error(`Expected background motion to stop for reduced-motion users, got ${reducedAnimationName}`);
}
await reducedContext.close();

const summary = {
  baseURL,
  viewport: { width: 1400, height: 1200, deviceScaleFactor: 1 },
  deviceScreen: deviceBox,
  module: moduleBox,
  screenshots,
  sharedBackgrounds,
  interactions: {
    animatedBackground: initialBackgroundTransform !== animatedBackgroundTransform ? "passed" : "failed",
    reducedMotion: reducedAnimationName === "none" ? "passed" : "failed",
    profileControls: "passed",
    primaryCTA: "passed",
    carousel: railScrollLeft > 0 ? "passed" : "failed",
    favorite: "passed",
    favoritesEntry: "passed",
    refresh: seenCourseIds.size === primaryPoolIds.size ? "primary-matched-without-consecutive-batch-repeats" : "failed",
    primaryChakra: primaryChakraId,
    primaryChakraPoolSize: primaryPoolIds.size,
    persistedCourseHistory: persistedCourseHistory.length,
    reSense: "passed",
    editProfile: "passed",
    compactCardHeight: firstCardBox.height,
    roundedCardClipping: cardClipping,
    facetFooterAlignment: facetFooterTops,
    savedAction: savedActionBox,
    refreshAction: refreshActionBox,
    bottomActionBuffer,
  },
  consoleErrors,
};

await writeFile(path.join(outputDir, "capture-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
await browser.close();
console.log(JSON.stringify(summary, null, 2));
