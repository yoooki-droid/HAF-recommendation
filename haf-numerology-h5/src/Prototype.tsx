import {
  BookmarkFilledIcon,
  BookmarkIcon,
  CardStackIcon,
  CheckIcon,
  ChevronRightIcon,
  DotFilledIcon,
  HomeIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { motion } from "motion/react";
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

type Point = { x: number; y: number };
type EnergyChoice = "slow" | "awake" | "connect";
type Course = {
  id: string;
  title: string;
  eyebrow: string;
  time: string;
  place: string;
  price: number;
  image: string;
};

type ExperienceState = {
  birth: { year: number; month: number; day: number };
  setBirth: (value: ExperienceState["birth"]) => void;
  current: Point;
  setCurrent: (value: Point) => void;
  choice: EnergyChoice;
  chooseEnergy: (value: EnergyChoice) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  lifeNumber: number;
  dayNumber: number;
  displayDate: string;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
};

const ExperienceContext = createContext<ExperienceState | null>(null);

const courses: Course[] = [
  { id: "sound", eyebrow: "安定身体 · 60 MIN", title: "颂钵呼吸体验", time: "10月17日 周六 15:30", place: "公寓舞台", price: 200, image: "/assets/haf/course-sound-healing.png" },
  { id: "color", eyebrow: "听见内在 · 90 MIN", title: "色彩能量觉察", time: "10月18日 周日 10:00", place: "光线厅", price: 260, image: "/assets/haf/course-color-awareness.png" },
  { id: "voice", eyebrow: "温和连接 · 60 MIN", title: "共振吟唱小组", time: "10月18日 周日 14:00", place: "天空厅", price: 220, image: "/assets/haf/course-resonance-circle.png" },
];

const numberMeanings: Record<number, { name: string; prompt: string }> = {
  1: { name: "开始", prompt: "先迈出很小的一步" },
  2: { name: "连接", prompt: "靠近真正让你安心的人" },
  3: { name: "表达", prompt: "让感受有一个出口" },
  4: { name: "稳定", prompt: "先把自己放回地面" },
  5: { name: "探索", prompt: "对未知保留一点好奇" },
  6: { name: "滋养", prompt: "先照顾此刻的自己" },
  7: { name: "内省", prompt: "安静听见心里的声音" },
  8: { name: "行动", prompt: "把能量留给重要的事" },
  9: { name: "放下", prompt: "轻轻放下不再需要的重量" },
};

const chakraPalette = [
  { name: "海底轮", color: "#ee6b66" },
  { name: "生殖轮", color: "#f29a54" },
  { name: "太阳轮", color: "#e8c350" },
  { name: "心轮", color: "#72c493" },
  { name: "喉轮", color: "#65b8e6" },
  { name: "眉心轮", color: "#7185d5" },
  { name: "顶轮", color: "#aa83d2" },
];

const energyOptions: Array<{ id: EnergyChoice; label: string; point: Point }> = [
  { id: "slow", label: "想慢下来", point: { x: -0.42, y: -0.34 } },
  { id: "awake", label: "想被唤醒", point: { x: 0.08, y: 0.56 } },
  { id: "connect", label: "想和人连接", point: { x: 0.55, y: 0.04 } },
];

function reduceNumber(value: number) {
  let result = Math.abs(value);
  while (result > 9) result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return result || 1;
}

function digits(value: number | string) {
  return String(value).replace(/\D/g, "").split("").reduce((sum, digit) => sum + Number(digit), 0);
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function useExperience() {
  const value = useContext(ExperienceContext);
  if (!value) throw new Error("ExperienceContext is missing");
  return value;
}

function ExperienceProvider({ children }: { children: ReactNode }) {
  const [birth, setBirth] = useState(() => loadLocal("haf-birth", { year: 1992, month: 8, day: 17 }));
  const [current, setCurrent] = useState<Point>({ x: -0.42, y: -0.34 });
  const [choice, setChoice] = useState<EnergyChoice>("slow");
  const [favorites, setFavorites] = useState<string[]>(() => loadLocal("haf-favorites", []));
  const [onboardingComplete, setOnboardingComplete] = useState(() => loadLocal("haf-v2-onboarded", false));
  const today = useMemo(() => new Date(), []);
  const lifeNumber = reduceNumber(digits(`${birth.year}${birth.month}${birth.day}`));
  const dayNumber = reduceNumber(digits(birth.month) + digits(birth.day) + digits(today.getFullYear()) + digits(today.getMonth() + 1) + digits(today.getDate()));
  const displayDate = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(today);

  useEffect(() => window.localStorage.setItem("haf-birth", JSON.stringify(birth)), [birth]);
  useEffect(() => window.localStorage.setItem("haf-favorites", JSON.stringify(favorites)), [favorites]);
  useEffect(() => window.localStorage.setItem("haf-v2-onboarded", JSON.stringify(onboardingComplete)), [onboardingComplete]);

  const chooseEnergy = (value: EnergyChoice) => {
    setChoice(value);
    setCurrent(energyOptions.find((option) => option.id === value)?.point ?? current);
  };

  return <ExperienceContext.Provider value={{
    birth,
    setBirth,
    current,
    setCurrent,
    choice,
    chooseEnergy,
    favorites,
    toggleFavorite: (id) => setFavorites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]),
    lifeNumber,
    dayNumber,
    displayDate,
    onboardingComplete,
    completeOnboarding: () => setOnboardingComplete(true),
  }}>{children}</ExperienceContext.Provider>;
}

function AppFooter() {
  const flow = useFlow();
  const { favorites } = useExperience();
  return <nav className="bottom-nav" aria-label="主导航">
    <button onClick={() => flow.replace(makeScreen("feeling"))}><HomeIcon /><span>首页</span></button>
    <button onClick={() => flow.replace(makeScreen("courses"))}><MagicWandIcon /><span>工作坊</span></button>
    <button className="ticket-entry" onClick={() => flow.replace(makeScreen("feeling"))}><i><CardStackIcon /></i><span>票夹</span></button>
    <button onClick={() => flow.replace(makeScreen("courses"))}><MagnifyingGlassIcon /><span>发现</span></button>
    <button className="nav-with-badge" onClick={() => flow.replace(makeScreen("favorites"))}><PersonIcon /><span>我的</span>{favorites.length > 0 && <b>{favorites.length}</b>}</button>
  </nav>;
}

function ScrollScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <MobileScroll className={`app-screen ${className}`}><main className="screen-content">{children}</main></MobileScroll>;
}

function PrimaryButton({ children, onClick, secondary = false }: { children: ReactNode; onClick: () => void; secondary?: boolean }) {
  return <button className={`primary-button ${secondary ? "secondary" : ""}`} onClick={onClick}>{children}<ChevronRightIcon /></button>;
}

function BirthScreen() {
  const flow = useFlow();
  const { birth, setBirth, completeOnboarding } = useExperience();
  const adjust = (field: "year" | "month" | "day", amount: number) => {
    const ranges = { year: [1936, 2010], month: [1, 12], day: [1, 31] } as const;
    const [minimum, maximum] = ranges[field];
    const next = birth[field] + amount;
    setBirth({ ...birth, [field]: next > maximum ? minimum : next < minimum ? maximum : next });
  };
  return <ScrollScreen className="immersive-screen birth-screen">
    <div className="page-heading"><h1>探索本心</h1><p>从你的生日，开始今天的旅程</p></div>
    <section className="flow-card birth-card">
      <small>只需一次</small>
      <h2>你的生日</h2>
      <div className="birth-fields">
        {(["year", "month", "day"] as const).map((field) => <div key={field}>
          <span>{field === "year" ? "年" : field === "month" ? "月" : "日"}</span>
          <button onClick={() => adjust(field, 1)}>＋</button>
          <strong>{birth[field]}</strong>
          <button onClick={() => adjust(field, -1)}>−</button>
        </div>)}
      </div>
      <PrimaryButton onClick={() => { completeOnboarding(); flow.replace(makeScreen("feeling")); }}>开始探索</PrimaryButton>
    </section>
  </ScrollScreen>;
}

function FeelingScreen() {
  const flow = useFlow();
  const { choice, chooseEnergy, dayNumber } = useExperience();
  return <ScrollScreen className="immersive-screen feeling-screen">
    <div className="page-heading"><h1>探索本心</h1></div>
    <div className="step-row"><strong>1 / 3</strong><span><i className="active" /><i /><i /></span></div>
    <section className="flow-card feeling-card">
      <div className="card-copy">
        <small>今天，</small>
        <h2>你的能量更像哪一种？</h2>
        <p>选择最接近此刻的状态</p>
      </div>
      <div className="energy-options">
        {energyOptions.map((option) => {
          const selected = choice === option.id;
          return <button key={option.id} className={selected ? "selected" : ""} onClick={() => chooseEnergy(option.id)}>
            <i>{selected && <CheckIcon />}</i><strong>{option.label}</strong>
          </button>;
        })}
      </div>
      <div className="card-actions"><span>今日关键词 · {numberMeanings[dayNumber].name}</span><button onClick={() => flow.push(makeScreen("compass"))}>继续<ChevronRightIcon /></button></div>
    </section>
  </ScrollScreen>;
}

function pointMeaning(point: Point) {
  if (point.y < -0.24 && point.x < -0.18) return "想先安静下来，重新听见自己";
  if (point.y > 0.28) return "想唤醒身体，找回向前的力量";
  if (point.x > 0.28) return "想向外连接，也想被温柔接住";
  return "想让能量慢慢回到平衡";
}

function deriveInsight(point: Point) {
  if (point.x > 0.28) return { index: 3, line: "先接住自己的感受，再决定要靠近谁", course: courses[2] };
  if (point.y > 0.28) return { index: 2, line: "先让身体醒来，再处理脑海里的答案", course: courses[0] };
  if (point.x < -0.18 && point.y < -0.18) return { index: 5, line: "给自己一点安静，答案会慢慢变清楚", course: courses[1] };
  return { index: 4, line: "把那句没有说出口的话，轻轻说给自己听", course: courses[1] };
}

function EnergyMap() {
  const { current, setCurrent } = useExperience();
  const ref = useRef<HTMLDivElement>(null);
  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setCurrent({
      x: Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)),
      y: Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)),
    });
  };
  return <div className="energy-map-shell">
    <span className="map-label top">安静沉淀</span>
    <span className="map-label left">向内独处</span>
    <span className="map-label right">向外连接</span>
    <span className="map-label bottom">唤醒活力</span>
    <div ref={ref} className="energy-map" data-scroll-drag="ignore" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); update(event); }} onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && update(event)}>
      <span className="map-axis horizontal" /><span className="map-axis vertical" />
      <span className="orbit orbit-one" /><span className="orbit orbit-two" />
      <motion.img
        className="energy-orb"
        src="/assets/haf/energy-orb-v2.png"
        alt="你此刻的能量光点"
        animate={{ left: `${(current.x + 1) * 50}%`, top: `${(current.y + 1) * 50}%`, scale: [1, 1.06, 1] }}
        transition={{ left: { type: "spring", stiffness: 300, damping: 28 }, top: { type: "spring", stiffness: 300, damping: 28 }, scale: { duration: 2.8, repeat: Infinity } }}
      />
    </div>
  </div>;
}

function CompassScreen() {
  const flow = useFlow();
  const { current } = useExperience();
  return <ScrollScreen className="immersive-screen compass-screen">
    <div className="page-heading"><h1>探索本心</h1><p>把光点放在更接近你当下的位置</p></div>
    <div className="step-row compact"><strong>2 / 3</strong><span><i className="active" /><i className="active" /><i /></span></div>
    <section className="flow-card compass-card"><EnergyMap /></section>
    <motion.div className="instant-reading" key={pointMeaning(current)} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
      <DotFilledIcon /><strong>此刻的你，<br />{pointMeaning(current)}</strong>
    </motion.div>
    <PrimaryButton onClick={() => flow.push(makeScreen("insight"))}>看见我的能量</PrimaryButton>
  </ScrollScreen>;
}

function InsightScreen() {
  const flow = useFlow();
  const { current, dayNumber, favorites, toggleFavorite } = useExperience();
  const insight = deriveInsight(current);
  const chakra = chakraPalette[insight.index];
  const course = insight.course;
  const saved = favorites.includes(course.id);
  return <ScrollScreen className="immersive-screen insight-screen">
    <div className="page-heading"><h1>探索本心</h1></div>
    <div className="step-row"><strong>3 / 3</strong><span><i className="active" /><i className="active" /><i className="active" /></span></div>
    <section className="flow-card insight-card">
      <small>今天的能量关键词</small>
      <h2>{numberMeanings[dayNumber].name}</h2>
      <p>{numberMeanings[dayNumber].prompt}</p>
      <div className="chakra-focus">
        <div className="chakra-dots" aria-label={`脉轮线索：${chakra.name}`}>
          {chakraPalette.map((item, index) => <DotFilledIcon key={item.name} style={{ color: item.color, opacity: index === insight.index ? 1 : .34 }} />)}
        </div>
        <span>脉轮线索</span><strong>{chakra.name}</strong>
        <p>{insight.line}</p>
      </div>
    </section>
    <article className="single-course">
      <img src={course.image} alt="" />
      <div><small>为此刻推荐</small><strong>{course.title}</strong><span>{course.time} · {course.place}</span></div>
      <button onClick={() => toggleFavorite(course.id)} aria-label={saved ? "取消收藏" : "收藏课程"}>{saved ? <BookmarkFilledIcon /> : <BookmarkIcon />}</button>
    </article>
    <PrimaryButton onClick={() => { if (!saved) toggleFavorite(course.id); flow.push(makeScreen("courses")); }}>{saved ? "已收藏，看看其他体验" : "收藏并看看其他体验"}</PrimaryButton>
    <button className="quiet-action" onClick={() => flow.replace(makeScreen("feeling"))}>重新感受一次</button>
  </ScrollScreen>;
}

function CoursesScreen() {
  const flow = useFlow();
  const { favorites, toggleFavorite } = useExperience();
  return <ScrollScreen className="immersive-screen courses-screen">
    <div className="page-heading"><h1>为你推荐</h1><p>只收藏真正让你有感觉的体验</p></div>
    <Carousel className="course-carousel" contentClassName="course-carousel-content" ariaLabel="推荐体验">
      {courses.map((course) => {
        const saved = favorites.includes(course.id);
        return <article className="course-card" key={course.id}>
          <img src={course.image} alt="" />
          <div className="course-body"><small>{course.eyebrow}</small><h2>{course.title}</h2><p>{course.time}<br />{course.place}</p><div><b>¥{course.price}</b><button onClick={() => toggleFavorite(course.id)}>{saved ? "已收藏" : "收藏"}</button></div></div>
        </article>;
      })}
    </Carousel>
    <PrimaryButton secondary onClick={() => flow.replace(makeScreen("feeling"))}>回到探索</PrimaryButton>
  </ScrollScreen>;
}

function FavoritesScreen() {
  const flow = useFlow();
  const { favorites, toggleFavorite } = useExperience();
  const saved = courses.filter((course) => favorites.includes(course.id));
  return <ScrollScreen className="immersive-screen favorites-screen">
    <div className="page-heading"><h1>我的收藏</h1><p>{saved.length ? "这些体验让你心里有过一动" : "还没有收藏体验"}</p></div>
    <div className="favorite-list">
      {saved.map((course) => <article key={course.id}><img src={course.image} alt="" /><div><strong>{course.title}</strong><span>{course.time}</span></div><button onClick={() => toggleFavorite(course.id)}><BookmarkFilledIcon /></button></article>)}
    </div>
    <PrimaryButton onClick={() => flow.replace(makeScreen(saved.length ? "courses" : "feeling"))}>{saved.length ? "继续看看" : "开始探索"}</PrimaryButton>
  </ScrollScreen>;
}

function makeScreen(id: string): FlowScreen {
  const screens: Record<string, () => ReactNode> = {
    birth: () => <BirthScreen />,
    feeling: () => <FeelingScreen />,
    compass: () => <CompassScreen />,
    insight: () => <InsightScreen />,
    courses: () => <CoursesScreen />,
    favorites: () => <FavoritesScreen />,
  };
  return {
    id,
    headerHeight: 0,
    footer: id === "birth" ? undefined : () => <AppFooter />,
    footerHeight: id === "birth" ? 0 : 76,
    render: screens[id],
  };
}

function PrototypeFlow() {
  const { onboardingComplete } = useExperience();
  return <FlowStack initial={makeScreen(onboardingComplete ? "feeling" : "birth")} />;
}

export default function Prototype() {
  return <ExperienceProvider><PrototypeFlow /></ExperienceProvider>;
}
