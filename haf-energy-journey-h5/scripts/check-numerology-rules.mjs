import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), "utf8"));
const themes = await readJson("skills/haf-numerology/references/number-themes.json");
const synthesis = await readJson("skills/haf-energy-synthesis/references/synthesis-model.json");
const wordModel = await readJson("skills/haf-chakra-energy/references/chakra-word-model.json");

const expectedDailyDisplays = {
  1: "开始",
  2: "连接",
  3: "表达",
  4: "安定",
  5: "变化",
  6: "关怀",
  7: "内省",
  8: "实现",
  9: "完成",
};

const sensingWords = new Set(
  Object.values(wordModel.chakras).flatMap((chakra) => chakra.words.map((word) => word.display)),
);

function reduceNumber(value, preserveMasters = false) {
  let result = Math.abs(value);
  while (result > 9) {
    if (preserveMasters && [11, 22, 33].includes(result)) return result;
    result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return result || 1;
}

function digitSum(value) {
  return String(value).replace(/\D/g, "").split("").reduce((sum, digit) => sum + Number(digit), 0);
}

function calculate({ year, month, day }, target) {
  const lifePath = reduceNumber(
    reduceNumber(month, true) + reduceNumber(day, true) + reduceNumber(year, true),
    true,
  );
  const personalYear = reduceNumber(month + day + digitSum(target.year));
  const personalMonth = reduceNumber(personalYear + target.month);
  const personalDay = reduceNumber(personalMonth + target.day);
  return { lifePath, personalDay };
}

for (const [number, display] of Object.entries(expectedDailyDisplays)) {
  if (themes.numbers[number]?.keywords?.[0] !== display) {
    throw new Error(`Personal Day ${number} must display ${display}.`);
  }
  if (!synthesis.number_keyword[number]) {
    throw new Error(`Personal Day ${number} has no synthesis keyword.`);
  }
  if (sensingWords.has(display)) {
    throw new Error(`Personal Day ${number} duplicates sensing word ${display}.`);
  }
}

if (new Set(Object.values(expectedDailyDisplays)).size !== 9) {
  throw new Error("Personal Day display words must be unique.");
}

const lifePathExample = calculate(
  { year: 1990, month: 8, day: 12 },
  { year: 2020, month: 3, day: 16 },
);
if (lifePathExample.lifePath !== 3) throw new Error("Life Path golden example must resolve to 3.");

const personalDayExample = calculate(
  { year: 1990, month: 10, day: 12 },
  { year: 2020, month: 3, day: 16 },
);
if (personalDayExample.personalDay !== 9) throw new Error("Personal Day golden example must resolve to 9.");

process.stdout.write("Numerology formulas and display rules passed for Personal Day 1-9.\n");
