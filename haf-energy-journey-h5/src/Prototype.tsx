import {
  BookmarkIcon,
  CaretDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross1Icon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { Carousel, FlowStack, KeyboardInput, MobileScroll, useFlow, type FlowScreen } from "./mobile";
import numberThemesSource from "../skills/haf-numerology/references/number-themes.json";
import chakraWordModelSource from "../skills/haf-chakra-energy/references/chakra-word-model.json";
import synthesisModelSource from "../skills/haf-energy-synthesis/references/synthesis-model.json";
import historicalCatalogSource from "../qa/course-recall-2025/catalog-normalized.json";

type Point = { x: number; y: number };
type ChakraId = "root" | "sacral" | "solar_plexus" | "heart" | "throat" | "third_eye" | "crown";
type EnergyPole = "inward" | "outward" | "calm" | "active";
type KeywordId = "begin" | "connect" | "express" | "ground" | "flow" | "care" | "insight" | "strength" | "release" | "integrate";
type Profile = {
  birth: { year: number; month: number; day: number };
  birthTime: string;
  gender: string;
  city: string;
};
type Course = {
  id: string;
  title: string;
  dateLabel: string;
  meta: string;
  fit: string;
  image: string;
};
type ChakraReading = {
  id: ChakraId;
  zh: string;
  themes: string[];
  score: number;
};
type SensingWord = { id: string; display: string; keyword_id: KeywordId };
type EnergyInsight = {
  dailyThemeId: KeywordId;
  dailyTheme: { display: string; guidance: string; reflection_prompt: string };
  keywordId: KeywordId;
  keyword: { display: string; guidance: string; reflection_prompt: string };
  keywordCandidates: KeywordId[];
  selectedWord: SensingWord;
  primaryChakra: ChakraReading;
  secondaryChakra: ChakraReading;
  resonance: {
    cell: { column: number; row: number };
    chakraId: ChakraId;
  };
  intensity: { id: "soft" | "clear" | "strong"; label: string };
  compositeTitle: string;
  compositeLine: string;
  energySummary: string;
  chakraSummary: string;
};
type CatalogCourse = {
  course_id: string;
  title: string;
  short_description: string;
  fit_statement: string;
  status: string;
  format: string;
  format_label: string;
  duration_min: number;
  intensity: "low" | "medium" | "high";
  chakra_tags: ChakraId[];
  energy_poles: EnergyPole[];
  keyword_tags: KeywordId[];
  numerology_tags?: number[];
  cover_asset: string;
  sessions?: Array<{
    session_id: string;
    begin_at: string;
    end_at: string;
    location: string;
  }>;
};
type JourneyState = {
  profile: Profile;
  setProfile: (profile: Profile) => void;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  point: Point;
  setPoint: (point: Point) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  lifePath: number;
  dayNumber: number;
  dateKey: string;
};

const JourneyContext = createContext<JourneyState | null>(null);

const defaultProfile: Profile = {
  birth: { year: 1992, month: 8, day: 7 },
  birthTime: "不确定",
  gender: "女性",
  city: "上海",
};
const birthTimeOptions = ["早上", "中午", "下午", "晚上", "不确定"];

function normalizeBirthTime(value: string) {
  return birthTimeOptions.includes(value) ? value : "不确定";
}

const numberThemes = numberThemesSource.numbers as Record<string, { keywords: string[]; gentle_prompt: string }>;
const chakraWordModel = chakraWordModelSource as unknown as {
  model_version: string;
  field_version: string;
  field: { columns: number; rows: number; chakra_stride: number; row_stride: number };
  weights: { selected_word: number; life_path: number; personal_day: number };
  score: { floor: number; span: number };
  chakra_order: ChakraId[];
  chakras: Record<ChakraId, { zh: string; themes: string[]; words: SensingWord[] }>;
  number_affinity: Record<string, Record<ChakraId, number>>;
};
const synthesisModel = synthesisModelSource as typeof synthesisModelSource & {
  number_keyword: Record<string, KeywordId>;
  chakra_keyword: Record<ChakraId, KeywordId>;
  keywords: Record<KeywordId, { display: string; guidance: string; reflection_prompt: string }>;
};
const numberToKeyword: Record<number, KeywordId> = {
  1: "begin",
  2: "connect",
  3: "express",
  4: "ground",
  5: "flow",
  6: "care",
  7: "insight",
  8: "strength",
  9: "release",
};
const fitStatementByFormat: Record<string, string> = {
  meditation: "用安静与觉察，把注意力带回此刻",
  sound: "以声音与聆听为入口，让感受拥有被听见的空间",
  movement: "通过身体练习，让此刻的能量有一个具体出口",
  breathwork: "从呼吸开始，为身体与注意力留出缓冲",
  creative: "借由创作与感官体验，让还未成形的感受自然出现",
  dialogue: "通过对话与互动，重新看见自己在关系中的真实需要",
  culture: "从文化与传统经验中，找到一条可以安放当下的线索",
  lecture: "用清晰的主题与方法，帮助你重新整理此刻关注的问题",
  guided_practice: "跟随一段具体练习，把此刻的线索落回体验",
};
const experienceSubjectByFormat: Record<string, string> = {
  meditation: "这段冥想练习",
  sound: "这场声音体验",
  movement: "这场身体练习",
  breathwork: "这段呼吸练习",
  creative: "这场创作体验",
  dialogue: "这场对话体验",
  culture: "这场文化体验",
  lecture: "这场主题分享",
  guided_practice: "这段引导练习",
};
const historicalValidationAsOf = new Date("2025-10-24T08:00:00+08:00");
const historicalCourses = historicalCatalogSource.courses.map((course) => ({
  course_id: course.course_id,
  title: course.title,
  short_description: course.short_description,
  fit_statement: fitStatementByFormat[course.format] ?? fitStatementByFormat.guided_practice,
  status: course.status,
  format: course.format,
  format_label: course.format_label,
  duration_min: course.duration_min,
  intensity: course.intensity,
  chakra_tags: course.chakra_tags,
  energy_poles: course.energy_poles,
  numerology_tags: course.numerology_tags,
  keyword_tags: course.numerology_tags.map((number) => numberToKeyword[number]).filter(Boolean),
  cover_asset: course.cover_asset,
  sessions: course.sessions.map((session) => ({
    session_id: session.session_id,
    begin_at: session.begin_at,
    end_at: session.end_at,
    location: session.location,
  })),
})) as CatalogCourse[];
const activeCourses = historicalCourses.filter((course) => (
  course.status === "published"
  && (course.sessions ?? []).some((session) => (
    Date.parse(`${session.end_at.replace(" ", "T")}+08:00`) > historicalValidationAsOf.getTime()
  ))
));
const favoriteStorageKey = "haf-journey-favorites:2025-validation-v1";
const recentCourseStorageKey = "haf-journey-recent-courses:2025-validation-v1";
const analyticsEndpoint = import.meta.env.VITE_HAF_ANALYTICS_ENDPOINT ?? "http://localhost:4174/api/events";
const readingEndpoint = import.meta.env.VITE_HAF_READING_ENDPOINT ?? "http://localhost:4174/api/energy-reading";
const greetingEndpoint = import.meta.env.VITE_HAF_GREETING_ENDPOINT ?? "http://localhost:4174/api/daily-greeting";
const aiRequestTimeoutMs = 6000;
const pendingGreetingRequests = new Map<string, Promise<string>>();
const pendingReadingRequests = new Map<string, Promise<string>>();

const dailyGreetings: Record<number, { theme: string; headline: string; body: string }> = {
  1: { theme: "新的开始", headline: "今天，有一束新的力量正在靠近。", body: "不必准备得完美，先听听自己想从哪里开始。" },
  2: { theme: "温柔连接", headline: "今天，给感受多一点被听见的空间。", body: "慢一点，也许你会看见自己真正想靠近的关系。" },
  3: { theme: "真实表达", headline: "今天，有些感受正在寻找自己的声音。", body: "不急着说得完整，先让它被你自己听见。" },
  4: { theme: "安定落地", headline: "今天，先让自己回到脚下这一步。", body: "当身体有了支撑，心里的方向会更清楚一些。" },
  5: { theme: "自在流动", headline: "今天，允许新的可能轻轻松动边界。", body: "不必马上决定，让感受先自由地流过。" },
  6: { theme: "留给自己", headline: "今天，也把一份温柔留给自己。", body: "在回应外界之前，先听听你真正需要什么。" },
  7: { theme: "安静照见", headline: "今天，答案可能藏在更安静的地方。", body: "放慢一点，让重要的线索自己浮现。" },
  8: { theme: "清晰力量", headline: "今天，把能量收回一个清晰的选择。", body: "不必做很多，只需站稳真正重要的那一步。" },
  9: { theme: "温柔放下", headline: "今天，为已经完成的部分留一点空白。", body: "轻轻放下，新的方向才有空间慢慢出现。" },
};

const dailyBodyVariants: Record<number, string[]> = {
  1: ["不必准备得完美，先听听自己想从哪里开始。", "一个很小的决定，也可能替今天打开新的入口。", "先靠近真正想做的事，答案会在第一步之后出现。"],
  2: ["慢一点，也许你会看见自己真正想靠近的关系。", "温柔不是退让，而是让彼此都拥有真实的位置。", "今天适合先听懂感受，再决定要不要回应。"],
  3: ["不急着说得完整，先让它被你自己听见。", "真正重要的话，不需要一次说得漂亮。", "先承认自己在意什么，声音会慢慢变得清楚。"],
  4: ["当身体有了支撑，心里的方向会更清楚一些。", "先整理眼前的一小块空间，也是在整理内心。", "稳定不是停下，而是让力量重新回到脚下。"],
  5: ["不必马上决定，让感受先自由地流过。", "变化正在松动旧边界，先看看它想带你去哪里。", "今天可以少一点控制，多给偶然留一点位置。"],
  6: ["在回应外界之前，先听听你真正需要什么。", "照顾自己并不自私，它让你的给予不再透支。", "今天先把一份耐心留给那个容易被忽略的自己。"],
  7: ["放慢一点，让重要的线索自己浮现。", "不是每个问题都需要立刻回答，安静也在工作。", "当外界的声音变轻，你会更容易认出自己的答案。"],
  8: ["不必做很多，只需站稳真正重要的那一步。", "把力气收回一个选择，比同时证明所有事更有用。", "清晰的边界，会让真正值得的事情更靠近。"],
  9: ["轻轻放下，新的方向才有空间慢慢出现。", "有些结束不是失去，而是提醒你已经走完这一段。", "今天不必抓紧答案，先为下一次开始腾出位置。"],
};

const dailyAngles = ["行动", "关系", "身体", "边界", "情绪", "休息"];

const momentReadings: Record<string, string[]> = {
  inward_calm: [
    "你并非没有答案，只是还需要一点不被催促的安静。",
    "你正在向内收回注意，不必急着给感受一个结论。",
    "安静不是停住，而是在分辨什么才真正属于你。",
  ],
  inward_active: [
    "你心里已有方向，犹豫只是因为它还没有被说清。",
    "一股新的意愿正在成形，先别让外界替你命名。",
    "你已经感到变化，只差一次对自己诚实的确认。",
  ],
  outward_calm: [
    "你想靠近，也在确认自己能否被稳稳接住。",
    "你愿意靠近，但更需要一种不消耗自己的连接。",
    "关系正在回应你，前提是你不再隐藏真实需要。",
  ],
  outward_active: [
    "你已准备向前，只需分清热望与外界的期待。",
    "行动的力量已经出现，别让急切替你做决定。",
    "你想向前，也需要确认这一步确实来自自己。",
  ],
};

const themeCounsel: Record<KeywordId, string[]> = {
  begin: ["先做最小的一步，方向会在行动里变清楚。", "不用等准备完整，先回应那个最真实的念头。", "今天只选一个开始，让它替你打开后面的路。"],
  connect: ["先说清真实需要，舒服的关系不必靠迎合维持。", "靠近之前先站稳自己，连接才不会变成消耗。", "把期待换成清楚的请求，关系会更有呼吸感。"],
  express: ["先承认真正在意的，再说出最重要的那一句。", "不必解释所有感受，先说出最诚实的部分。", "让声音先经过内心，再决定怎样被别人听见。"],
  ground: ["先照顾身体与秩序，稳定会替你筛出轻重。", "把注意放回手边的小事，心会慢慢找到支点。", "先让身体感到安全，再处理那些复杂的答案。"],
  flow: ["暂时别急着定论，让变化先带来新的线索。", "允许计划松一点，新的可能才有位置出现。", "不是所有变化都要控制，先跟随最自然的方向。"],
  care: ["把照顾自己的位置排回来，你无需靠耗尽证明在意。", "先确认自己还有余力，再决定要给予多少。", "今天的温柔也该包括你自己，不必总排在最后。"],
  insight: ["先别急着回答，重要的线索正在安静里浮现。", "把问题放一会儿，真正的答案会留下来。", "分清直觉与担心，你会看见更简单的方向。"],
  strength: ["把力量收回一个清晰选择，不必同时证明所有事。", "真正的坚定不必用力，站稳自己的选择就好。", "少回应一点噪音，把力气留给真正重要的事。"],
  release: ["放下已经完成的部分，是在给新方向腾位置。", "你不必继续证明这段经历有意义，它已经完成。", "松开并不等于失去，而是让自己重新拥有选择。"],
  integrate: ["先让经历归位，再决定下一步，你不必立刻想明白。", "把矛盾放在一起看，它们可能都在保护你。", "先消化已经发生的事，再为下一步命名。"],
};

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function stableIndex(seed: string, length: number) {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return Math.abs(hash >>> 0) % Math.max(1, length);
}

function chooseStable<T>(items: T[], seed: string) {
  return items[stableIndex(seed, items.length)];
}

function catalogDateParts(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4],
    minute: match[5],
  };
}

function formatCourseDate(value: string) {
  const parts = catalogDateParts(value);
  if (!parts) return "日期待定";
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()];
  return `${parts.month}月${parts.day}日 ${weekday}`;
}

function formatCourseTimeRange(beginAt: string, endAt: string) {
  const begin = catalogDateParts(beginAt);
  const end = catalogDateParts(endAt);
  if (!begin || !end) return "时间待定";
  return `${begin.hour}:${begin.minute}–${end.hour}:${end.minute}`;
}

function currentCourseSession(course: CatalogCourse) {
  return [...(course.sessions ?? [])]
    .filter((session) => Date.parse(`${session.end_at.replace(" ", "T")}+08:00`) > historicalValidationAsOf.getTime())
    .sort((a, b) => a.begin_at.localeCompare(b.begin_at))[0];
}

function savedCourseSchedule(course: CatalogCourse) {
  const session = currentCourseSession(course);
  return session
    ? `${formatCourseDate(session.begin_at)} · ${formatCourseTimeRange(session.begin_at, session.end_at)}`
    : "日期待定 · 时间待定";
}

function getAnalyticsUserId() {
  const storageKey = "haf-journey-analytics-user";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const next = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `haf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(storageKey, next);
  return next;
}

function trackEnergyEvent(eventName: "energy_module_viewed" | "energy_course_favorited", payload: Record<string, unknown> = {}) {
  const event = {
    event_id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    event_name: eventName,
    user_id: getAnalyticsUserId(),
    event_time: new Date().toISOString(),
    source: "energy_journey",
    ...payload,
  };
  void fetch(analyticsEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => undefined);
}

function reduceNumber(value: number, preserveMasters = false) {
  let result = Math.abs(value);
  while (result > 9) {
    if (preserveMasters && [11, 22, 33].includes(result)) return result;
    result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
  }
  return result || 1;
}

function digitSum(value: number | string) {
  return String(value).replace(/\D/g, "").split("").reduce((sum, digit) => sum + Number(digit), 0);
}

function calculateNumerology(birth: Profile["birth"], today: Date) {
  const lifePath = reduceNumber(
    reduceNumber(birth.month, true) + reduceNumber(birth.day, true) + reduceNumber(birth.year, true),
    true,
  );
  const personalYear = reduceNumber(birth.month + birth.day + digitSum(today.getFullYear()));
  const personalMonth = reduceNumber(personalYear + today.getMonth() + 1);
  const personalDay = reduceNumber(personalMonth + today.getDate());
  return { lifePath, personalDay };
}

function sensingWordForPoint(point: Point) {
  const columns = chakraWordModel.field.columns;
  const rows = chakraWordModel.field.rows;
  const column = Math.min(columns - 1, Math.max(0, Math.floor(((point.x + 1) / 2) * columns)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((point.y + 1) / 2) * rows)));
  const chakraIndex = (column * chakraWordModel.field.chakra_stride + row * chakraWordModel.field.row_stride) % chakraWordModel.chakra_order.length;
  const chakraId = chakraWordModel.chakra_order[chakraIndex];
  return { column, row, chakraId, word: chakraWordModel.chakras[chakraId].words[row] };
}

function projectChakras(point: Point, lifePath: number, personalDay: number) {
  const selected = sensingWordForPoint(point);
  const lifeAffinity = chakraWordModel.number_affinity[String(lifePath)] ?? chakraWordModel.number_affinity[String(reduceNumber(lifePath))];
  const dayAffinity = chakraWordModel.number_affinity[String(personalDay)];
  const chakras = chakraWordModel.chakra_order.map((id) => {
    const chakra = chakraWordModel.chakras[id];
    const raw = chakraWordModel.weights.selected_word * (id === selected.chakraId ? 1 : 0)
      + chakraWordModel.weights.life_path * lifeAffinity[id]
      + chakraWordModel.weights.personal_day * dayAffinity[id];
    return {
      id,
      zh: chakra.zh,
      themes: chakra.themes,
      score: Math.round(chakraWordModel.score.floor + chakraWordModel.score.span * raw),
      raw,
    };
  }).sort((a, b) => b.raw - a.raw || a.id.localeCompare(b.id));
  return { selected, primary: chakras[0], secondary: chakras[1] };
}

function synthesizeEnergy(point: Point, lifePath: number, personalDay: number, dateKey: string): EnergyInsight {
  const projection = projectChakras(point, lifePath, personalDay);
  const dailyThemeId = synthesisModel.number_keyword[String(personalDay)];
  const keywordId = projection.selected.word.keyword_id;
  const keywordCandidates = Array.from(new Set<KeywordId>([
    keywordId,
    synthesisModel.chakra_keyword[projection.primary.id],
    synthesisModel.chakra_keyword[projection.secondary.id],
    synthesisModel.number_keyword[String(lifePath)] ?? synthesisModel.number_keyword[String(reduceNumber(lifePath))],
  ])).filter((id) => id !== dailyThemeId || id === keywordId);
  const canonicalKeyword = synthesisModel.keywords[keywordId];
  const keyword = { ...canonicalKeyword, display: projection.selected.word.display };
  const dailyTheme = synthesisModel.keywords[dailyThemeId];
  const numberTheme = numberThemes[String(personalDay)];
  const intensityByChakra: Record<ChakraId, EnergyInsight["intensity"]> = {
    root: { id: "soft", label: "轻柔" },
    sacral: { id: "clear", label: "清晰" },
    solar_plexus: { id: "strong", label: "鲜明" },
    heart: { id: "clear", label: "清晰" },
    throat: { id: "clear", label: "清晰" },
    third_eye: { id: "soft", label: "轻柔" },
    crown: { id: "soft", label: "轻柔" },
  };
  const energySummary = `今天的主旋律是“${dailyTheme.display}”，你亲手停在“${keyword.display}”；这个选择让${projection.primary.zh}成为此刻最清晰的线索。`;
  return {
    dailyThemeId,
    dailyTheme,
    keywordId,
    keyword,
    keywordCandidates,
    selectedWord: projection.selected.word,
    primaryChakra: projection.primary,
    secondaryChakra: projection.secondary,
    resonance: {
      cell: { column: projection.selected.column, row: projection.selected.row },
      chakraId: projection.selected.chakraId,
    },
    intensity: intensityByChakra[projection.primary.id],
    compositeTitle: `${keyword.display} · ${dailyTheme.display}`,
    compositeLine: `从你选中的“${keyword.display}”出发，靠近今天的“${dailyTheme.display}”。`,
    energySummary,
    chakraSummary: `“${keyword.display}”对应${projection.primary.zh}的${projection.primary.themes.slice(0, 2).join("与")}；${projection.secondary.zh}作为数字线索，在一旁提醒你留意${projection.secondary.themes[0]}。${numberTheme?.gentle_prompt ?? ""}`,
  };
}

type FitReasonMode = "keyword" | "numerology" | "chakra" | "resonance" | "practice";

function buildCourseFitReason(
  course: CatalogCourse,
  insight: EnergyInsight,
  index: number,
  lifePath: number,
  dayNumber: number,
  dateKey: string,
  usedModes: Set<FitReasonMode>,
) {
  const matchedChakra = course.chakra_tags.includes(insight.primaryChakra.id)
    ? insight.primaryChakra
    : course.chakra_tags.includes(insight.secondaryChakra.id)
      ? insight.secondaryChakra
      : null;
  const matchesNumerology = Boolean(
    course.numerology_tags?.includes(dayNumber)
    || course.numerology_tags?.includes(reduceNumber(lifePath)),
  );
  const validModes: Record<FitReasonMode, boolean> = {
    keyword: course.keyword_tags.includes(insight.keywordId),
    numerology: matchesNumerology,
    chakra: Boolean(matchedChakra),
    resonance: true,
    practice: true,
  };
  const modeOrders: FitReasonMode[][] = [
    ["keyword", "numerology", "chakra", "resonance", "practice"],
    ["chakra", "keyword", "resonance", "numerology", "practice"],
    ["resonance", "keyword", "practice", "chakra", "numerology"],
  ];
  const orderedModes = modeOrders[index] ?? modeOrders[2];
  const mode = orderedModes.find((candidate) => validModes[candidate] && !usedModes.has(candidate))
    ?? orderedModes.find((candidate) => validModes[candidate])
    ?? "practice";
  usedModes.add(mode);

  const experience = experienceSubjectByFormat[course.format] ?? `这场${course.format_label}`;
  const seed = `${dateKey}:${course.course_id}:${insight.keywordId}:${mode}`;
  if (mode === "keyword") {
    return chooseStable([
      `你停下来的“${insight.keyword.display}”也出现在这场体验的线索里；${experience}让这份回应有一个具体入口。`,
      `此刻浮现的“${insight.keyword.display}”与${experience}彼此呼应，可以先收藏，在合适的时候进入。`,
      `顺着你感应到的“${insight.keyword.display}”，${experience}提供了一条更具体的体验路径。`,
    ], seed);
  }
  if (mode === "numerology") {
    return chooseStable([
      `此刻的“${insight.dailyTheme.display}”需要一个具体入口；${experience}让它先变得可被感知。`,
      `“${insight.dailyTheme.display}”是此刻更靠近你的线索，${experience}适合把模糊感受变得具体。`,
      `顺着此刻的“${insight.dailyTheme.display}”，${experience}值得先被收藏，在合适的时候再进入。`,
    ], seed);
  }
  if (mode === "chakra" && matchedChakra) {
    const chakraTheme = matchedChakra.themes[0];
    return chooseStable([
      `${matchedChakra.zh}此刻更靠近“${chakraTheme}”；${experience}提供一个与之呼应的入口。`,
      `你此刻更需要关照${chakraTheme}，${experience}与${matchedChakra.zh}的线索相互照应。`,
      `当${matchedChakra.zh}指向${chakraTheme}，${experience}能让注意力落在更具体的感受上。`,
    ], seed);
  }
  if (mode === "resonance") {
    return chooseStable([
      `你亲手停在“${insight.keyword.display}”，${experience}为这份当下共鸣提供一个具体入口。`,
      `“${insight.keyword.display}”是你自己选中的线索；${experience}让它可以被继续感受。`,
      `顺着你停下来的“${insight.keyword.display}”，${experience}保留了一条自然进入的路径。`,
    ], seed);
  }
  return chooseStable([
    `${experience}的投入节奏与你此刻接近，可以先收藏，在合适的时候进入。`,
    `如果只选一个不费力的入口，${experience}更接近你此刻可投入的状态。`,
    `此刻不需要马上行动，${experience}可以先成为一条为未来保留的路径。`,
  ], seed);
}

function recommendCourses(
  insight: EnergyInsight,
  recentIds: Set<string>,
  lifePath: number,
  dayNumber: number,
  dateKey: string,
): Course[] {
  const intensityValue = { low: 0, medium: 0.5, high: 1 } as const;
  const targetIntensity = insight.intensity.id === "strong" ? 1 : insight.intensity.id === "clear" ? 0.5 : 0;
  const targetDuration = targetIntensity === 1 ? 90 : targetIntensity === 0.5 ? 60 : 30;
  const primaryChakraCourses = activeCourses.filter((course) => (
    course.chakra_tags.includes(insight.primaryChakra.id)
  ));
  const recentCourseIds = [...recentIds];
  const lastShownIds = new Set(recentCourseIds.slice(-3));
  const freshCourses = primaryChakraCourses.filter((course) => !recentIds.has(course.course_id));
  const recentOrder = new Map([...recentIds].map((id, index) => [id, index]));
  const rolloverCourses = primaryChakraCourses
    .filter((course) => recentIds.has(course.course_id) && !lastShownIds.has(course.course_id))
    .sort((a, b) => (recentOrder.get(a.course_id) ?? 0) - (recentOrder.get(b.course_id) ?? 0));
  const immediateRepeatCourses = primaryChakraCourses.filter((course) => lastShownIds.has(course.course_id));
  const nonImmediateCandidates = [...freshCourses, ...rolloverCourses];
  const candidateCourses = freshCourses.length >= 3
    ? freshCourses
    : nonImmediateCandidates.length >= 3
      ? nonImmediateCandidates
      : [...nonImmediateCandidates, ...immediateRepeatCourses];
  const scoreCourse = (course: CatalogCourse) => {
    const primaryMatch = course.chakra_tags.includes(insight.primaryChakra.id) ? 1 : 0;
    const secondaryMatch = course.chakra_tags.includes(insight.secondaryChakra.id) ? 1 : 0;
    const chakraScore = 0.7 * primaryMatch + 0.3 * secondaryMatch;
    const keywordScore = Math.max(0, ...course.keyword_tags.map((tag) => {
      if (tag === insight.keywordId) return 1;
      const index = insight.keywordCandidates.slice(1, 3).indexOf(tag);
      return index === 0 ? 0.5 : index === 1 ? 0.25 : 0;
    }));
    const numerologyScore = course.numerology_tags?.length
      ? 0.75 * (course.numerology_tags.includes(dayNumber) ? 1 : 0)
        + 0.25 * (course.numerology_tags.includes(reduceNumber(lifePath)) ? 1 : 0)
      : course.keyword_tags.includes(insight.dailyThemeId) ? 0.75 : 0;
    const intensityFit = 1 - Math.abs(intensityValue[course.intensity] - targetIntensity);
    const durationFit = Math.max(0, 1 - Math.abs(course.duration_min - targetDuration) / Math.max(targetDuration, 12));
    const practiceFit = 0.6 * intensityFit + 0.4 * durationFit;
    const recencyFit = recentIds.has(course.course_id) ? 0 : 1;
    return 0.5 * chakraScore + 0.2 * keywordScore + 0.1 * numerologyScore + 0.1 * practiceFit + 0.1 * recencyFit;
  };
  const candidates = candidateCourses.map((course) => ({ course, score: scoreCourse(course) }));
  const selected: CatalogCourse[] = [];
  while (selected.length < 2 && candidates.length) {
    const ranked = candidates.map((candidate) => {
      const formatPenalty = selected.some((course) => course.format === candidate.course.format) ? 0.08 : 0;
      const chakraPenalty = selected.some((course) => course.chakra_tags[0] === candidate.course.chakra_tags[0]) ? 0.04 : 0;
      return { ...candidate, adjusted: candidate.score - formatPenalty - chakraPenalty };
    }).sort((a, b) => b.adjusted - a.adjusted || a.course.course_id.localeCompare(b.course.course_id));
    const next = ranked[0].course;
    selected.push(next);
    candidates.splice(candidates.findIndex((candidate) => candidate.course.course_id === next.course_id), 1);
  }
  if (selected.length < 3 && candidates.length) {
    const bestRemainingScore = Math.max(...candidates.map((candidate) => candidate.score));
    const qualified = candidates.filter((candidate) => (
      candidate.score >= Math.max(0.36, bestRemainingScore - 0.24)
    ));
    const freshQualified = qualified.filter((candidate) => !recentIds.has(candidate.course.course_id));
    const explorationPool = (freshQualified.length ? freshQualified : qualified)
      .sort((a, b) => a.course.course_id.localeCompare(b.course.course_id));
    const explorationSeed = [
      dateKey,
      lifePath,
      dayNumber,
      insight.keywordId,
      insight.primaryChakra.id,
      insight.selectedWord.id,
    ].join(":");
    const exploration = chooseStable(explorationPool, explorationSeed);
    if (exploration) selected.push(exploration.course);
  }
  const usedReasonModes = new Set<FitReasonMode>();
  return selected.map((course, index) => {
    const session = currentCourseSession(course);
    const fit = buildCourseFitReason(course, insight, index, lifePath, dayNumber, dateKey, usedReasonModes);
    return {
      id: course.course_id,
      title: course.title,
      dateLabel: session ? formatCourseDate(session.begin_at) : "日期待定",
      meta: session
        ? `${formatCourseTimeRange(session.begin_at, session.end_at)} · ${course.format_label}`
        : `时间待定 · ${course.format_label}`,
      fit,
      image: course.cover_asset,
    };
  });
}

function appendCourseHistory(history: Iterable<string>, courseIds: string[]) {
  const currentIds = new Set(courseIds);
  const next = [...[...history].filter((id) => !currentIds.has(id)), ...courseIds];
  return next.slice(-activeCourses.length);
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

function dailyGreetingCacheKey(dateKey: string, dayNumber: number, lifePath: number) {
  return `haf-daily-ai-greeting:v2:${dateKey}:${dayNumber}:${lifePath}`;
}

function energyReadingCacheKey(dateKey: string, dayNumber: number, insight: EnergyInsight) {
  return `haf-energy-reading:v5:${dateKey}:${dayNumber}:${insight.selectedWord.id}:${insight.primaryChakra.id}:${insight.secondaryChakra.id}`;
}

async function requestJson<T>(endpoint: string, payload: Record<string, unknown>): Promise<T | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), aiRequestTimeoutMs);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    return response.ok ? await response.json() as T : null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

async function prepareDailyGreeting({
  dateKey,
  dayNumber,
  lifePath,
}: {
  dateKey: string;
  dayNumber: number;
  lifePath: number;
}) {
  const dailyTheme = dailyGreetings[dayNumber] ?? dailyGreetings[1];
  const fallback = dailyTheme.headline;
  const cacheKey = dailyGreetingCacheKey(dateKey, dayNumber, lifePath);
  const cached = loadLocal<string | null>(cacheKey, null);
  if (cached) return cached;
  const pending = pendingGreetingRequests.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    const dailyAngle = chooseStable(dailyAngles, `${dateKey}:${getAnalyticsUserId()}:angle`);
    const historyKey = "haf-daily-greeting-history";
    const history = loadLocal<Array<{ date: string; greeting: string }>>(historyKey, []);
    const data = await requestJson<{ greeting?: string }>(greetingEndpoint, {
      user_key: getAnalyticsUserId(),
      date_key: dateKey,
      personal_day_number: dayNumber,
      personal_day_theme: dailyTheme.theme,
      life_path_number: lifePath,
      daily_angle: dailyAngle,
      recent_greetings: history.slice(-30).map((item) => item.greeting),
    });
    const candidate = data?.greeting?.trim();
    const candidateLength = Array.from(candidate ?? "").length;
    const resolved = candidate && candidateLength >= 14 && candidateLength <= 30 ? candidate : fallback;

    // Cache both AI and fallback copy. A failed or timed-out request must not retry
    // after the user has already entered the experience.
    window.localStorage.setItem(cacheKey, JSON.stringify(resolved));
    if (candidate && resolved === candidate) {
      const nextHistory = [...history.filter((item) => item.date !== dateKey), { date: dateKey, greeting: candidate }].slice(-30);
      window.localStorage.setItem(historyKey, JSON.stringify(nextHistory));
    }
    return resolved;
  })();
  pendingGreetingRequests.set(cacheKey, task);
  try {
    return await task;
  } finally {
    if (pendingGreetingRequests.get(cacheKey) === task) pendingGreetingRequests.delete(cacheKey);
  }
}

async function prepareEnergyReading({
  dateKey,
  dayNumber,
  insight,
}: {
  dateKey: string;
  dayNumber: number;
  insight: EnergyInsight;
}) {
  const cacheKey = energyReadingCacheKey(dateKey, dayNumber, insight);
  const cached = loadLocal<string | null>(cacheKey, null);
  if (cached) return cached;
  const pending = pendingReadingRequests.get(cacheKey);
  if (pending) return pending;

  const task = (async () => {
    const data = await requestJson<{ reading?: string }>(readingEndpoint, {
      user_key: getAnalyticsUserId(),
      date_key: dateKey,
      personal_day: dayNumber,
      daily_theme: insight.dailyTheme.display,
      moment_keyword: insight.keyword.display,
      resonance: {
        selected_word_id: insight.selectedWord.id,
        selected_word: insight.selectedWord.display,
        selected_chakra: insight.primaryChakra.zh,
      },
      chakras: {
        primary: { name: insight.primaryChakra.zh, themes: insight.primaryChakra.themes.slice(0, 2) },
        secondary: { name: insight.secondaryChakra.zh, themes: insight.secondaryChakra.themes.slice(0, 2) },
      },
      fallback: insight.energySummary,
    });
    const candidate = data?.reading?.trim();
    const candidateLength = Array.from(candidate ?? "").length;
    const resolved = candidate && candidateLength >= 18 && candidateLength <= 50 ? candidate : insight.energySummary;

    // Persist the resolved copy even when it is local fallback, so the result
    // screen is immutable and never shifts when a late response arrives.
    window.localStorage.setItem(cacheKey, JSON.stringify(resolved));
    return resolved;
  })();
  pendingReadingRequests.set(cacheKey, task);
  try {
    return await task;
  } finally {
    if (pendingReadingRequests.get(cacheKey) === task) pendingReadingRequests.delete(cacheKey);
  }
}

function JourneyProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(() => {
    const savedProfile = loadLocal("haf-journey-profile", defaultProfile);
    return { ...savedProfile, birthTime: normalizeBirthTime(savedProfile.birthTime) };
  });
  const [onboardingComplete, setOnboardingComplete] = useState(() => loadLocal("haf-journey-onboarded", false));
  const [point, setPoint] = useState<Point>({ x: -0.42, y: -0.24 });
  const [favorites, setFavorites] = useState<string[]>(() => loadLocal(favoriteStorageKey, []));
  const moduleViewTracked = useRef(false);
  const today = useMemo(() => new Date(), []);
  const dateKey = useMemo(() => localDateKey(today), [today]);
  const numerology = useMemo(() => calculateNumerology(profile.birth, today), [profile.birth, today]);

  useEffect(() => window.localStorage.setItem("haf-journey-profile", JSON.stringify(profile)), [profile]);
  useEffect(() => window.localStorage.setItem("haf-journey-onboarded", JSON.stringify(onboardingComplete)), [onboardingComplete]);
  useEffect(() => window.localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites)), [favorites]);
  useEffect(() => {
    if (moduleViewTracked.current) return;
    moduleViewTracked.current = true;
    trackEnergyEvent("energy_module_viewed");
  }, []);

  return (
    <JourneyContext.Provider value={{
      profile,
      setProfile,
      onboardingComplete,
      completeOnboarding: () => setOnboardingComplete(true),
      resetOnboarding: () => setOnboardingComplete(false),
      point,
      setPoint,
      favorites,
      toggleFavorite: (id) => {
        const isSaved = favorites.includes(id);
        setFavorites((current) => isSaved ? current.filter((item) => item !== id) : current.includes(id) ? current : [...current, id]);
        if (!isSaved) {
          const course = activeCourses.find((item) => item.course_id === id);
          trackEnergyEvent("energy_course_favorited", { course_id: id, course_title: course?.title ?? id });
        }
      },
      lifePath: numerology.lifePath,
      dayNumber: numerology.personalDay,
      dateKey,
    }}>
      {children}
    </JourneyContext.Provider>
  );
}

function useJourney() {
  const value = useContext(JourneyContext);
  if (!value) throw new Error("JourneyProvider is missing");
  return value;
}

function AmbientEnergy() {
  return (
    <div className="energy-atmosphere" aria-hidden="true">
      <img
        className="ambient-flow ambient-flow-primary"
        src="/assets/haf/visual-refresh/energy-gradient.jpeg"
        alt=""
      />
      <img
        className="ambient-flow ambient-flow-soft"
        src="/assets/haf/visual-refresh/energy-gradient.jpeg"
        alt=""
      />
    </div>
  );
}

function OrbLayers() {
  return (
    <>
      <motion.img
        className="orb-layer orb-halo"
        src="/assets/haf/energy-orb-v2.png"
        alt=""
        animate={{ scale: [1.04, 1.2, 1.08, 1.04], opacity: [0.22, 0.42, 0.29, 0.22] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        className="orb-layer orb-core"
        src="/assets/haf/energy-orb-v2.png"
        alt=""
        animate={{ scale: [1, 0.985, 1.015, 1], rotate: [-1.5, 2.5, 5, -1.5] }}
        transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        className="orb-layer orb-light"
        src="/assets/haf/energy-orb-v2.png"
        alt=""
        animate={{ rotate: [0, 18, 0], scale: [0.98, 1.025, 0.98] }}
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
      />
    </>
  );
}

function EmbeddedScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <MobileScroll className="app-screen journey-screen">
      <main className={`journey-host ${className}`}>
        <section className="journey-module" data-testid="journey-module"><AmbientEnergy />{children}</section>
      </main>
    </MobileScroll>
  );
}

function GlowButton({ children, onClick, quiet = false }: { children: ReactNode; onClick: () => void; quiet?: boolean }) {
  return (
    <button className={quiet ? "quiet-button" : "glow-button"} onClick={onClick}>
      {children}{!quiet && <ChevronRightIcon />}
    </button>
  );
}

function LoadingScreen() {
  const flow = useFlow();
  const { onboardingComplete, dateKey, dayNumber, lifePath } = useJourney();
  useEffect(() => {
    let active = true;
    const contentReady = onboardingComplete
      ? prepareDailyGreeting({ dateKey, dayNumber, lifePath })
      : Promise.resolve();
    void Promise.all([delay(1650), contentReady]).then(() => {
      if (active) flow.replace(makeScreen(onboardingComplete ? "return" : "welcome"));
    });
    return () => { active = false; };
  }, [dateKey, dayNumber, flow, lifePath, onboardingComplete]);

  return (
    <EmbeddedScreen className="loading-host">
      <div className="loading-screen" data-testid="loading-screen">
        <motion.div
          className="energy-orb loading-orb"
          animate={{ scale: [0.86, 1.05, 0.92], rotate: [0, 8, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        ><OrbLayers /></motion.div>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>正在听见今天的能量</motion.span>
        <i><b /></i>
      </div>
    </EmbeddedScreen>
  );
}

function ReturnGreetingScreen() {
  const flow = useFlow();
  const { dayNumber, dateKey, lifePath, profile } = useJourney();
  const todayLabel = useMemo(() => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date()), []);
  const greeting = dailyGreetings[dayNumber] ?? dailyGreetings[1];
  const dailyBody = chooseStable(dailyBodyVariants[dayNumber] ?? dailyBodyVariants[1], `${dateKey}:${profile.birth.year}-${profile.birth.month}-${profile.birth.day}`);
  const dailyGreeting = loadLocal(dailyGreetingCacheKey(dateKey, dayNumber, lifePath), greeting.headline);

  return (
    <EmbeddedScreen className="return-host">
      <div className="return-screen" data-testid="return-screen">
        <motion.div
          className="return-greeting"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.75, ease: "easeOut" }}
        >
          <span>{todayLabel}</span>
          <strong>{dailyGreeting}</strong>
          <i aria-hidden="true" />
          <p>{dailyBody}</p>
        </motion.div>
        <div className="return-action">
          <GlowButton onClick={() => flow.replace(makeScreen("compass"))}>开始今日感应</GlowButton>
          <p className="return-note">每一次靠近自己，都是新的开始。</p>
        </div>
      </div>
    </EmbeddedScreen>
  );
}

function WelcomeScreen() {
  const flow = useFlow();
  return (
    <EmbeddedScreen className="welcome-host">
      <div className="welcome-screen" data-testid="welcome-screen">
        <div className="welcome-copy">
          <small>一次属于你的能量觉察</small>
          <h1>此刻的你，<br />正适合靠近哪一种能量？</h1>
          <p>我们会把你与生俱来的数字线索、今天的宇宙节律，与手指停下的位置放在一起，陪你照见此刻最值得留意的方向。</p>
        </div>
        <div className="welcome-path" aria-label="探索过程">
          <span><em>01</em><strong>天生线索</strong><small>由生日生成</small></span>
          <i aria-hidden="true" />
          <span><em>02</em><strong>此刻感应</strong><small>让手指停下</small></span>
          <i aria-hidden="true" />
          <span><em>03</em><strong>今日回响</strong><small>看见方向</small></span>
        </div>
        <p className="welcome-outcome">你将获得：今日关键词 · 能量解读 · 与你契合的体验</p>
        <div className="privacy-note"><LockClosedIcon /><span>出生资料只用于生成你的能量线索，可随时修改或清除。</span></div>
        <GlowButton onClick={() => flow.push(makeScreen("profile"))}>开启今日探索</GlowButton>
      </div>
    </EmbeddedScreen>
  );
}

function ProfileScreen() {
  const flow = useFlow();
  const { profile, setProfile, completeOnboarding } = useJourney();
  const genderOptions = ["女性", "男性", "不设限"];
  const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
  const adjust = (field: keyof Profile["birth"], amount: number) => {
    const ranges = {
      year: [1936, 2010],
      month: [1, 12],
      day: [1, daysInMonth(profile.birth.year, profile.birth.month)],
    } as const;
    const [minimum, maximum] = ranges[field];
    const current = profile.birth[field];
    const next = current + amount > maximum ? minimum : current + amount < minimum ? maximum : current + amount;
    const birth = { ...profile.birth, [field]: next };
    if (field !== "day") birth.day = Math.min(birth.day, daysInMonth(birth.year, birth.month));
    setProfile({ ...profile, birth });
  };
  const setChoice = (field: "birthTime" | "gender" | "city", value: string) => setProfile({ ...profile, [field]: value });
  const cycleChoice = (field: "birthTime" | "gender", values: string[]) => {
    const current = values.indexOf(profile[field]);
    setChoice(field, values[(current + 1 + values.length) % values.length]);
  };
  const genderLabel = profile.gender === "女性" ? "女" : profile.gender === "男性" ? "男" : "不设限";

  return (
    <EmbeddedScreen className="profile-host">
      <div className="profile-screen" data-testid="profile-screen">
        <button className="visual-back" onClick={() => flow.pop()} aria-label="返回">
          <img src="/assets/haf/visual-refresh/back-chevron.svg" alt="" />
        </button>
        <h1>与世界初见的那一天？</h1>
        <section className="profile-field birth-field" aria-label="出生日期">
          <button className="profile-field-label" type="button" aria-label="选择出生日期">
            出生日期 <CaretDownIcon />
          </button>
          <div className="profile-date-values">
          {(["year", "month", "day"] as const).map((field) => (
            <button key={field} type="button" onClick={() => adjust(field, 1)} aria-label={`${field}增加`}>
              <strong>{profile.birth[field]}</strong>
              <span>{field === "year" ? "年" : field === "month" ? "月" : "日"}</span>
            </button>
          ))}
          </div>
        </section>
        <section className="profile-field profile-time-field">
          <button className="profile-field-label" type="button" onClick={() => cycleChoice("birthTime", birthTimeOptions)}>
            出生时间 <CaretDownIcon />
          </button>
          <button className="profile-single-value profile-time-value" type="button" onClick={() => cycleChoice("birthTime", birthTimeOptions)}>
            {profile.birthTime}
          </button>
        </section>
        <section className="profile-field profile-gender-field">
          <button className="profile-field-label" type="button" onClick={() => cycleChoice("gender", genderOptions)}>
            性别 <CaretDownIcon />
          </button>
          <button className="profile-single-value" type="button" onClick={() => cycleChoice("gender", genderOptions)}>{genderLabel}</button>
        </section>
        <section className="profile-field city-entry">
          <label className="profile-field-label" htmlFor="profile-city">城市 <CaretDownIcon /></label>
          <KeyboardInput
            id="profile-city"
            className="city-input"
            value={profile.city}
            onChange={(event) => setChoice("city", event.target.value)}
            placeholder="请输入城市"
            aria-label="当前城市"
            autoComplete="address-level2"
          />
        </section>
        <GlowButton onClick={() => { completeOnboarding(); flow.push(makeScreen("compass")); }}>开启今日探索</GlowButton>
      </div>
    </EmbeddedScreen>
  );
}

const sensingDimensions: Record<ChakraId, { core: string; tone: string }> = {
  root: { core: "稳定", tone: "#9c3141" },
  sacral: { core: "生命力", tone: "#e47b32" },
  solar_plexus: { core: "行动力", tone: "#e0b344" },
  heart: { core: "关系", tone: "#75b99a" },
  throat: { core: "表达", tone: "#3db7d4" },
  third_eye: { core: "洞察", tone: "#526bd3" },
  crown: { core: "意识", tone: "#9b72d0" },
};

type SensingCursor = {
  x: number;
  y: number;
  xRatio: number;
  yRatio: number;
  pressure: number;
  tone: string;
  sequence: number;
};

function clampSensing(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function toneRgb(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: value >> 16, g: (value >> 8) & 255, b: value & 255 };
}

function SensingRippleCanvas({ cursor, active }: { cursor: SensingCursor; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef(cursor);
  const activeRef = useRef(active);
  const lastSequenceRef = useRef(-1);
  const ripplesRef = useRef<Array<{ x: number; y: number; pressure: number; tone: string; born: number }>>([]);
  const trailRef = useRef<Array<{ x: number; y: number; pressure: number; tone: string; born: number }>>([]);
  const lastRippleAtRef = useRef(0);

  useEffect(() => {
    cursorRef.current = cursor;
    activeRef.current = active;
    if (cursor.sequence === lastSequenceRef.current) return;
    lastSequenceRef.current = cursor.sequence;
    const born = performance.now();
    trailRef.current.push({ x: cursor.x, y: cursor.y, pressure: cursor.pressure, tone: cursor.tone, born });
    if (active && born - lastRippleAtRef.current >= 420) {
      ripplesRef.current.push({ x: cursor.x, y: cursor.y, pressure: cursor.pressure, tone: cursor.tone, born });
      lastRippleAtRef.current = born;
    }
    trailRef.current = trailRef.current.slice(-18);
    ripplesRef.current = ripplesRef.current.slice(-5);
  }, [active, cursor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let lastFrameTime = 0;
    const render = (now: number) => {
      const hasTransientMotion = activeRef.current || trailRef.current.length > 0 || ripplesRef.current.length > 0;
      const frameInterval = hasTransientMotion ? 32 : 250;
      if (now - lastFrameTime < frameInterval) {
        frame = window.requestAnimationFrame(render);
        return;
      }
      lastFrameTime = now;
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, bounds.width, bounds.height);
      context.globalCompositeOperation = "screen";

      const current = cursorRef.current;
      const rgb = toneRgb(current.tone);
      const glowRadius = 74 + current.pressure * 74;
      const glow = context.createRadialGradient(current.x, current.y, 2, current.x, current.y, glowRadius);
      glow.addColorStop(0, `rgba(255,255,255,${activeRef.current ? .36 : .18})`);
      glow.addColorStop(.24, `rgba(${rgb.r},${rgb.g},${rgb.b},${.28 + current.pressure * .18})`);
      glow.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      context.fillStyle = glow;
      context.fillRect(0, 0, bounds.width, bounds.height);

      const visibleTrail = prefersReducedMotion ? [] : trailRef.current.filter((item) => now - item.born < 1200);
      trailRef.current = visibleTrail;
      if (visibleTrail.length > 1) {
        const latest = visibleTrail[visibleTrail.length - 1];
        const latestRgb = toneRgb(latest.tone);
        context.beginPath();
        context.moveTo(visibleTrail[0].x, visibleTrail[0].y);
        for (let index = 1; index < visibleTrail.length; index += 1) {
          const previous = visibleTrail[index - 1];
          const item = visibleTrail[index];
          const middleX = (previous.x + item.x) / 2;
          const middleY = (previous.y + item.y) / 2;
          context.quadraticCurveTo(previous.x, previous.y, middleX, middleY);
        }
        context.lineCap = "round";
        context.lineJoin = "round";
        context.lineWidth = 1.5 + latest.pressure * 4;
        context.strokeStyle = `rgba(${latestRgb.r},${latestRgb.g},${latestRgb.b},.48)`;
        context.shadowColor = `rgba(${latestRgb.r},${latestRgb.g},${latestRgb.b},.8)`;
        context.shadowBlur = 18 + latest.pressure * 22;
        context.stroke();
        context.shadowBlur = 0;
      }

      ripplesRef.current = prefersReducedMotion ? [] : ripplesRef.current.filter((ripple) => now - ripple.born < 950);
      ripplesRef.current.forEach((ripple) => {
        const age = clampSensing((now - ripple.born) / 950, 0, 1);
        context.beginPath();
        context.arc(ripple.x, ripple.y, 14 + age * (42 + ripple.pressure * 34), 0, Math.PI * 2);
        context.lineWidth = .8 + (1 - age) * ripple.pressure * 1.2;
        context.strokeStyle = `rgba(255,255,255,${(1 - age) * (.24 + ripple.pressure * .2)})`;
        context.shadowColor = `rgba(255,255,255,${(1 - age) * .26})`;
        context.shadowBlur = 6 + ripple.pressure * 8;
        context.stroke();
      });
      context.shadowBlur = 0;
      context.globalCompositeOperation = "source-over";
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <canvas ref={canvasRef} className="sensing-ripple-canvas" data-testid="sensing-ripple-canvas" aria-hidden="true" />;
}

function CompassScreen() {
  const flow = useFlow();
  const prefersReducedMotion = useReducedMotion();
  const { point, setPoint, lifePath, dayNumber, dateKey } = useJourney();
  const initialInsight = useMemo(() => synthesizeEnergy(point, lifePath, dayNumber, dateKey), [dateKey, dayNumber, lifePath, point]);
  const [phase, setPhase] = useState<"idle" | "sensing" | "locked">("idle");
  const [currentInsight, setCurrentInsight] = useState(initialInsight);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [cursor, setCursor] = useState<SensingCursor>({
    x: 196,
    y: 448,
    xRatio: (point.x + 1) / 2,
    yRatio: (point.y + 1) / 2,
    pressure: .22,
    tone: sensingDimensions[initialInsight.primaryChakra.id].tone,
    sequence: 0,
  });
  const livePointRef = useRef(point);
  const sessionRef = useRef({ start: 0, lastTime: 0, lastX: 196, lastY: 448, revealX: 196, revealY: 448, cellKey: "" });

  const updateGesture = (event: ReactPointerEvent<HTMLDivElement>, forceReveal = false) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const now = performance.now();
    const session = sessionRef.current;
    const x = clampSensing(event.clientX - bounds.left, 0, bounds.width);
    const y = clampSensing(event.clientY - bounds.top, 0, bounds.height);
    const elapsed = Math.max(16, now - session.lastTime);
    const distance = Math.hypot(x - session.lastX, y - session.lastY);
    const speed = distance / elapsed;
    const rawPoint = {
      x: clampSensing((x / bounds.width) * 2 - 1, -.88, .88),
      y: clampSensing((y / bounds.height) * 2 - 1, -.88, .88),
    };
    const hold = now - session.start;
    const forcefulMovement = clampSensing((speed - .32) / .72, 0, 1);
    livePointRef.current = rawPoint;
    const nextInsight = synthesizeEnergy(rawPoint, lifePath, dayNumber, dateKey);
    const cellKey = `${nextInsight.resonance.cell.column}:${nextInsight.resonance.cell.row}`;
    const distanceFromReveal = Math.hypot(x - session.revealX, y - session.revealY);
    if (forceReveal || (cellKey !== session.cellKey && distanceFromReveal >= 24)) {
      setCurrentInsight(nextInsight);
      session.cellKey = cellKey;
      session.revealX = x;
      session.revealY = y;
    }
    const nativePressure = event.pressure > 0 ? event.pressure : 0;
    const pressure = clampSensing(.18 + nativePressure * .26 + Math.min(1, hold / 950) * .36 + forcefulMovement * .2, .18, 1);
    setCursor((current) => ({
      x,
      y,
      xRatio: x / bounds.width,
      yRatio: y / bounds.height,
      pressure,
      tone: sensingDimensions[nextInsight.primaryChakra.id].tone,
      sequence: current.sequence + 1,
    }));
    session.lastTime = now;
    session.lastX = x;
    session.lastY = y;
    return nextInsight;
  };

  useEffect(() => {
    if (phase !== "sensing") return undefined;
    const timer = window.setInterval(() => {
      const now = performance.now();
      const session = sessionRef.current;
      const holdPressure = clampSensing((now - session.start) / 1200, 0, 1);
      setCursor((current) => ({ ...current, pressure: Math.max(current.pressure, .22 + holdPressure * .46), sequence: current.sequence + 1 }));
    }, 140);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "locked") {
      setReadyToComplete(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setReadyToComplete(true), prefersReducedMotion ? 80 : 1250);
    return () => window.clearTimeout(timer);
  }, [phase, prefersReducedMotion]);

  const beginSensing = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = clampSensing(event.clientX - bounds.left, 0, bounds.width);
    const localY = clampSensing(event.clientY - bounds.top, 0, bounds.height);
    sessionRef.current = { start: now, lastTime: now, lastX: localX, lastY: localY, revealX: localX, revealY: localY, cellKey: "" };
    setPhase("sensing");
    updateGesture(event, true);
  };

  const finishSensing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "sensing") return;
    const finalInsight = updateGesture(event, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setPoint(livePointRef.current);
    setCurrentInsight(finalInsight);
    setPhase("locked");
    setCursor((current) => ({ ...current, pressure: Math.max(.72, current.pressure), sequence: current.sequence + 1 }));
  };

  const currentWord = currentInsight.keyword.display;
  const backgroundX = (cursor.xRatio - .5) * -18;
  const backgroundY = (cursor.yRatio - .5) * -14;
  return (
    <EmbeddedScreen className="compass-host">
      <div className={`compass-screen sensing-screen sensing-${phase}`} data-testid="compass-screen" data-phase={phase} data-dimension={currentInsight.primaryChakra.id} data-word-id={phase === "idle" ? "" : currentInsight.selectedWord.id}>
        <img
          className="sensing-background"
          src="/assets/haf/visual-refresh/intuitive-flow-field-v1.png"
          alt=""
          style={{ transform: `translate3d(${backgroundX}px, ${backgroundY}px, 0) scale(${1.035 + cursor.pressure * .025})` }}
        />
        <SensingRippleCanvas cursor={cursor} active={phase === "sensing"} />
        <button className="visual-back sensing-back" onClick={() => flow.pop()} aria-label="返回">
          <img src="/assets/haf/visual-refresh/back-chevron.svg" alt="" />
        </button>
        <header><small>今日能量感应</small><h1>让手指随直觉移动</h1><p>不必寻找方向，让颜色回应你的感受。</p></header>
        <div
          className="sensing-touch-zone"
          data-scroll-drag="ignore"
          role="slider"
          aria-label="按住并移动手指感应此刻"
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.round(livePointRef.current.x * 100)}
          aria-valuetext={phase === "locked" ? `${currentWord} · ${currentInsight.primaryChakra.zh}` : phase === "sensing" ? "正在感应，松开手指接收回应" : "尚未选择"}
          tabIndex={0}
          onPointerDown={beginSensing}
          onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && updateGesture(event)}
          onPointerUp={finishSensing}
          onPointerCancel={() => setPhase("idle")}
        >
          <motion.img
            className="sensing-orb"
            src="/assets/haf/energy-orb-v2.png"
            alt=""
            animate={{
              left: `${cursor.xRatio * 100}%`,
              top: `${cursor.yRatio * 100}%`,
              scale: .74 + cursor.pressure * .46,
              opacity: phase === "idle" ? .72 : 1,
            }}
            transition={{ left: { type: "spring", stiffness: 420, damping: 34 }, top: { type: "spring", stiffness: 420, damping: 34 }, scale: { duration: .18 } }}
          />
        </div>
        <section className="sensing-word" aria-live="polite">
          <motion.small layout>{phase === "locked" ? "你停在这个词上——" : phase === "sensing" ? "回应正在汇聚" : "触碰一个位置"}</motion.small>
          <AnimatePresence mode="popLayout">
            {phase === "locked" && (
              <motion.strong
                key={currentWord}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: .94, filter: "blur(13px)", letterSpacing: ".13em" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", letterSpacing: ".06em" }}
                exit={prefersReducedMotion
                  ? { opacity: 0, transition: { duration: .01 } }
                  : { opacity: 0, y: -4, scale: 1.015, filter: "blur(8px)", transition: { duration: .24, ease: [.4, 0, 1, 1] } }}
                transition={prefersReducedMotion ? { duration: .01 } : {
                  opacity: { duration: 1.05, delay: .14, ease: [.22, 1, .36, 1] },
                  y: { duration: 1.15, delay: .08, ease: [.22, 1, .36, 1] },
                  scale: { duration: 1.18, delay: .08, ease: [.22, 1, .36, 1] },
                  filter: { duration: 1.12, delay: .1, ease: [.22, 1, .36, 1] },
                  letterSpacing: { duration: 1.18, delay: .08, ease: [.22, 1, .36, 1] },
                }}
              >
                {currentWord}
              </motion.strong>
            )}
          </AnimatePresence>
          <p>{phase === "idle" ? "按住并移动，松开手指接收回应" : phase === "sensing" ? "继续移动，松开手指让它显现" : `${currentInsight.primaryChakra.zh} · ${currentInsight.primaryChakra.themes.slice(0, 2).join(" · ")}`}</p>
        </section>
        <AnimatePresence>
          {phase === "locked" && readyToComplete && (
            <motion.button
              className="sensing-complete"
              onClick={() => flow.push(makeScreen("synthesis"))}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >完成感应 <ChevronRightIcon /></motion.button>
          )}
        </AnimatePresence>
      </div>
    </EmbeddedScreen>
  );
}

function SynthesisScreen() {
  const flow = useFlow();
  const { lifePath, dayNumber, dateKey, point } = useJourney();
  const insight = useMemo(() => synthesizeEnergy(point, lifePath, dayNumber, dateKey), [point, lifePath, dayNumber, dateKey]);
  useEffect(() => {
    let active = true;
    void Promise.all([
      delay(1750),
      prepareEnergyReading({ dateKey, dayNumber, insight }),
    ]).then(() => {
      if (active) flow.replace(makeScreen("result"));
    });
    return () => { active = false; };
  }, [dateKey, dayNumber, flow, insight]);
  return (
    <EmbeddedScreen className="synthesis-host">
      <div className="synthesis-screen" data-testid="synthesis-screen">
        <div className="synthesis-orbits"><motion.div className="energy-orb synthesis-orb" animate={{ y: [-12, 16, -12], rotate: [0, 10, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}><OrbLayers /></motion.div></div>
        <small>正在合成今日线索</small>
        <h1>让数字、色彩与此刻的心流<br />慢慢靠近彼此</h1>
        <div className="signal-row"><span>灵数</span><i /><span>色彩</span><i /><span>感应</span></div>
      </div>
    </EmbeddedScreen>
  );
}

function ResultScreen() {
  const flow = useFlow();
  const { lifePath, dayNumber, dateKey, point, favorites, toggleFavorite } = useJourney();
  const insight = useMemo(() => synthesizeEnergy(point, lifePath, dayNumber, dateKey), [point, lifePath, dayNumber, dateKey]);
  const readingCacheKey = energyReadingCacheKey(dateKey, dayNumber, insight);
  const energyReading = loadLocal(readingCacheKey, insight.energySummary);
  const [batch, setBatch] = useState(0);
  const [recentCourseIds, setRecentCourseIds] = useState(() => new Set(loadLocal<string[]>(recentCourseStorageKey, [])));
  const orderedCourses = useMemo(
    () => recommendCourses(insight, recentCourseIds, lifePath, dayNumber, `${dateKey}:batch-${batch}`),
    [insight, recentCourseIds, lifePath, dayNumber, dateKey, batch],
  );

  useEffect(() => {
    const history = appendCourseHistory(recentCourseIds, orderedCourses.map((course) => course.id));
    window.localStorage.setItem(recentCourseStorageKey, JSON.stringify(history));
  }, [orderedCourses, recentCourseIds]);

  const refreshCourses = () => {
    setRecentCourseIds((previous) => new Set(appendCourseHistory(previous, orderedCourses.map((course) => course.id))));
    setBatch((value) => value + 1);
  };

  return (
    <EmbeddedScreen className="result-host">
      <div className="result-screen" data-testid="result-screen">
        <button className="visual-back result-back" onClick={() => flow.pop()} aria-label="返回重新感应">
          <img src="/assets/haf/visual-refresh/back-chevron.svg" alt="" />
        </button>
        <div className="result-top-actions">
          <button onClick={() => flow.push(makeScreen("profile"))}>修改档案</button>
        </div>
        <section className="result-insight">
          <div className="result-copy">
            <small>今日能量回响</small>
            <h1>{insight.compositeTitle}</h1>
            <p>{energyReading}</p>
          </div>
          <div className="energy-facets" aria-label="今日能量的三个线索">
            <span><small>今日灵数</small><strong>{dayNumber}</strong><em>{insight.dailyTheme.display}</em></span>
            <span><small>当下共鸣</small><strong>{insight.keyword.display}</strong><em>由你亲手选中</em></span>
            <span><small>能量落点</small><strong>{insight.primaryChakra.zh}</strong><em>{insight.primaryChakra.themes.slice(0, 2).join(" · ")}</em></span>
          </div>
        </section>
        <section className="recommendations">
          <h2 className="visually-hidden">此刻与你契合的体验</h2>
          <Carousel className="course-rail" contentClassName="course-track" ariaLabel="此刻与你契合的体验">
            {orderedCourses.map((course) => {
              const saved = favorites.includes(course.id);
              return (
                <article className="course-card" data-testid="course-card" data-course-id={course.id} key={course.id}>
                  <img className="course-visual" src={course.image} alt="" />
                  <div className="course-shade" aria-hidden="true" />
                  <div className="course-copy-haze" aria-hidden="true" />
                  <small className="course-date-pill">{course.dateLabel}</small>
                  <button className={`course-heart ${saved ? "saved" : ""}`} onClick={() => toggleFavorite(course.id)} aria-label={`${saved ? "取消收藏" : "收藏"}${course.title}`}>
                    <img src="/assets/haf/visual-refresh/heart-outline.svg" alt="" />
                  </button>
                  <div className="course-copy"><span>{course.meta}</span><h3>{course.title}</h3><p>{course.fit}</p></div>
                </article>
              );
            })}
          </Carousel>
        </section>
        <footer className="result-actions">
          <div className="result-primary-actions">
            <button className="result-saved-action" onClick={() => flow.push(makeScreen("favorites"))} aria-label={`查看已收藏${favorites.length ? ` ${favorites.length}` : ""}`}>
              <BookmarkIcon />
              {favorites.length > 0 && <span>{favorites.length}</span>}
            </button>
            <button className="result-refresh" onClick={refreshCourses}>换一批</button>
          </div>
          <button className="result-resense" onClick={() => flow.pop()}>重新感应</button>
        </footer>
      </div>
    </EmbeddedScreen>
  );
}

function FavoritesScreen() {
  const flow = useFlow();
  const { favorites, toggleFavorite } = useJourney();
  const savedCourses = activeCourses.filter((course) => favorites.includes(course.course_id));

  return (
    <EmbeddedScreen className="favorites-host">
      <div className="favorites-screen" data-testid="favorites-screen">
        <button className="favorites-back" onClick={() => flow.pop()}><ChevronLeftIcon />回到今日能量</button>
        <header>
          <small>MY SAVED EXPERIENCES</small>
          <h1>你收藏的，正在<br />形成一条自己的路径</h1>
          <p>收藏不会催促你立刻决定。等同一种需要反复出现时，再选择是否深入。</p>
        </header>
        {savedCourses.length ? (
          <div className="saved-course-list">
            {savedCourses.map((course) => (
              <article key={course.course_id}>
                <img src={course.cover_asset} alt="" />
                <div>
                  <small>{course.format_label}</small>
                  <strong>{course.title}</strong>
                  <span>{course.short_description}</span>
                  <em>{savedCourseSchedule(course)}</em>
                </div>
                <button onClick={() => toggleFavorite(course.course_id)} aria-label={`移除${course.title}`}><Cross1Icon /></button>
              </article>
            ))}
          </div>
        ) : (
          <div className="favorites-empty">
            <BookmarkIcon />
            <strong>还没有收藏</strong>
            <span>回到推荐里，只留下真正让你心里一动的体验。</span>
          </div>
        )}
        {savedCourses.length >= 2 && (
          <div className="saved-pattern">
            <small>一条正在浮现的线索</small>
            <strong>你已经为 {savedCourses.length} 个与此刻能量相近的体验留下了位置。</strong>
            <p>先从最轻的一个体验开始，也许比一次做很多选择更靠近你。</p>
          </div>
        )}
      </div>
    </EmbeddedScreen>
  );
}

type ScreenId = "loading" | "welcome" | "profile" | "return" | "compass" | "synthesis" | "result" | "favorites";

function makeScreen(id: ScreenId): FlowScreen {
  const screens: Record<typeof id, () => ReactNode> = {
    loading: () => <LoadingScreen />,
    welcome: () => <WelcomeScreen />,
    profile: () => <ProfileScreen />,
    return: () => <ReturnGreetingScreen />,
    compass: () => <CompassScreen />,
    synthesis: () => <SynthesisScreen />,
    result: () => <ResultScreen />,
    favorites: () => <FavoritesScreen />,
  };
  return { id, render: screens[id], headerHeight: 0, footerHeight: 0 };
}

function JourneyFlow() {
  return <FlowStack initial={makeScreen("loading")} />;
}

export default function Prototype() {
  return <JourneyProvider><JourneyFlow /></JourneyProvider>;
}
