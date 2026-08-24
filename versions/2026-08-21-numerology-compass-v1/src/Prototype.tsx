import {
  ArrowLeftIcon,
  BookmarkFilledIcon,
  BookmarkIcon,
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  Cross1Icon,
  HeartIcon,
  HomeIcon,
  PersonIcon,
  ReloadIcon,
  StarIcon,
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

type Point = { x: number; y: number };
type HistoryItem = { id: number; date: string; current: Point; desired: Point; dayNumber: number };
type Course = {
  id: string;
  title: string;
  eyebrow: string;
  time: string;
  place: string;
  price: number;
  image: string;
  tags: string[];
};

type ExperienceState = {
  birth: { year: number; month: number; day: number };
  setBirth: (value: ExperienceState["birth"]) => void;
  current: Point;
  setCurrent: (value: Point) => void;
  desired: Point;
  setDesired: (value: Point) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;
  history: HistoryItem[];
  saveJourney: () => void;
  dayOffset: number;
  nextDay: () => void;
  lifeNumber: number;
  dayNumber: number;
  displayDate: string;
};

const ExperienceContext = createContext<ExperienceState | null>(null);

const courses: Course[] = [
  {
    id: "sound",
    eyebrow: "安定身体 · 60 MIN",
    title: "颂钵呼吸体验",
    time: "10月17日 周六 15:30–16:30",
    place: "公寓舞台",
    price: 200,
    image: "/assets/haf/course-sound-healing.png",
    tags: ["稳定", "内省"],
  },
  {
    id: "color",
    eyebrow: "听见内在 · 90 MIN",
    title: "色彩能量觉察",
    time: "10月18日 周日 10:00–11:30",
    place: "光线厅",
    price: 260,
    image: "/assets/haf/course-color-awareness.png",
    tags: ["表达", "探索"],
  },
  {
    id: "voice",
    eyebrow: "温和连接 · 60 MIN",
    title: "共振吟唱小组",
    time: "10月18日 周日 14:00–15:00",
    place: "天空厅",
    price: 220,
    image: "/assets/haf/course-resonance-circle.png",
    tags: ["连接", "表达"],
  },
];

const numberMeanings: Record<number, { name: string; line: string; prompt: string }> = {
  1: { name: "开始", line: "今天适合从一个小动作开始。", prompt: "什么事值得我先迈出一步？" },
  2: { name: "连接", line: "今天的答案，可能在一段关系里。", prompt: "我想靠近谁，也想被谁听见？" },
  3: { name: "表达", line: "让没说出口的感受有一个形状。", prompt: "如果不怕被评价，我会说什么？" },
  4: { name: "稳定", line: "先把身体放回稳稳的地面。", prompt: "什么能让我重新感到踏实？" },
  5: { name: "探索", line: "允许自己偏离熟悉的路线一次。", prompt: "今天，我愿意对什么保持好奇？" },
  6: { name: "滋养", line: "照顾自己，也照顾重要的连接。", prompt: "此刻的我真正需要什么照料？" },
  7: { name: "内省", line: "答案不必马上出现，先听一听。", prompt: "安静下来后，什么声音最清楚？" },
  8: { name: "行动", line: "把能量放到真正重要的事情上。", prompt: "哪一个决定能让我更有力量？" },
  9: { name: "放下", line: "为旧的章节留一个温柔的句号。", prompt: "我可以不再背着什么前进？" },
};

function reduceNumber(value: number) {
  let result = Math.abs(value);
  while (result > 9) result = String(result).split("").reduce((sum, digit) => sum + Number(digit), 0);
  return result || 1;
}

function digits(value: number | string) {
  return String(value).replace(/\D/g, "").split("").reduce((sum, digit) => sum + Number(digit), 0);
}

function useExperience() {
  const value = useContext(ExperienceContext);
  if (!value) throw new Error("ExperienceContext is missing");
  return value;
}

function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function ExperienceProvider({ children }: { children: ReactNode }) {
  const [birth, setBirth] = useState(() => loadLocal("haf-birth", { year: 1992, month: 8, day: 17 }));
  const [current, setCurrent] = useState<Point>({ x: -0.28, y: 0.18 });
  const [desired, setDesired] = useState<Point>({ x: 0.36, y: -0.38 });
  const [favorites, setFavorites] = useState<string[]>(() => loadLocal("haf-favorites", []));
  const [history, setHistory] = useState<HistoryItem[]>(() => loadLocal("haf-history", []));
  const [dayOffset, setDayOffset] = useState(0);

  const explorationDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date;
  }, [dayOffset]);

  const lifeNumber = reduceNumber(digits(`${birth.year}${birth.month}${birth.day}`));
  const dayNumber = reduceNumber(digits(birth.month) + digits(birth.day) + digits(explorationDate.getFullYear()) + digits(explorationDate.getMonth() + 1) + digits(explorationDate.getDate()));
  const displayDate = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "short" }).format(explorationDate);

  useEffect(() => window.localStorage.setItem("haf-birth", JSON.stringify(birth)), [birth]);
  useEffect(() => window.localStorage.setItem("haf-favorites", JSON.stringify(favorites)), [favorites]);
  useEffect(() => window.localStorage.setItem("haf-history", JSON.stringify(history)), [history]);

  const value: ExperienceState = {
    birth,
    setBirth,
    current,
    setCurrent,
    desired,
    setDesired,
    favorites,
    toggleFavorite: (id) => setFavorites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]),
    history,
    saveJourney: () => setHistory((items) => [{ id: Date.now(), date: displayDate, current, desired, dayNumber }, ...items].slice(0, 8)),
    dayOffset,
    nextDay: () => setDayOffset((value) => value + 1),
    lifeNumber,
    dayNumber,
    displayDate,
  };

  return <ExperienceContext.Provider value={value}>{children}</ExperienceContext.Provider>;
}

function AppHeader() {
  const flow = useFlow();
  return (
    <div className="app-header">
      <button className="icon-button" onClick={() => flow.canGoBack ? flow.pop() : undefined} aria-label="返回" disabled={!flow.canGoBack}>
        {flow.canGoBack ? <ArrowLeftIcon /> : <span className="logo-dot">O</span>}
      </button>
      <div className="brand-lockup"><span>HAF</span><small>INNER LIGHT</small></div>
      <button className="icon-button" onClick={() => flow.push(makeScreen("favorites"))} aria-label="收藏">
        <BookmarkIcon />
      </button>
    </div>
  );
}

function AppFooter() {
  const flow = useFlow();
  const { favorites } = useExperience();
  return (
    <nav className="bottom-nav" aria-label="主导航">
      <button onClick={() => flow.replace(makeScreen("landing"))}><HomeIcon /><span>首页</span></button>
      <button className="active" onClick={() => flow.replace(makeScreen("number"))}><StarIcon /><span>探索</span></button>
      <button onClick={() => flow.replace(makeScreen("history"))}><CalendarIcon /><span>轨迹</span></button>
      <button onClick={() => flow.replace(makeScreen("favorites"))} className="nav-with-badge"><BookmarkIcon /><span>收藏</span>{favorites.length > 0 && <i>{favorites.length}</i>}</button>
      <button onClick={() => flow.replace(makeScreen("landing"))}><PersonIcon /><span>我的</span></button>
    </nav>
  );
}

function ScrollScreen({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <MobileScroll className={`app-screen ${className}`}><main className="screen-content">{children}</main></MobileScroll>;
}

function PrimaryButton({ children, onClick, disabled = false, secondary = false }: { children: ReactNode; onClick: () => void; disabled?: boolean; secondary?: boolean }) {
  return <button className={`primary-button ${secondary ? "secondary" : ""}`} onClick={onClick} disabled={disabled}>{children}<ChevronRightIcon /></button>;
}

function LandingScreen() {
  const flow = useFlow();
  const { favorites, history, displayDate, dayNumber } = useExperience();
  return (
    <ScrollScreen className="landing-screen">
      <section className="hero-copy">
        <p className="date-label">{displayDate} · 今日数字 {dayNumber}</p>
        <h1>今天，数字想<br />和你说什么？</h1>
        <p>用一枚数字与一只内心罗盘，看见此刻的自己，也找到真正想靠近的体验。</p>
      </section>
      <button className="number-orb" onClick={() => flow.push(makeScreen("birth"))} aria-label="开始今天的探索">
        <span>{dayNumber}</span><small>{numberMeanings[dayNumber].name}</small>
      </button>
      <div className="start-card glass-card">
        <div><small>TODAY'S PROMPT</small><strong>{numberMeanings[dayNumber].prompt}</strong></div>
        <PrimaryButton onClick={() => flow.push(makeScreen("birth"))}>{history.length ? "再玩一次" : "开始今天的探索"}</PrimaryButton>
      </div>
      {(favorites.length > 0 || history.length > 0) && (
        <div className="return-summary">
          <button onClick={() => flow.push(makeScreen("history"))}><b>{history.length}</b><span>次内心记录</span></button>
          <button onClick={() => flow.push(makeScreen("favorites"))}><b>{favorites.length}</b><span>个有感体验</span></button>
        </div>
      )}
      <p className="quiet-note">Numerology 在这里是一面趣味镜子，不替你预言，也不替你做决定。</p>
    </ScrollScreen>
  );
}

function BirthScreen() {
  const flow = useFlow();
  const { birth, setBirth } = useExperience();
  const adjust = (field: "year" | "month" | "day", amount: number) => {
    const ranges = { year: [1936, 2010], month: [1, 12], day: [1, 31] } as const;
    const [minimum, maximum] = ranges[field];
    const next = birth[field] + amount;
    setBirth({ ...birth, [field]: next > maximum ? minimum : next < minimum ? maximum : next });
  };
  return (
    <ScrollScreen>
      <div className="step-marker">01 / 04 · 认识你的底色</div>
      <h2 className="screen-title">先留下一组<br />只属于你的数字</h2>
      <p className="screen-intro">生日会生成一个稳定的「生命路径数」，它不会定义你，只负责抛出一个值得想想的问题。</p>
      <div className="birth-panel glass-card">
        {(["year", "month", "day"] as const).map((field) => <div className="birth-field" key={field}>
          <span>{field === "year" ? "年" : field === "month" ? "月" : "日"}</span>
          <div><button onClick={() => adjust(field, -1)} aria-label={`${field}减一`}>−</button><strong>{birth[field]}</strong><button onClick={() => adjust(field, 1)} aria-label={`${field}加一`}>+</button></div>
        </div>)}
      </div>
      <p className="tap-hint">点击 − / + 调整生日</p>
      <div className="privacy-row"><CheckIcon /><span>仅保存在这台设备，用于生成你的每日探索</span></div>
      <PrimaryButton onClick={() => flow.push(makeScreen("number"))}>看看我的数字</PrimaryButton>
    </ScrollScreen>
  );
}

function NumberScreen() {
  const flow = useFlow();
  const { lifeNumber, dayNumber, displayDate } = useExperience();
  return (
    <ScrollScreen>
      <div className="step-marker">02 / 04 · 数字提示</div>
      <div className="number-result-head">
        <div className="number-medallion"><span>{dayNumber}</span></div>
        <p>{displayDate}<br /><b>你的个人日数字</b></p>
      </div>
      <h2 className="screen-title compact">今天的关键词是<br /><em>「{numberMeanings[dayNumber].name}」</em></h2>
      <div className="message-card glass-card">
        <p>{numberMeanings[dayNumber].line}</p>
        <strong>{numberMeanings[dayNumber].prompt}</strong>
      </div>
      <div className="number-pair">
        <div><small>稳定底色</small><b>{lifeNumber}</b><span>生命路径数</span></div>
        <div><small>今日天气</small><b>{dayNumber}</b><span>个人日数字</span></div>
      </div>
      <PrimaryButton onClick={() => flow.push(makeScreen("compass"))}>把今天的位置也放进来</PrimaryButton>
      <p className="quiet-note">课程不会只按数字推荐。你接下来亲手放下的位置，权重更高。</p>
    </ScrollScreen>
  );
}

function Compass({ value, onChange, desired, current }: { value: Point; onChange: (value: Point) => void; desired?: boolean; current?: Point }) {
  const ref = useRef<HTMLDivElement>(null);
  const update = (event: ReactPointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1));
    const y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1));
    onChange({ x, y });
  };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    update(event);
  };
  return (
    <div className="compass-wrap">
      <span className="axis-label top">安静沉淀</span><span className="axis-label right">向外连接</span><span className="axis-label bottom">唤醒活力</span><span className="axis-label left">向内独处</span>
      <div ref={ref} className="compass" onPointerDown={down} onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && update(event)} data-scroll-drag="ignore">
        <i className="axis horizontal" /><i className="axis vertical" />
        {current && <motion.span className="compass-point current-point" animate={{ left: `${(current.x + 1) * 50}%`, top: `${(current.y + 1) * 50}%` }}><small>此刻</small></motion.span>}
        <motion.span className={`compass-point ${desired ? "desired-point" : ""}`} animate={{ left: `${(value.x + 1) * 50}%`, top: `${(value.y + 1) * 50}%` }} transition={{ type: "spring", stiffness: 360, damping: 28 }}><small>{desired ? "想靠近" : "我在这"}</small></motion.span>
      </div>
    </div>
  );
}

function pointMeaning(point: Point) {
  const calm = point.y < 0 ? "想安静下来" : "需要唤醒能量";
  const social = point.x < 0 ? "更愿意向内独处" : "也渴望向外连接";
  return `${calm}，${social}`;
}

function CompassScreen() {
  const flow = useFlow();
  const { current, setCurrent } = useExperience();
  return (
    <ScrollScreen className="compass-screen">
      <div className="step-marker">03 / 04 · 此刻的位置</div>
      <h2 className="screen-title compact">不分析，凭直觉<br />把光点放下来</h2>
      <p className="screen-intro">上下是能量，左右是你与世界的距离。</p>
      <Compass value={current} onChange={setCurrent} />
      <div className="live-reading"><span>此刻的你</span><strong>{pointMeaning(current)}</strong></div>
      <PrimaryButton onClick={() => flow.push(makeScreen("desired"))}>看见我想去的方向</PrimaryButton>
    </ScrollScreen>
  );
}

function DesiredScreen() {
  const flow = useFlow();
  const { current, desired, setDesired, saveJourney } = useExperience();
  return (
    <ScrollScreen className="compass-screen">
      <div className="step-marker">04 / 04 · 想靠近的状态</div>
      <h2 className="screen-title compact">如果今天结束时<br />你想更靠近哪里？</h2>
      <p className="screen-intro">蓝色是此刻，橙色是你想靠近的位置。</p>
      <Compass value={desired} onChange={setDesired} desired current={current} />
      <div className="live-reading warm"><span>想靠近的你</span><strong>{pointMeaning(desired)}</strong></div>
      <PrimaryButton onClick={() => { saveJourney(); flow.push(makeScreen("path")); }}>生成我的探索路径</PrimaryButton>
    </ScrollScreen>
  );
}

function PathScreen() {
  const flow = useFlow();
  const { lifeNumber, dayNumber } = useExperience();
  const steps = [
    { n: "01", title: "先安定身体", copy: "让注意力从脑内回到呼吸与触觉" },
    { n: "02", title: "再听见内在", copy: `用数字 ${dayNumber} 的「${numberMeanings[dayNumber].name}」提问打开感受` },
    { n: "03", title: "最后温和连接", copy: "在有边界的共同体验里试着表达" },
  ];
  return (
    <ScrollScreen>
      <div className="step-marker">YOUR INNER ROUTE</div>
      <h2 className="screen-title compact">今天，不必一下子<br />走到终点</h2>
      <p className="screen-intro">生命路径 {lifeNumber} 给出底色，真正决定路线的是你刚才亲手放下的两个位置。</p>
      <div className="route-card glass-card">
        {steps.map((step, index) => <div className="route-step" key={step.n}><i className={index === 0 ? "active" : ""}>{step.n}</i><div><strong>{step.title}</strong><span>{step.copy}</span></div></div>)}
      </div>
      <div className="recommend-logic"><span>推荐依据</span><b>你的选择 70%</b><b>时间与偏好 20%</b><b>今日数字 10%</b></div>
      <PrimaryButton onClick={() => flow.push(makeScreen("courses"))}>看看适合我的体验</PrimaryButton>
    </ScrollScreen>
  );
}

function CoursesScreen() {
  const flow = useFlow();
  const { favorites, toggleFavorite, dayNumber } = useExperience();
  return (
    <ScrollScreen className="courses-screen">
      <div className="step-marker">CURATED FOR YOU</div>
      <h2 className="screen-title compact">不是一份课表，<br />是三种可以试试的入口</h2>
      <p className="screen-intro">左右滑动。只收藏真正让你有感觉的，不急着买。</p>
      <Carousel className="course-carousel" contentClassName="course-carousel-content" ariaLabel="为你推荐的体验">
        {courses.map((course, index) => {
          const saved = favorites.includes(course.id);
          return <article className="course-card" key={course.id}>
            <div className="course-image"><img src={course.image} alt="" /><span>0{index + 1}</span><button onClick={() => toggleFavorite(course.id)} aria-label={saved ? "取消收藏" : "收藏"}>{saved ? <BookmarkFilledIcon /> : <BookmarkIcon />}</button></div>
            <div className="course-body">
              <small>{course.eyebrow}</small><h3>{course.title}</h3>
              <p className="why">因为你想{index === 0 ? "先稳住身体，再听见自己" : index === 1 ? `为「${numberMeanings[dayNumber].name}」找到一种表达` : "在安全的边界里靠近他人"}。</p>
              <div className="course-meta"><span>{course.time}</span><span>{course.place}</span></div>
              <div className="course-price"><b>¥{course.price}</b><button onClick={() => toggleFavorite(course.id)}>{saved ? "已收藏" : "先收藏"}</button></div>
            </div>
          </article>;
        })}
      </Carousel>
      <button className="saved-bar" onClick={() => flow.push(makeScreen("favorites"))}><span><BookmarkIcon /> 已收藏 {favorites.length} 个体验</span><ChevronRightIcon /></button>
      <PrimaryButton secondary onClick={() => flow.push(makeScreen("history"))}>先收好今天的发现</PrimaryButton>
    </ScrollScreen>
  );
}

function FavoritesScreen() {
  const flow = useFlow();
  const { favorites, toggleFavorite, nextDay } = useExperience();
  const saved = courses.filter((course) => favorites.includes(course.id));
  return (
    <ScrollScreen>
      <div className="step-marker">MY SAVED EXPERIENCES</div>
      <h2 className="screen-title compact">你收藏的，正在<br />形成一条自己的路径</h2>
      <p className="screen-intro">收藏不会立刻催促购买。等同类需要反复出现时，再决定要不要深入。</p>
      {saved.length ? <div className="saved-list">{saved.map((course) => <article key={course.id}><img src={course.image} alt="" /><div><small>{course.eyebrow}</small><strong>{course.title}</strong><span>{course.time}</span></div><button onClick={() => toggleFavorite(course.id)} aria-label="移除收藏"><Cross1Icon /></button></article>)}</div> : <div className="empty-card glass-card"><HeartIcon /><strong>还没有收藏</strong><span>回到推荐里，只留下真正让你心里一动的体验。</span></div>}
      {saved.length >= 2 && <div className="pattern-card"><small>WE NOTICED A PATTERN</small><strong>你连续收藏了 {saved.filter((item) => item.tags.includes("表达") || item.tags.includes("内省")).length || 2} 个与「表达内在」有关的体验</strong><p>也许这不是偶然。你可以先选一节最轻的体验课，而不是一次买下全部。</p><button>比较这几节课</button></div>}
      <PrimaryButton onClick={() => { nextDay(); flow.replace(makeScreen("number")); }}><ReloadIcon /> 换一天，再看看新的我</PrimaryButton>
    </ScrollScreen>
  );
}

function HistoryScreen() {
  const flow = useFlow();
  const { history, nextDay, favorites } = useExperience();
  const points = history.length ? history : [{ id: 0, date: "第一次记录会出现在这里", current: { x: -0.28, y: 0.18 }, desired: { x: 0.36, y: -0.38 }, dayNumber: 7 }];
  return (
    <ScrollScreen>
      <div className="step-marker">INNER CONSTELLATION</div>
      <h2 className="screen-title compact">每一次都不是答案，<br />连起来才是你的轨迹</h2>
      <div className="constellation glass-card">
        <i className="constellation-axis horizontal" /><i className="constellation-axis vertical" />
        {points.slice(0, 6).map((item, index) => <motion.span key={item.id} initial={{ scale: 0 }} animate={{ scale: 1 }} style={{ left: `${(item.current.x + 1) * 44 + 6}%`, top: `${(item.current.y + 1) * 38 + 12}%` }}><b>{item.dayNumber}</b><small>{index === 0 ? "最近" : ""}</small></motion.span>)}
      </div>
      <div className="track-summary"><div><b>{history.length}</b><span>次探索</span></div><div><b>{favorites.length}</b><span>个收藏</span></div><div><b>{Math.min(history.length, 7)}</b><span>日连续</span></div></div>
      <div className="history-list">{history.slice(0, 4).map((item) => <div key={item.id}><i>{item.dayNumber}</i><span><b>{item.date}</b><small>{pointMeaning(item.current)}</small></span></div>)}</div>
      <PrimaryButton onClick={() => { nextDay(); flow.replace(makeScreen("number")); }}><ReloadIcon /> 模拟明天，再玩一次</PrimaryButton>
    </ScrollScreen>
  );
}

function makeScreen(id: string): FlowScreen {
  const components: Record<string, () => ReactNode> = {
    landing: () => <LandingScreen />, birth: () => <BirthScreen />, number: () => <NumberScreen />, compass: () => <CompassScreen />, desired: () => <DesiredScreen />, path: () => <PathScreen />, courses: () => <CoursesScreen />, favorites: () => <FavoritesScreen />, history: () => <HistoryScreen />,
  };
  return {
    id,
    header: () => <AppHeader />,
    headerHeight: 54,
    footer: () => <AppFooter />,
    footerHeight: 72,
    render: components[id],
  };
}

export default function Prototype() {
  return <ExperienceProvider><FlowStack initial={makeScreen("landing")} /></ExperienceProvider>;
}
