import {
  BookmarkFilledIcon,
  BookmarkIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Cross1Icon,
  LockClosedIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { AnimatePresence, motion } from "motion/react";
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
import { Carousel, FlowStack, MobileScroll, useFlow, type FlowScreen } from "./mobile";
import numberThemesSource from "../skills/haf-numerology/references/number-themes.json";
import chakraModelSource from "../skills/haf-chakra-energy/references/chakra-model.json";
import synthesisModelSource from "../skills/haf-energy-synthesis/references/synthesis-model.json";
import demoCatalogSource from "../skills/haf-course-recommendation/references/demo-courses.json";

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
type EnergyInsight = {
  dailyThemeId: KeywordId;
  dailyTheme: { display: string; guidance: string; reflection_prompt: string };
  keywordId: KeywordId;
  keyword: { display: string; guidance: string; reflection_prompt: string };
  keywordCandidates: KeywordId[];
  primaryChakra: ChakraReading;
  secondaryChakra: ChakraReading;
  poles: Record<EnergyPole, number>;
  direction: {
    horizontal: { id: EnergyPole; label: string };
    vertical: { id: EnergyPole; label: string };
  };
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
  cover_asset: string;
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
};

const JourneyContext = createContext<JourneyState | null>(null);

const defaultProfile: Profile = {
  birth: { year: 1992, month: 8, day: 7 },
  birthTime: "不确定",
  gender: "女性",
  city: "上海",
};

const numberThemes = numberThemesSource.numbers as Record<string, { keywords: string[]; gentle_prompt: string }>;
const chakraModel = chakraModelSource as typeof chakraModelSource & {
  chakras: Record<ChakraId, { zh: string; anchor: Point; themes: string[] }>;
  number_affinity: Record<string, Record<ChakraId, number>>;
};
const synthesisModel = synthesisModelSource as typeof synthesisModelSource & {
  number_keyword: Record<string, KeywordId>;
  chakra_keyword: Record<ChakraId, KeywordId>;
  compass_keyword: Record<EnergyPole, KeywordId>;
  compass_grid_keyword: Record<string, KeywordId>;
  compass_response_power: number;
  compass_labels: Record<EnergyPole, string>;
  keywords: Record<KeywordId, { display: string; guidance: string; reflection_prompt: string }>;
};
const demoCourses = demoCatalogSource.courses as CatalogCourse[];
const analyticsEndpoint = import.meta.env.VITE_HAF_ANALYTICS_ENDPOINT ?? "http://localhost:4174/api/events";

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

function projectChakras(point: Point, lifePath: number, personalDay: number) {
  const poles: Record<EnergyPole, number> = {
    inward: (1 - point.x) / 2,
    outward: (1 + point.x) / 2,
    calm: (1 - point.y) / 2,
    active: (1 + point.y) / 2,
  };
  const lifeAffinity = chakraModel.number_affinity[String(lifePath)] ?? chakraModel.number_affinity[String(reduceNumber(lifePath))];
  const dayAffinity = chakraModel.number_affinity[String(personalDay)];
  const chakras = (Object.keys(chakraModel.chakras) as ChakraId[]).map((id) => {
    const chakra = chakraModel.chakras[id];
    const distanceSquared = (point.x - chakra.anchor.x) ** 2 + (point.y - chakra.anchor.y) ** 2;
    const compassAffinity = Math.exp(-distanceSquared / (2 * chakraModel.sigma ** 2));
    const raw = chakraModel.weights.compass * compassAffinity
      + chakraModel.weights.life_path * lifeAffinity[id]
      + chakraModel.weights.personal_day * dayAffinity[id];
    return {
      id,
      zh: chakra.zh,
      themes: chakra.themes,
      score: Math.round(chakraModel.score.floor + chakraModel.score.span * raw),
      raw,
    };
  }).sort((a, b) => b.raw - a.raw || a.id.localeCompare(b.id));
  return { poles, primary: chakras[0], secondary: chakras[1] };
}

function synthesizeEnergy(point: Point, lifePath: number, personalDay: number): EnergyInsight {
  const projection = projectChakras(point, lifePath, personalDay);
  const keywordIds = Object.keys(synthesisModel.keywords) as KeywordId[];
  const scores = Object.fromEntries(keywordIds.map((id) => [id, 0])) as Record<KeywordId, number>;
  scores[synthesisModel.number_keyword[String(personalDay)]] += synthesisModel.weights.personal_day;
  scores[synthesisModel.number_keyword[String(lifePath)]] += synthesisModel.weights.life_path;
  scores[synthesisModel.chakra_keyword[projection.primary.id]] += synthesisModel.weights.primary_chakra;
  scores[synthesisModel.chakra_keyword[projection.secondary.id]] += synthesisModel.weights.secondary_chakra;
  const horizontalMembership = {
    inward: Math.max(0, -point.x),
    center: Math.max(0, 1 - Math.abs(point.x)),
    outward: Math.max(0, point.x),
  };
  const verticalMembership = {
    calm: Math.max(0, -point.y),
    center: Math.max(0, 1 - Math.abs(point.y)),
    active: Math.max(0, point.y),
  };
  const compassCells = Object.entries(horizontalMembership).flatMap(([horizontalId, horizontalValue]) =>
    Object.entries(verticalMembership)
      .filter(([, verticalValue]) => horizontalValue > 0 && verticalValue > 0)
      .map(([verticalId, verticalValue]) => ({
        id: `${horizontalId}_${verticalId}`,
        value: (horizontalValue * verticalValue) ** synthesisModel.compass_response_power,
      })),
  );
  const compassCellTotal = compassCells.reduce((sum, cell) => sum + cell.value, 0) || 1;
  compassCells.forEach((cell) => {
    scores[synthesisModel.compass_grid_keyword[cell.id]] += synthesisModel.weights.compass_total * cell.value / compassCellTotal;
  });
  const keywordCandidates = keywordIds.sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  const keywordId = keywordCandidates[0];
  const dailyThemeId = synthesisModel.number_keyword[String(personalDay)];
  const horizontal: EnergyPole = projection.poles.inward >= projection.poles.outward ? "inward" : "outward";
  const vertical: EnergyPole = projection.poles.calm >= projection.poles.active ? "calm" : "active";
  const keyword = synthesisModel.keywords[keywordId];
  const dailyTheme = synthesisModel.keywords[dailyThemeId];
  const signalsAlign = dailyThemeId === keywordId;
  const numberTheme = numberThemes[String(personalDay)];
  return {
    dailyThemeId,
    dailyTheme,
    keywordId,
    keyword,
    keywordCandidates,
    primaryChakra: projection.primary,
    secondaryChakra: projection.secondary,
    poles: projection.poles,
    direction: {
      horizontal: { id: horizontal, label: synthesisModel.compass_labels[horizontal] },
      vertical: { id: vertical, label: synthesisModel.compass_labels[vertical] },
    },
    compositeTitle: signalsAlign ? dailyTheme.display : `${keyword.display} · ${dailyTheme.display}`,
    compositeLine: signalsAlign
      ? `今天的主旋律，也正是你此刻最需要靠近的方向。`
      : `以${keyword.display}的方式，靠近今天的${dailyTheme.display}。`,
    energySummary: `今天的主旋律是“${dailyTheme.display}”，此刻更适合从“${keyword.display}”靠近。${projection.primary.zh}与${projection.secondary.zh}提醒你，把注意放在${projection.primary.themes.slice(0, 2).join("与")}上。`,
    chakraSummary: `${projection.primary.zh}是今天较清晰的线索，邀请你留意${projection.primary.themes.slice(0, 2).join("与")}；${projection.secondary.zh}也在提醒你，为${projection.secondary.themes[0]}留一点空间。${numberTheme?.gentle_prompt ?? ""}`,
  };
}

function recommendCourses(insight: EnergyInsight, recentIds: Set<string>): Course[] {
  const intensityValue = { low: 0, medium: 0.5, high: 1 } as const;
  const targetIntensity = insight.poles.active > 0.75 && insight.poles.outward > 0.65
    ? 1
    : insight.poles.active > insight.poles.calm ? 0.5 : 0;
  const targetDuration = targetIntensity === 1 ? 45 : targetIntensity === 0.5 ? 22 : 12;
  const scoreCourse = (course: CatalogCourse) => {
    const primaryMatch = course.chakra_tags.includes(insight.primaryChakra.id) ? 1 : 0;
    const secondaryMatch = course.chakra_tags.includes(insight.secondaryChakra.id) ? 1 : 0;
    const chakraScore = 0.7 * primaryMatch + 0.3 * secondaryMatch;
    const compassScore = course.energy_poles.length
      ? course.energy_poles.reduce((sum, pole) => sum + insight.poles[pole], 0) / course.energy_poles.length
      : 0;
    const keywordScore = Math.max(0, ...course.keyword_tags.map((tag) => {
      if (tag === insight.keywordId) return 1;
      if (tag === insight.dailyThemeId) return 0.82;
      const index = insight.keywordCandidates.slice(1, 3).indexOf(tag);
      return index === 0 ? 0.45 : index === 1 ? 0.25 : 0;
    }));
    const intensityFit = 1 - Math.abs(intensityValue[course.intensity] - targetIntensity);
    const durationFit = Math.max(0, 1 - Math.abs(course.duration_min - targetDuration) / Math.max(targetDuration, 12));
    const practiceFit = 0.6 * intensityFit + 0.4 * durationFit;
    const recencyFit = recentIds.has(course.course_id) ? 0 : 1;
    return 0.35 * chakraScore + 0.25 * compassScore + 0.2 * keywordScore + 0.1 * practiceFit + 0.1 * recencyFit;
  };
  const candidates = demoCourses.filter((course) => course.status === "published").map((course) => ({ course, score: scoreCourse(course) }));
  const selected: CatalogCourse[] = [];
  while (selected.length < 3 && candidates.length) {
    const ranked = candidates.map((candidate) => {
      const formatPenalty = selected.some((course) => course.format === candidate.course.format) ? 0.08 : 0;
      const chakraPenalty = selected.some((course) => course.chakra_tags[0] === candidate.course.chakra_tags[0]) ? 0.04 : 0;
      return { ...candidate, adjusted: candidate.score - formatPenalty - chakraPenalty };
    }).sort((a, b) => b.adjusted - a.adjusted || a.course.course_id.localeCompare(b.course.course_id));
    const next = ranked[0].course;
    selected.push(next);
    candidates.splice(candidates.findIndex((candidate) => candidate.course.course_id === next.course_id), 1);
  }
  return selected.map((course) => {
    const matchesMoment = course.keyword_tags.includes(insight.keywordId);
    const matchesDailyTheme = course.keyword_tags.includes(insight.dailyThemeId);
    const matchedKeyword = insight.keywordCandidates.slice(1, 3).find((id) => course.keyword_tags.includes(id));
    const fit = matchesMoment && matchesDailyTheme && insight.keywordId !== insight.dailyThemeId
      ? `它同时回应今天的“${insight.dailyTheme.display}”和此刻的“${insight.keyword.display}”：${course.fit_statement}。`
      : matchesMoment
        ? `顺着此刻的“${insight.keyword.display}”，${course.fit_statement}。`
        : matchesDailyTheme
          ? `回应今天的“${insight.dailyTheme.display}”，${course.fit_statement}。`
          : matchedKeyword
            ? `今天的“${synthesisModel.keywords[matchedKeyword].display}”适合从这里开始：${course.fit_statement}。`
      : course.chakra_tags.includes(insight.primaryChakra.id)
        ? `它回应了今天较清晰的${insight.primaryChakra.zh}线索：${course.fit_statement}。`
        : `顺着${insight.direction.horizontal.label}的能量，${course.fit_statement}。`;
    return {
      id: course.course_id,
      title: course.title,
      meta: `${course.duration_min}分钟 · ${course.format_label}`,
      fit,
      image: course.cover_asset,
    };
  });
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function JourneyProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState(() => loadLocal("haf-journey-profile", defaultProfile));
  const [onboardingComplete, setOnboardingComplete] = useState(() => loadLocal("haf-journey-onboarded", false));
  const [point, setPoint] = useState<Point>({ x: -0.42, y: -0.24 });
  const [favorites, setFavorites] = useState<string[]>(() => loadLocal("haf-journey-favorites", []));
  const moduleViewTracked = useRef(false);
  const today = useMemo(() => new Date(), []);
  const numerology = useMemo(() => calculateNumerology(profile.birth, today), [profile.birth, today]);

  useEffect(() => window.localStorage.setItem("haf-journey-profile", JSON.stringify(profile)), [profile]);
  useEffect(() => window.localStorage.setItem("haf-journey-onboarded", JSON.stringify(onboardingComplete)), [onboardingComplete]);
  useEffect(() => window.localStorage.setItem("haf-journey-favorites", JSON.stringify(favorites)), [favorites]);
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
          const course = demoCourses.find((item) => item.course_id === id);
          trackEnergyEvent("energy_course_favorited", { course_id: id, course_title: course?.title ?? id });
        }
      },
      lifePath: numerology.lifePath,
      dayNumber: numerology.personalDay,
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
      <motion.img
        className="ambient-flow ambient-flow-primary"
        src="/assets/haf/energy-flow-v3.png"
        alt=""
        animate={{ x: [0, 9, -5, 0], y: [-8, 8, -4, -8], scale: [1.03, 1.085, 1.04, 1.03] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.img
        className="ambient-flow ambient-flow-soft"
        src="/assets/haf/energy-flow-v3.png"
        alt=""
        animate={{ x: [7, -8, 4, 7], y: [11, -7, 5, 11], scale: [1.12, 1.04, 1.09, 1.12], opacity: [0.11, 0.24, 0.15, 0.11] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
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
  const { onboardingComplete } = useJourney();
  useEffect(() => {
    const timer = window.setTimeout(() => flow.replace(makeScreen(onboardingComplete ? "return" : "welcome")), 1650);
    return () => window.clearTimeout(timer);
  }, [flow, onboardingComplete]);

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
  const { dayNumber } = useJourney();
  const todayLabel = useMemo(() => new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date()), []);
  const greeting = dailyGreetings[dayNumber] ?? dailyGreetings[1];

  return (
    <EmbeddedScreen className="return-host">
      <div className="return-screen" data-testid="return-screen">
        <header>
          <small>{todayLabel}</small>
          <h1>欢迎回来</h1>
          <p>今天，也为自己留一点时间。</p>
        </header>
        <motion.div
          className="return-greeting"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.75, ease: "easeOut" }}
        >
          <span>今日问候 · {greeting.theme}</span>
          <strong>{greeting.headline}</strong>
          <i aria-hidden="true" />
          <p>{greeting.body}</p>
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
        <div className="energy-orb welcome-orb"><OrbLayers /></div>
        <div className="welcome-copy">
          <small>一次温柔的自我探索</small>
          <h1>让今天，<br />从认识自己开始</h1>
          <p>我们会借由你的出生线索与此刻的能量，陪你看见今天更适合靠近的方向。</p>
        </div>
        <div className="privacy-note"><LockClosedIcon /><span>资料只用于生成你的能量线索，你可以随时修改或清除。</span></div>
        <GlowButton onClick={() => flow.push(makeScreen("profile"))}>开始这段旅程</GlowButton>
      </div>
    </EmbeddedScreen>
  );
}

function ProfileScreen() {
  const flow = useFlow();
  const { profile, setProfile, completeOnboarding } = useJourney();
  const adjust = (field: keyof Profile["birth"], amount: number) => {
    const ranges = { year: [1936, 2010], month: [1, 12], day: [1, 28] } as const;
    const [minimum, maximum] = ranges[field];
    const current = profile.birth[field];
    const next = current + amount > maximum ? minimum : current + amount < minimum ? maximum : current + amount;
    setProfile({ ...profile, birth: { ...profile.birth, [field]: next } });
  };
  const setChoice = (field: "birthTime" | "gender" | "city", value: string) => setProfile({ ...profile, [field]: value });

  return (
    <EmbeddedScreen className="profile-host">
      <div className="profile-screen" data-testid="profile-screen">
        <header><small>只需要一次</small><h1>让今天先认识你</h1><p>年龄会由生日自动计算，时间不确定也没有关系。</p></header>
        <section className="birth-picker" aria-label="出生日期">
          {(["year", "month", "day"] as const).map((field) => (
            <div key={field}>
              <span>{field === "year" ? "年" : field === "month" ? "月" : "日"}</span>
              <button onClick={() => adjust(field, 1)} aria-label={`${field}增加`}>＋</button>
              <strong>{profile.birth[field]}</strong>
              <button onClick={() => adjust(field, -1)} aria-label={`${field}减少`}>−</button>
            </div>
          ))}
        </section>
        <ProfileChoices label="出生时间" values={["清晨", "白天", "夜晚", "不确定"]} selected={profile.birthTime} onSelect={(value) => setChoice("birthTime", value)} />
        <div className="profile-columns">
          <ProfileChoices label="性别（可选）" values={["女性", "男性", "不设限"]} selected={profile.gender} onSelect={(value) => setChoice("gender", value)} compact />
          <ProfileChoices label="当前城市" values={["上海", "北京", "深圳", "其他"]} selected={profile.city} onSelect={(value) => setChoice("city", value)} compact />
        </div>
        <GlowButton onClick={() => { completeOnboarding(); flow.push(makeScreen("compass")); }}>保存并感应此刻</GlowButton>
      </div>
    </EmbeddedScreen>
  );
}

function ProfileChoices({ label, values, selected, onSelect, compact = false }: { label: string; values: string[]; selected: string; onSelect: (value: string) => void; compact?: boolean }) {
  return (
    <section className={`profile-choice ${compact ? "compact" : ""}`}>
      <span>{label}</span>
      <div>{values.map((value) => <button key={value} className={selected === value ? "selected" : ""} onClick={() => onSelect(value)}>{selected === value && <CheckIcon />}{value}</button>)}</div>
    </section>
  );
}

function energyMeaning(point: Point) {
  if (point.x < -0.18 && point.y < -0.12) return { direction: "向内沉淀", chakra: "心轮", line: "你正在把向外的力量收回来，重新听见自己的感受。" };
  if (point.x > 0.3) return { direction: "向外连接", chakra: "喉轮", line: "你想靠近真实的交流，也准备让自己的声音被听见。" };
  if (point.y > 0.28) return { direction: "唤醒活力", chakra: "太阳轮", line: "你的身体正在寻找行动感，让力量重新回到当下。" };
  return { direction: "安静平衡", chakra: "眉心轮", line: "你正在安静地整理内在，让答案慢慢变得清晰。" };
}

function EnergyCompass() {
  const { point, setPoint } = useJourney();
  const mapRef = useRef<HTMLDivElement>(null);
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPoint({
      x: Math.max(-0.88, Math.min(0.88, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)),
      y: Math.max(-0.88, Math.min(0.88, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)),
    });
  };
  return (
    <div className="compass-shell">
      <span className="axis-label top">安静沉淀</span>
      <span className="axis-label left">向内独处</span>
      <span className="axis-label right">向外连接</span>
      <span className="axis-label bottom">唤醒活力</span>
      <div
        ref={mapRef}
        className="compass-map"
        data-scroll-drag="ignore"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); move(event); }}
        onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && move(event)}
      >
        <i className="axis horizontal" /><i className="axis vertical" />
        <i className="ring ring-one" /><i className="ring ring-two" />
        <motion.span
          className="energy-orb compass-orb"
          role="img"
          aria-label="你此刻的能量光点"
          animate={{ left: `${(point.x + 1) * 50}%`, top: `${(point.y + 1) * 50}%`, scale: [1, 1.05, 1] }}
          transition={{ left: { type: "spring", stiffness: 320, damping: 28 }, top: { type: "spring", stiffness: 320, damping: 28 }, scale: { duration: 2.6, repeat: Infinity } }}
        ><OrbLayers /></motion.span>
      </div>
    </div>
  );
}

function CompassScreen() {
  const flow = useFlow();
  const { point } = useJourney();
  const reading = energyMeaning(point);
  return (
    <EmbeddedScreen className="compass-host">
      <div className="compass-screen" data-testid="compass-screen">
        <header><small>捕捉此刻</small><h1>把光点放在更接近你的位置</h1><p>不用思考答案，跟随手指停下来的地方。</p></header>
        <EnergyCompass />
        <AnimatePresence mode="wait">
          <motion.div className="live-reading" key={reading.direction} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <small>此刻的方向</small><strong>{reading.direction}</strong><span>{reading.line}</span>
          </motion.div>
        </AnimatePresence>
        <GlowButton onClick={() => flow.push(makeScreen("synthesis"))}>完成感应</GlowButton>
      </div>
    </EmbeddedScreen>
  );
}

function SynthesisScreen() {
  const flow = useFlow();
  useEffect(() => {
    const timer = window.setTimeout(() => flow.replace(makeScreen("result")), 1750);
    return () => window.clearTimeout(timer);
  }, [flow]);
  return (
    <EmbeddedScreen className="synthesis-host">
      <div className="synthesis-screen" data-testid="synthesis-screen">
        <div className="synthesis-orbits"><motion.div className="energy-orb synthesis-orb" animate={{ y: [-12, 16, -12], rotate: [0, 10, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}><OrbLayers /></motion.div></div>
        <small>正在合成今日线索</small>
        <h1>让数字、脉轮与此刻的心流<br />慢慢靠近彼此</h1>
        <div className="signal-row"><span>灵数</span><i /><span>脉轮</span><i /><span>能量</span></div>
      </div>
    </EmbeddedScreen>
  );
}

function ResultScreen() {
  const flow = useFlow();
  const { lifePath, dayNumber, point, favorites, toggleFavorite, resetOnboarding } = useJourney();
  const insight = useMemo(() => synthesizeEnergy(point, lifePath, dayNumber), [point, lifePath, dayNumber]);
  const recentCourseIds = useMemo(() => new Set(loadLocal<string[]>("haf-journey-recent-courses", [])), []);
  const orderedCourses = useMemo(() => recommendCourses(insight, recentCourseIds), [insight, recentCourseIds]);

  useEffect(() => {
    window.localStorage.setItem("haf-journey-recent-courses", JSON.stringify(orderedCourses.map((course) => course.id)));
  }, [orderedCourses]);

  return (
    <EmbeddedScreen className="result-host">
      <div className="result-screen" data-testid="result-screen">
        <section className="result-insight">
          <div className="result-copy">
            <small>今日能量回响</small>
            <h1>{insight.compositeTitle}</h1>
            <p>{insight.compositeLine}</p>
          </div>
          <div className="energy-orb result-orb"><OrbLayers /></div>
          <div className="energy-facets" aria-label="今日能量的三个线索">
            <span><small>今日主旋律</small><strong>{insight.dailyTheme.display}</strong><em>灵数 {dayNumber}</em></span>
            <span><small>此刻入口</small><strong>{insight.keyword.display}</strong><em>{insight.direction.horizontal.label}</em></span>
            <span><small>能量落点</small><strong>{insight.primaryChakra.zh}</strong><em>{insight.primaryChakra.themes[0]}</em></span>
          </div>
          <div className="daily-summary"><h2>今日能量总结</h2><p>{insight.energySummary}</p></div>
        </section>
        <section className="recommendations">
          <div className="recommendation-heading">
            <div><small>顺着这股能量</small><h2>为你推荐 3 节课程</h2></div>
            {favorites.length ? (
              <button className="favorites-entry" onClick={() => flow.push(makeScreen("favorites"))}>已收藏 {favorites.length}<ChevronRightIcon /></button>
            ) : <span>向左滑动查看</span>}
          </div>
          <Carousel className="course-rail" contentClassName="course-track" ariaLabel="今日推荐课程">
            {orderedCourses.map((course) => {
              const saved = favorites.includes(course.id);
              return (
                <article className="course-card" data-testid="course-card" key={course.id}>
                  <img src={course.image} alt="" />
                  <div className="course-copy"><small>今日契合点</small><h3>{course.title}</h3><p>{course.fit}</p><span>{course.meta}</span></div>
                  <button className={saved ? "saved" : ""} onClick={() => toggleFavorite(course.id)} aria-label={`${saved ? "取消收藏" : "收藏"}${course.title}`}>
                    {saved ? <BookmarkFilledIcon /> : <BookmarkIcon />}<span>{saved ? "已收藏" : "收藏"}</span>
                  </button>
                </article>
              );
            })}
          </Carousel>
        </section>
        <footer className="result-actions">
          <GlowButton quiet onClick={() => flow.pop()}><ResetIcon />重新感应</GlowButton>
          <button className="profile-reset" onClick={() => { resetOnboarding(); flow.replace(makeScreen("welcome")); }}>修改资料</button>
        </footer>
      </div>
    </EmbeddedScreen>
  );
}

function FavoritesScreen() {
  const flow = useFlow();
  const { favorites, toggleFavorite } = useJourney();
  const savedCourses = demoCourses.filter((course) => favorites.includes(course.course_id));

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
                  <em>{course.duration_min}分钟</em>
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
            <p>先从最轻的一节开始，也许比一次做很多选择更靠近你。</p>
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
