import {
  BookmarkIcon,
  CaretDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross1Icon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
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
import { Carousel, FlowStack, KeyboardInput, MobileScroll, useFlow, useKeyboard, type FlowScreen } from "./mobile";
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
    mappedCell: { column: number; row: number };
    fieldSeed: string;
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
  userProfileStatus: "loading" | "missing" | "ready";
  completeProfile: () => void;
  point: Point;
  setPoint: (point: Point) => void;
  fieldSeed: string;
  setFieldSeed: (seed: string) => void;
  sensingResetKey: number;
  resetSensing: () => void;
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
const courseKeywordLexicon: Record<KeywordId, string[]> = {
  begin: ["开始", "启程", "启动", "主动", "开创", "创新", "潜能", "勇气"],
  connect: ["连接", "关系", "亲子", "家庭", "共鸣", "合唱", "信任", "伙伴", "社群", "互动", "陪伴", "团体"],
  express: ["表达", "声音", "声乐", "朗读", "诵读", "沟通", "分享", "书写", "绘画", "艺术", "色彩"],
  ground: ["身体", "扎根", "稳定", "落地", "安定", "根基", "秩序", "传统", "文化", "功法", "瑜伽", "运动"],
  flow: ["流动", "五感", "感官", "情绪", "舞动", "舞蹈", "香气", "自由", "变化", "呼吸", "创造", "创作"],
  care: ["疗愈", "照顾", "关怀", "滋养", "温柔", "接纳", "慈悲", "休息", "放松"],
  insight: ["冥想", "觉察", "潜意识", "洞察", "直觉", "正念", "内观", "探索", "心理", "认知", "智慧", "哲学", "梦"],
  strength: ["边界", "力量", "意志", "行动", "突破", "成长", "执行", "蜕变", "挑战", "自信", "潜质"],
  release: ["放下", "释放", "松开", "告别", "完成", "清理", "释怀"],
  integrate: ["整合", "合一", "平衡", "融合", "身心", "共振", "全息"],
};

function inferCourseKeywordTags(course: { title: string; short_description: string; api_tags?: string[] }) {
  const searchable = [course.title, course.short_description, ...(course.api_tags ?? [])].join(" ");
  return (Object.entries(courseKeywordLexicon) as Array<[KeywordId, string[]]>)
    .filter(([, signals]) => signals.some((signal) => searchable.includes(signal)))
    .map(([keyword]) => keyword);
}
const fitStatementByFormat: Record<string, string> = {
  meditation: "在安静的练习里，把散开的注意力慢慢收回",
  sound: "让声音穿过身体，为还未成形的感受留下回响",
  movement: "让身体在动作与停顿之间，重新辨认自己的节奏",
  breathwork: "从一呼一吸开始，为身体与注意力留出空间",
  creative: "借创作与感官，为难以言说的感受找到形状",
  dialogue: "在倾听与回应之间，重新看见关系里的真实位置",
  culture: "从传统与文化经验中，为当下找到一处安放",
  lecture: "沿着清晰的主题，把此刻关注的问题重新理顺",
  guided_practice: "跟随一段具体练习，把心里的线索带回体验",
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

const chakraNarrative: Record<ChakraId, string> = {
  root: "海底轮关照人与大地、身体与支撑的关系",
  sacral: "生殖轮关照感受如何流动、创造如何发生",
  solar_plexus: "太阳神经丛关照意志如何聚拢、选择如何落定",
  heart: "心轮关照给予与接收之间的空间",
  throat: "喉轮关照内在感受如何抵达外部世界",
  third_eye: "眉心轮关照如何在纷杂之中重新看见",
  crown: "顶轮关照个体经验如何回到更大的整体",
};

function courseNarrativeCue(course: CatalogCourse) {
  const searchable = `${course.title} ${course.short_description}`;
  if (/HIIT|高强度间歇|冲刺|跳跃/.test(searchable)) {
    return { subject: "这场身体训练", practice: "冲刺、起跳与慢走交替，让力量有释放，也有落点", embodied: true };
  }
  if (/阴瑜伽/.test(searchable)) {
    return { subject: "这场身体练习", practice: "让重力接住身体，让呼吸陪伴每一次停留", embodied: true };
  }
  if (/呼吸|调息|吐纳/.test(searchable) || course.format === "breathwork") {
    return { subject: "这段呼吸练习", practice: "从一呼一吸开始，为身体与注意力留出空间", embodied: true };
  }
  if (/瑜伽|舞动|运动|体式|功法|太极|站桩|律动/.test(searchable)) {
    return { subject: "这场身体练习", practice: "让身体在动作与停顿之间，重新辨认自己的节奏", embodied: true };
  }
  if (/颂钵|铜锣|唱诵|声音|声波|音疗|音乐/.test(searchable) || course.format === "sound") {
    return { subject: "这场声音体验", practice: "让声音穿过身体，为还未成形的感受留下回响", embodied: true };
  }
  if (/冥想|正念|静心|内观/.test(searchable) || course.format === "meditation") {
    return { subject: "这段冥想练习", practice: "在安静的练习里，把散开的注意力慢慢收回", embodied: false };
  }
  if (/创作|绘画|艺术|色彩|手作|刺绣|螺钿/.test(searchable) || course.format === "creative") {
    return { subject: "这场创作体验", practice: "借创作与感官，为难以言说的感受找到形状", embodied: false };
  }
  if (/对话|分享|团体|关系/.test(searchable) || course.format === "dialogue") {
    return { subject: "这场对话体验", practice: "在倾听与回应之间，重新看见关系里的真实位置", embodied: false };
  }
  const subject = experienceSubjectByFormat[course.format] ?? `这场${course.format_label}`;
  return { subject, practice: course.fit_statement, embodied: false };
}
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
  // Course keyword evidence comes from course content. Numerology tags remain
  // a separate score and must not be counted again as selected-word evidence.
  keyword_tags: inferCourseKeywordTags(course),
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
const sensingIntroStorageKey = "haf-sensing-intro-date:v6";
const sensingMusicUrl = "/assets/haf/sensing/haf-fingertip-energy-flow-suno-mobile-v1.m4a";
const sensingGuideUrl = "/assets/haf/sensing/meditation-guide-haf-chenguang-v1.mp3";
type SensingGuideStatus = "idle" | "playing" | "ended" | "error";
type SensingAudioSession = {
  dateKey: string;
  music: HTMLAudioElement;
  guide: HTMLAudioElement;
  soundEnabled: boolean;
  introFinished: boolean;
  guideStatus: SensingGuideStatus;
  guideStartTimer: number | null;
  musicFadeFrame: number | null;
  listeners: Set<(ready: boolean, status: SensingGuideStatus) => void>;
};
let sensingAudioSession: SensingAudioSession | null = null;

function hasHeardSensingIntro(dateKey: string) {
  return typeof window !== "undefined" && window.localStorage.getItem(sensingIntroStorageKey) === dateKey;
}

function notifySensingIntro(session: SensingAudioSession) {
  session.listeners.forEach((listener) => listener(session.introFinished, session.guideStatus));
}

function clearSensingGuideTimer(session: SensingAudioSession) {
  if (session.guideStartTimer !== null) window.clearTimeout(session.guideStartTimer);
  session.guideStartTimer = null;
}

function fadeSensingMusic(session: SensingAudioSession, target: number, durationMs: number) {
  if (session.musicFadeFrame !== null) window.cancelAnimationFrame(session.musicFadeFrame);
  const startedAt = performance.now();
  const initial = session.music.volume;
  const step = (now: number) => {
    const progress = Math.max(0, Math.min(1, (now - startedAt) / durationMs));
    const eased = 1 - (1 - progress) ** 3;
    session.music.volume = Math.max(0, Math.min(1, initial + (target - initial) * eased));
    session.musicFadeFrame = progress < 1 ? window.requestAnimationFrame(step) : null;
  };
  session.musicFadeFrame = window.requestAnimationFrame(step);
}

function stopSensingAudio() {
  const session = sensingAudioSession;
  if (!session) return;
  if (session.musicFadeFrame !== null) window.cancelAnimationFrame(session.musicFadeFrame);
  session.musicFadeFrame = null;
  clearSensingGuideTimer(session);
  session.music.pause();
  session.guide.pause();
}

function startSensingAudio(dateKey: string) {
  const heardToday = hasHeardSensingIntro(dateKey);
  const continuingSession = Boolean(sensingAudioSession && sensingAudioSession.dateKey === dateKey);
  if (!sensingAudioSession || sensingAudioSession.dateKey !== dateKey) {
    stopSensingAudio();
    document.querySelectorAll<HTMLAudioElement>(".sensing-music-audio, .sensing-guide-audio").forEach((audio) => {
      audio.pause();
      audio.remove();
    });
    const music = new Audio(sensingMusicUrl);
    const guide = new Audio(sensingGuideUrl);
    music.className = "sensing-music-audio";
    guide.className = "sensing-guide-audio";
    music.setAttribute("aria-hidden", "true");
    guide.setAttribute("aria-hidden", "true");
    music.preload = "none";
    music.loop = true;
    guide.preload = "auto";
    document.body.append(music, guide);
    sensingAudioSession = {
      dateKey,
      music,
      guide,
      soundEnabled: true,
      introFinished: heardToday,
      guideStatus: heardToday ? "ended" : "idle",
      guideStartTimer: null,
      musicFadeFrame: null,
      listeners: new Set(),
    };
  }

  const session = sensingAudioSession;
  if (continuingSession && (!session.soundEnabled || (!session.music.paused && (heardToday || session.introFinished)))) {
    return session;
  }
  session.introFinished = heardToday;
  session.guideStatus = heardToday ? "ended" : "idle";
  notifySensingIntro(session);
  session.music.currentTime = 0;
  session.music.volume = 0;
  void session.music.play().then(() => {
    fadeSensingMusic(session, heardToday ? .18 : .1, 2200);
  }).catch(() => { /* The voice remains the primary cue if music streaming is delayed. */ });

  if (heardToday) {
    return session;
  }

  session.guide.currentTime = 0;
  session.guide.volume = .88;
  session.guide.onended = () => {
    clearSensingGuideTimer(session);
    session.guideStatus = "ended";
    session.introFinished = true;
    window.localStorage.setItem(sensingIntroStorageKey, dateKey);
    fadeSensingMusic(session, .18, 1200);
    notifySensingIntro(session);
  };
  session.guide.onerror = () => {
    clearSensingGuideTimer(session);
    session.guideStatus = "error";
    notifySensingIntro(session);
  };
  clearSensingGuideTimer(session);
  session.guideStartTimer = window.setTimeout(() => {
    if (session.guideStatus !== "idle") return;
    session.guideStatus = "error";
    notifySensingIntro(session);
  }, 4000);
  void session.guide.play().then(() => {
    clearSensingGuideTimer(session);
    session.guideStatus = "playing";
    window.localStorage.setItem(sensingIntroStorageKey, dateKey);
    notifySensingIntro(session);
  }).catch(() => {
    clearSensingGuideTimer(session);
    session.guideStatus = "error";
    notifySensingIntro(session);
  });
  return session;
}

const analyticsEndpoint = import.meta.env.VITE_HAF_ANALYTICS_ENDPOINT ?? "http://localhost:4174/api/events";
const readingEndpoint = import.meta.env.VITE_HAF_READING_ENDPOINT ?? "http://localhost:4174/api/energy-reading";
const aiRequestTimeoutMs = 6000;
const pendingReadingRequests = new Map<string, Promise<string>>();

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

function createSensingFieldSeed() {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function sensingWordForPoint(point: Point, fieldSeed: string) {
  const columns = chakraWordModel.field.columns;
  const rows = chakraWordModel.field.rows;
  const column = Math.min(columns - 1, Math.max(0, Math.floor(((point.x + 1) / 2) * columns)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((point.y + 1) / 2) * rows)));
  const columnOffset = stableIndex(`${fieldSeed}:column`, columns);
  const rowOffset = stableIndex(`${fieldSeed}:row`, rows);
  const mirroredColumn = stableIndex(`${fieldSeed}:mirror-x`, 2) === 1 ? columns - 1 - column : column;
  const mirroredRow = stableIndex(`${fieldSeed}:mirror-y`, 2) === 1 ? rows - 1 - row : row;
  const mappedColumn = (mirroredColumn + columnOffset) % columns;
  const mappedRow = (mirroredRow + rowOffset) % rows;
  const chakraIndex = (mappedColumn * chakraWordModel.field.chakra_stride + mappedRow * chakraWordModel.field.row_stride) % chakraWordModel.chakra_order.length;
  const chakraId = chakraWordModel.chakra_order[chakraIndex];
  return { column, row, mappedColumn, mappedRow, chakraId, word: chakraWordModel.chakras[chakraId].words[mappedRow] };
}

function projectChakras(point: Point, lifePath: number, personalDay: number, fieldSeed: string) {
  const selected = sensingWordForPoint(point, fieldSeed);
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

function synthesizeEnergy(point: Point, lifePath: number, personalDay: number, dateKey: string, fieldSeed: string): EnergyInsight {
  const projection = projectChakras(point, lifePath, personalDay, fieldSeed);
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
  const numberTheme = numberThemes[String(personalDay)];
  const dailyTheme = {
    ...synthesisModel.keywords[dailyThemeId],
    // Daily-number language is its own symbolic layer. Do not reuse the
    // chakra-facing canonical display word as if it were a traditional name.
    display: numberTheme.keywords[0],
  };
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
      mappedCell: { column: projection.selected.mappedColumn, row: projection.selected.mappedRow },
      fieldSeed,
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
  dayNumber: number,
  dateKey: string,
  usedModes: Set<FitReasonMode>,
) {
  const matchedChakra = course.chakra_tags.includes(insight.primaryChakra.id)
    ? insight.primaryChakra
    : course.chakra_tags.includes(insight.secondaryChakra.id)
      ? insight.secondaryChakra
      : null;
  const matchesDailyNumerology = Boolean(course.numerology_tags?.includes(dayNumber));
  const validModes: Record<FitReasonMode, boolean> = {
    keyword: course.keyword_tags.includes(insight.keywordId),
    numerology: matchesDailyNumerology,
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

  const cue = courseNarrativeCue(course);
  const seed = `${dateKey}:${course.course_id}:${insight.keywordId}:${mode}`;
  if (mode === "keyword") {
    if (insight.primaryChakra.id === "root" && cue.embodied) {
      return chooseStable([
        `你亲手停在“${insight.keyword.display}”；${cue.practice}，把海底轮的安定重新带回脚下。`,
        `${cue.practice}；你选中的“${insight.keyword.display}”，因而重新拥有身体的重量。`,
        `海底轮所指的安定，也可以在行动中被感知；${cue.practice}，让“${insight.keyword.display}”有了真实触点。`,
      ], seed);
    }
    return chooseStable([
      `你亲手停在“${insight.keyword.display}”；${cue.practice}，让这份共鸣有了可以进入的形状。`,
      `${cue.practice}，让你选中的“${insight.keyword.display}”不只被命名，也有机会被亲身经历。`,
      `顺着“${insight.keyword.display}”继续靠近，${cue.subject}把心里的线索带回一段真实体验。`,
    ], seed);
  }
  if (mode === "numerology") {
    return chooseStable([
      `今日的“${insight.dailyTheme.display}”不只是一句提醒；${cue.practice}，为它找到一种具体节奏。`,
      `顺着今日的“${insight.dailyTheme.display}”，${cue.practice}，也许更接近你此刻愿意投入的方式。`,
      `今日主旋律落在“${insight.dailyTheme.display}”；${cue.subject}让这份线索从想法走向体验。`,
    ], seed);
  }
  if (mode === "chakra" && matchedChakra) {
    return chooseStable([
      `${chakraNarrative[matchedChakra.id]}；${cue.practice}，让这条能量线索落进真实体验。`,
      `${matchedChakra.zh}此刻指向${matchedChakra.themes.slice(0, 2).join("与")}；${cue.subject}为它提供一条可感知的路径。`,
      `从${matchedChakra.zh}的${matchedChakra.themes[0]}出发；${cue.practice}，让注意力有一处安放。`,
    ], seed);
  }
  if (mode === "resonance") {
    if (insight.primaryChakra.id === "root" && cue.embodied) {
      return chooseStable([
        `“${insight.keyword.display}”在此刻浮现，不一定意味着静止；${cue.practice}，让身体重新辨认支点。`,
        `${cue.practice}；你选中的“${insight.keyword.display}”，因而不只是一种想法。`,
        `你停在“${insight.keyword.display}”；${cue.practice}，把海底轮的安定重新带回脚下。`,
      ], seed);
    }
    return chooseStable([
      `你亲手停在“${insight.keyword.display}”；${cue.practice}，让这份共鸣不只被看见，也能被经历。`,
      `“${insight.keyword.display}”是你自己选中的线索；${cue.subject}为它留出一条继续靠近的路径。`,
      `顺着“${insight.keyword.display}”继续向前，${cue.practice}，让内在回应拥有现实的触点。`,
    ], seed);
  }
  return chooseStable([
    `${cue.practice}。它不替你定义答案，只为此刻的${insight.primaryChakra.themes[0]}留出入口。`,
    `${cue.subject}的节奏与你此刻接近；可以先收藏，在真正合适的时候进入。`,
    `此刻不必急着行动；${cue.practice}，先为这份感受保留一个位置。`,
  ], seed);
}

function recommendCourses(
  insight: EnergyInsight,
  recentIds: Set<string>,
  sessionIds: Set<string>,
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
  const sessionCourseIds = [...sessionIds];
  const lastShownIds = new Set((sessionCourseIds.length ? sessionCourseIds : recentCourseIds).slice(-3));
  const recentOrder = new Map([...recentIds].map((id, index) => [id, index]));
  const globallyFreshCourses = primaryChakraCourses.filter((course) => (
    !sessionIds.has(course.course_id) && !recentIds.has(course.course_id)
  ));
  const globallySeenButNewToSession = primaryChakraCourses
    .filter((course) => !sessionIds.has(course.course_id) && recentIds.has(course.course_id))
    .sort((a, b) => (recentOrder.get(a.course_id) ?? 0) - (recentOrder.get(b.course_id) ?? 0));
  const newToSessionCourses = [...globallyFreshCourses, ...globallySeenButNewToSession];
  const sessionOrder = new Map(sessionCourseIds.map((id, index) => [id, index]));
  const sessionRolloverCourses = primaryChakraCourses
    .filter((course) => sessionIds.has(course.course_id) && !lastShownIds.has(course.course_id))
    .sort((a, b) => (sessionOrder.get(a.course_id) ?? 0) - (sessionOrder.get(b.course_id) ?? 0));
  const immediateRepeatCourses = primaryChakraCourses.filter((course) => lastShownIds.has(course.course_id));
  const nonImmediateCandidates = [...newToSessionCourses, ...sessionRolloverCourses];
  const candidateCourses = newToSessionCourses.length >= 3
    ? newToSessionCourses
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
    const fit = buildCourseFitReason(course, insight, index, dayNumber, dateKey, usedReasonModes);
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

function recommendationBatchLimit(insight: EnergyInsight) {
  const relevantCourseCount = activeCourses.filter((course) => (
    course.chakra_tags.includes(insight.primaryChakra.id)
  )).length;
  return Math.min(4, Math.max(1, Math.ceil(relevantCourseCount / 3)));
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

function energyReadingCacheKey(dateKey: string, dayNumber: number, insight: EnergyInsight) {
  return `haf-energy-reading:v6:${dateKey}:${dayNumber}:${insight.selectedWord.id}:${insight.primaryChakra.id}:${insight.secondaryChakra.id}`;
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
  const [userProfileStatus, setUserProfileStatus] = useState<JourneyState["userProfileStatus"]>("loading");
  const [point, setPoint] = useState<Point>({ x: -0.42, y: -0.24 });
  const [fieldSeed, setFieldSeed] = useState(createSensingFieldSeed);
  const [sensingResetKey, setSensingResetKey] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(() => loadLocal(favoriteStorageKey, []));
  const moduleViewTracked = useRef(false);
  const today = useMemo(() => new Date(), []);
  const dateKey = useMemo(() => localDateKey(today), [today]);
  const numerology = useMemo(() => calculateNumerology(profile.birth, today), [profile.birth, today]);

  useEffect(() => window.localStorage.setItem("haf-journey-profile", JSON.stringify(profile)), [profile]);
  useEffect(() => {
    let active = true;
    // Temporary local adapter. Tomorrow's mini-program user-info API should be
    // mapped here; the LoadingScreen routing contract can remain unchanged.
    void Promise.resolve(loadLocal("haf-journey-onboarded", false)).then((hasProfile) => {
      if (active) setUserProfileStatus(hasProfile ? "ready" : "missing");
    });
    return () => { active = false; };
  }, []);
  useEffect(() => window.localStorage.setItem(favoriteStorageKey, JSON.stringify(favorites)), [favorites]);
  useEffect(() => {
    if (moduleViewTracked.current) return;
    moduleViewTracked.current = true;
    trackEnergyEvent("energy_module_viewed");
  }, []);
  useEffect(() => () => stopSensingAudio(), []);

  return (
    <JourneyContext.Provider value={{
      profile,
      setProfile,
      userProfileStatus,
      completeProfile: () => {
        window.localStorage.setItem("haf-journey-onboarded", JSON.stringify(true));
        setUserProfileStatus("ready");
      },
      point,
      setPoint,
      fieldSeed,
      setFieldSeed,
      sensingResetKey,
      resetSensing: () => setSensingResetKey((current) => current + 1),
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
  const { userProfileStatus, dateKey } = useJourney();
  const routed = useRef(false);
  useEffect(() => {
    if (userProfileStatus === "loading" || routed.current) return;
    routed.current = true;
    if (userProfileStatus === "ready") startSensingAudio(dateKey);
    flow.replace(makeScreen(userProfileStatus === "ready" ? "compass" : "profile"));
  }, [dateKey, flow, userProfileStatus]);

  return (
    <EmbeddedScreen className="loading-host">
      <div className="loading-screen" data-testid="loading-screen">
        <motion.div
          className="energy-orb loading-orb"
          animate={{ scale: [0.86, 1.05, 0.92], rotate: [0, 8, -4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        ><OrbLayers /></motion.div>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>正在准备今日感应</motion.span>
        <i><b /></i>
      </div>
    </EmbeddedScreen>
  );
}

function ProfileScreen() {
  const flow = useFlow();
  const keyboard = useKeyboard();
  const { profile, setProfile, completeProfile, dateKey } = useJourney();
  const [editingYear, setEditingYear] = useState(false);
  const [yearDraft, setYearDraft] = useState(() => String(profile.birth.year));
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
  const commitYear = () => {
    const parsedYear = Number.parseInt(yearDraft, 10);
    const year = Number.isFinite(parsedYear) ? Math.min(2010, Math.max(1936, parsedYear)) : profile.birth.year;
    const birth = {
      ...profile.birth,
      year,
      day: Math.min(profile.birth.day, daysInMonth(year, profile.birth.month)),
    };
    setYearDraft(String(year));
    setProfile({ ...profile, birth });
    setEditingYear(false);
    keyboard.hide();
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
            {editingYear ? (
              <label className="profile-year-editor">
                <KeyboardInput
                  value={yearDraft}
                  onChange={(event) => setYearDraft(event.target.value.replace(/\D/g, "").slice(0, 4))}
                  onBlur={commitYear}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoFocus
                  aria-label="输入出生年份"
                />
                <span>年</span>
              </label>
            ) : (
              <button
                className="profile-year-value"
                type="button"
                onClick={() => {
                  setYearDraft(String(profile.birth.year));
                  setEditingYear(true);
                }}
                aria-label="修改出生年份"
              >
                <strong>{profile.birth.year}</strong>
                <span>年</span>
              </button>
            )}
            {(["month", "day"] as const).map((field) => (
              <button key={field} type="button" onClick={() => adjust(field, 1)} aria-label={`${field}增加`}>
                <strong>{profile.birth[field]}</strong>
                <span>{field === "month" ? "月" : "日"}</span>
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
        <GlowButton onClick={() => { completeProfile(); startSensingAudio(dateKey); flow.push(makeScreen("compass")); }}>开启今日探索</GlowButton>
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
  const { point, setPoint, fieldSeed, setFieldSeed, sensingResetKey, lifePath, dayNumber, dateKey } = useJourney();
  const initialInsight = useMemo(() => synthesizeEnergy(point, lifePath, dayNumber, dateKey, fieldSeed), [dateKey, dayNumber, fieldSeed, lifePath, point]);
  const [phase, setPhase] = useState<"idle" | "sensing" | "locked">("idle");
  const [currentInsight, setCurrentInsight] = useState(initialInsight);
  const [readyToComplete, setReadyToComplete] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => sensingAudioSession?.soundEnabled ?? true);
  const [introReady, setIntroReady] = useState(() => (
    sensingAudioSession?.dateKey === dateKey ? sensingAudioSession.introFinished : hasHeardSensingIntro(dateKey)
  ));
  const [introAudioStatus, setIntroAudioStatus] = useState<SensingGuideStatus>(() => (
    sensingAudioSession?.dateKey === dateKey ? sensingAudioSession.guideStatus : hasHeardSensingIntro(dateKey) ? "ended" : "idle"
  ));
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
  const fieldSeedRef = useRef(fieldSeed);
  const sessionRef = useRef({ start: 0, lastTime: 0, lastX: 196, lastY: 448, revealX: 196, revealY: 448, cellKey: "", travel: 0 });
  const gestureStartRef = useRef({ cursor, insight: initialInsight, point, fieldSeed });
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    const neutralPoint = { x: 0, y: 0 };
    const neutralInsight = synthesizeEnergy(neutralPoint, lifePath, dayNumber, dateKey, fieldSeedRef.current);
    const neutralCursor: SensingCursor = {
      x: 196,
      y: 448,
      xRatio: .5,
      yRatio: .52,
      pressure: .22,
      tone: sensingDimensions[neutralInsight.primaryChakra.id].tone,
      sequence: 0,
    };
    livePointRef.current = neutralPoint;
    sessionRef.current = { start: 0, lastTime: 0, lastX: 196, lastY: 448, revealX: 196, revealY: 448, cellKey: "", travel: 0 };
    gestureStartRef.current = { cursor: neutralCursor, insight: neutralInsight, point: neutralPoint, fieldSeed: fieldSeedRef.current };
    setCurrentInsight(neutralInsight);
    setCursor(neutralCursor);
    setReadyToComplete(false);
    setPhase("idle");
  }, [dateKey, dayNumber, lifePath, sensingResetKey]);

  useEffect(() => {
    const session = sensingAudioSession;
    if (!session || session.dateKey !== dateKey) {
      setIntroReady(hasHeardSensingIntro(dateKey));
      setIntroAudioStatus(hasHeardSensingIntro(dateKey) ? "ended" : "idle");
      return undefined;
    }
    const receiveReadyState = (ready: boolean, status: SensingGuideStatus) => {
      setIntroReady(ready);
      setIntroAudioStatus(status);
    };
    setIntroReady(session.introFinished);
    setIntroAudioStatus(session.guideStatus);
    session.listeners.add(receiveReadyState);
    return () => { session.listeners.delete(receiveReadyState); };
  }, [dateKey]);

  const toggleSound = () => {
    if (!introReady) return;
    const next = !soundEnabledRef.current;
    soundEnabledRef.current = next;
    setSoundEnabled(next);
    const session = sensingAudioSession;
    if (!session) return;
    session.soundEnabled = next;
    if (next) void session.music.play();
    else session.music.pause();
  };

  const updateGesture = (event: ReactPointerEvent<HTMLDivElement>, forceReveal = false) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const now = performance.now();
    const session = sessionRef.current;
    const x = clampSensing(event.clientX - bounds.left, 0, bounds.width);
    const y = clampSensing(event.clientY - bounds.top, 0, bounds.height);
    const elapsed = Math.max(16, now - session.lastTime);
    const distance = Math.hypot(x - session.lastX, y - session.lastY);
    session.travel += distance;
    const speed = distance / elapsed;
    const rawPoint = {
      x: clampSensing((x / bounds.width) * 2 - 1, -.88, .88),
      y: clampSensing((y / bounds.height) * 2 - 1, -.88, .88),
    };
    const hold = now - session.start;
    const forcefulMovement = clampSensing((speed - .32) / .72, 0, 1);
    livePointRef.current = rawPoint;
    const nextInsight = synthesizeEnergy(rawPoint, lifePath, dayNumber, dateKey, fieldSeedRef.current);
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
    const timer = window.setTimeout(() => setReadyToComplete(true), prefersReducedMotion ? 80 : 1850);
    return () => window.clearTimeout(timer);
  }, [phase, prefersReducedMotion]);

  const beginSensing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!introReady) return;
    event.preventDefault();
    const audioSession = sensingAudioSession;
    if (soundEnabledRef.current && audioSession?.music.paused) {
      audioSession.music.volume = 0;
      void audioSession.music.play().then(() => fadeSensingMusic(audioSession, .18, 1400)).catch(() => {});
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = performance.now();
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = clampSensing(event.clientX - bounds.left, 0, bounds.width);
    const localY = clampSensing(event.clientY - bounds.top, 0, bounds.height);
    gestureStartRef.current = { cursor, insight: currentInsight, point: livePointRef.current, fieldSeed: fieldSeedRef.current };
    fieldSeedRef.current = createSensingFieldSeed();
    sessionRef.current = { start: now, lastTime: now, lastX: localX, lastY: localY, revealX: localX, revealY: localY, cellKey: "", travel: 0 };
    setPhase("sensing");
    updateGesture(event, true);
  };

  const finishSensing = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phase !== "sensing") return;
    const session = sessionRef.current;
    const bounds = event.currentTarget.getBoundingClientRect();
    const releaseX = clampSensing(event.clientX - bounds.left, 0, bounds.width);
    const releaseY = clampSensing(event.clientY - bounds.top, 0, bounds.height);
    const releaseTravel = Math.hypot(releaseX - session.lastX, releaseY - session.lastY);
    const gestureDuration = performance.now() - session.start;
    const isIntentionalSensing = session.travel + releaseTravel >= 22 || gestureDuration >= 320;
    const finalInsight = updateGesture(event, true);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!isIntentionalSensing) {
      const start = gestureStartRef.current;
      livePointRef.current = start.point;
      fieldSeedRef.current = start.fieldSeed;
      setCurrentInsight(start.insight);
      setCursor({ ...start.cursor, pressure: .22, sequence: start.cursor.sequence + 1 });
      setPhase("idle");
      return;
    }
    setPoint(livePointRef.current);
    setFieldSeed(fieldSeedRef.current);
    setCurrentInsight(finalInsight);
    setPhase("locked");
    setCursor((current) => ({ ...current, pressure: Math.max(.72, current.pressure), sequence: current.sequence + 1 }));
  };

  const currentWord = currentInsight.keyword.display;
  const backgroundX = (cursor.xRatio - .5) * -18;
  const backgroundY = (cursor.yRatio - .5) * -14;
  return (
    <EmbeddedScreen className="compass-host">
      <div className={`compass-screen sensing-screen sensing-${phase} ${introReady ? "sensing-intro-ready" : "sensing-intro-playing"}`} data-testid="compass-screen" data-phase={phase} data-intro-ready={introReady} data-intro-audio-status={introAudioStatus} data-dimension={currentInsight.primaryChakra.id} data-word-id={phase === "idle" ? "" : currentInsight.selectedWord.id}>
        <div
          className="sensing-background-shift"
          style={{ transform: `translate3d(${backgroundX}px, ${backgroundY}px, 0) scale(${1.035 + cursor.pressure * .025})` }}
          aria-hidden="true"
        >
          <div className="sensing-background-breathe">
            {prefersReducedMotion ? (
              <img
                className="sensing-background"
                src="/assets/haf/visual-refresh/intuitive-flow-field-v1.png"
                alt=""
              />
            ) : (
              <video
                className="sensing-background sensing-background-video"
                src="/assets/haf/sensing/intuitive-flow-seedance-2-5-v1.mp4"
                poster="/assets/haf/visual-refresh/intuitive-flow-field-v1.png"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden="true"
              />
            )}
          </div>
        </div>
        <SensingRippleCanvas cursor={cursor} active={phase === "sensing"} />
        <button className="visual-back sensing-back" onClick={() => { stopSensingAudio(); flow.pop(); }} aria-label="返回">
          <img src="/assets/haf/visual-refresh/back-chevron.svg" alt="" />
        </button>
        <button className="sensing-sound" onClick={toggleSound} disabled={!introReady} aria-label={!introReady ? "提示播放中" : soundEnabled ? "关闭声音" : "开启声音"} aria-pressed={soundEnabled}>
          {soundEnabled ? <SpeakerLoudIcon /> : <SpeakerOffIcon />}
        </button>
        {introAudioStatus === "error" && (
          <button className="sensing-intro-retry" onClick={() => startSensingAudio(dateKey)}>轻触聆听提示</button>
        )}
        <header><small>今日能量感应</small><h1>{introReady ? "让手指随直觉移动" : "先听见此刻"}</h1><p>{introReady ? "不必寻找方向，让颜色回应你的感受。" : "跟随声音，把注意力慢慢带回指尖。"}</p></header>
        <div
          className={`sensing-touch-zone ${introReady ? "" : "sensing-touch-disabled"}`}
          data-scroll-drag="ignore"
          role="slider"
          aria-label="按住并移动手指感应此刻"
          aria-disabled={!introReady}
          aria-valuemin={-100}
          aria-valuemax={100}
          aria-valuenow={Math.round(livePointRef.current.x * 100)}
          aria-valuetext={phase === "locked" ? `${currentWord} · ${currentInsight.primaryChakra.zh}` : phase === "sensing" ? "正在感应，松开手指接收回应" : "尚未选择"}
          tabIndex={introReady ? 0 : -1}
          onPointerDown={beginSensing}
          onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && updateGesture(event)}
          onPointerUp={finishSensing}
          onPointerCancel={() => {
            const start = gestureStartRef.current;
            livePointRef.current = start.point;
            fieldSeedRef.current = start.fieldSeed;
            setCurrentInsight(start.insight);
            setCursor({ ...start.cursor, pressure: .22, sequence: start.cursor.sequence + 1 });
            setPhase("idle");
          }}
        >
          <motion.img
            className="sensing-orb"
            src="/assets/haf/energy-orb-v2.png"
            alt=""
            animate={{
              left: `${cursor.xRatio * 100}%`,
              top: `${cursor.yRatio * 100}%`,
              scale: phase === "locked" ? .12 : .74 + cursor.pressure * .46,
              opacity: phase === "idle" ? .72 : 1,
            }}
            transition={{
              left: { type: "spring", stiffness: 420, damping: 34 },
              top: { type: "spring", stiffness: 420, damping: 34 },
              scale: phase === "locked" ? { duration: .95, ease: [.22, 1, .36, 1] } : { duration: .18 },
            }}
          />
        </div>
        <section className="sensing-word" aria-live="polite">
          <motion.small layout>{!introReady ? "声音正在引导你" : phase === "locked" ? "你停在这个词上——" : phase === "sensing" ? "回应正在汇聚" : "按住屏幕，缓慢移动"}</motion.small>
          <AnimatePresence mode="popLayout">
            {phase === "locked" && (
              <motion.strong
                key={currentWord}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: .91, filter: "blur(18px)", letterSpacing: ".18em" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)", letterSpacing: ".06em" }}
                exit={prefersReducedMotion
                  ? { opacity: 0, transition: { duration: .01 } }
                  : { opacity: 0, y: -4, scale: 1.015, filter: "blur(8px)", transition: { duration: .24, ease: [.4, 0, 1, 1] } }}
                transition={prefersReducedMotion ? { duration: .01 } : {
                  opacity: { duration: 1.35, delay: .24, ease: "linear" },
                  y: { duration: 1.5, delay: .18, ease: [.3, 0, .3, 1] },
                  scale: { duration: 1.55, delay: .18, ease: [.3, 0, .3, 1] },
                  filter: { duration: 1.55, delay: .2, ease: [.3, 0, .3, 1] },
                  letterSpacing: { duration: 1.55, delay: .18, ease: [.3, 0, .3, 1] },
                }}
              >
                {currentWord}
              </motion.strong>
            )}
          </AnimatePresence>
          <p>{!introReady ? "提示结束后，再让手指随直觉移动" : phase === "idle" ? "轻触只唤醒声音，移动或停留后再松开" : phase === "sensing" ? "继续移动，松开手指让它显现" : `${currentInsight.primaryChakra.zh} · ${currentInsight.primaryChakra.themes.slice(0, 2).join(" · ")}`}</p>
        </section>
        <AnimatePresence>
          {phase === "locked" && readyToComplete && (
            <motion.button
              className="sensing-complete"
              onClick={() => {
                if (sensingAudioSession && !sensingAudioSession.music.paused) {
                  fadeSensingMusic(sensingAudioSession, .15, 900);
                }
                flow.push(makeScreen("synthesis"));
              }}
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
  const { lifePath, dayNumber, dateKey, point, fieldSeed } = useJourney();
  const insight = useMemo(() => synthesizeEnergy(point, lifePath, dayNumber, dateKey, fieldSeed), [point, lifePath, dayNumber, dateKey, fieldSeed]);
  useEffect(() => {
    let active = true;
    if (sensingAudioSession && !sensingAudioSession.music.paused) {
      fadeSensingMusic(sensingAudioSession, .15, 900);
    }
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
  const { lifePath, dayNumber, dateKey, point, fieldSeed, resetSensing, favorites, toggleFavorite } = useJourney();
  const insight = useMemo(() => synthesizeEnergy(point, lifePath, dayNumber, dateKey, fieldSeed), [point, lifePath, dayNumber, dateKey, fieldSeed]);
  const readingCacheKey = energyReadingCacheKey(dateKey, dayNumber, insight);
  const energyReading = loadLocal(readingCacheKey, insight.energySummary);
  const [batch, setBatch] = useState(0);
  const [recentCourseIds, setRecentCourseIds] = useState(() => new Set(loadLocal<string[]>(recentCourseStorageKey, [])));
  const [sessionCourseIds, setSessionCourseIds] = useState<string[]>([]);
  const maxRecommendationBatches = useMemo(() => recommendationBatchLimit(insight), [insight]);
  const recommendationLimitReached = batch + 1 >= maxRecommendationBatches;
  const orderedCourses = useMemo(
    () => recommendCourses(insight, recentCourseIds, new Set(sessionCourseIds), lifePath, dayNumber, `${dateKey}:batch-${batch}`),
    [insight, recentCourseIds, sessionCourseIds, lifePath, dayNumber, dateKey, batch],
  );

  useEffect(() => {
    const history = appendCourseHistory(recentCourseIds, orderedCourses.map((course) => course.id));
    window.localStorage.setItem(recentCourseStorageKey, JSON.stringify(history));
  }, [orderedCourses, recentCourseIds]);
  useEffect(() => {
    if (sensingAudioSession && !sensingAudioSession.music.paused) {
      fadeSensingMusic(sensingAudioSession, .12, 1100);
    }
  }, []);

  const refreshCourses = () => {
    setRecentCourseIds((previous) => new Set(appendCourseHistory(previous, orderedCourses.map((course) => course.id))));
    setSessionCourseIds((previous) => appendCourseHistory(previous, orderedCourses.map((course) => course.id)));
    setBatch((value) => value + 1);
  };

  const resense = () => {
    if (sensingAudioSession && !sensingAudioSession.music.paused) {
      fadeSensingMusic(sensingAudioSession, .18, 900);
    }
    resetSensing();
    flow.pop();
  };

  return (
    <EmbeddedScreen className="result-host">
      <div className="result-screen" data-testid="result-screen">
        <button className="visual-back result-back" onClick={resense} aria-label="返回重新感应">
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
                  <button
                    className={`course-heart ${saved ? "saved" : ""}`}
                    onClick={() => toggleFavorite(course.id)}
                    aria-label={`${saved ? "取消收藏" : "收藏"}${course.title}`}
                    aria-pressed={saved}
                  >
                    <svg viewBox="0 0 21 21" aria-hidden="true">
                      <path d="M10.5 18.675 2.22 11.175C-2.28 6.675 4.335-1.965 10.5 5.025c6.165-6.99 12.75 1.68 8.28 6.15L10.5 18.675Z" />
                    </svg>
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
            <button
              className={`result-refresh ${recommendationLimitReached ? "result-refresh-resense" : ""}`}
              onClick={recommendationLimitReached ? resense : refreshCourses}
            >{recommendationLimitReached ? "重新感应" : "换一批"}</button>
          </div>
          {!recommendationLimitReached && <button className="result-resense" onClick={resense}>重新感应</button>}
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

type ScreenId = "loading" | "profile" | "compass" | "synthesis" | "result" | "favorites";

function makeScreen(id: ScreenId): FlowScreen {
  const screens: Record<typeof id, () => ReactNode> = {
    loading: () => <LoadingScreen />,
    profile: () => <ProfileScreen />,
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
