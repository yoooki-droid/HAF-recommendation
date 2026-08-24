import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
try { process.loadEnvFile?.(path.join(root, ".env.local")); } catch { /* Local AI copy remains optional. */ }
const dataDirectory = path.join(root, "data");
const eventFile = path.join(dataDirectory, "events.jsonl");
const port = Number(process.env.HAF_DASHBOARD_PORT || 4174);
const deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";
const deepseekModel = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const allowedEvents = new Set(["energy_module_viewed", "energy_course_favorited"]);
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
const readingCache = new Map();
const greetingCache = new Map();

await mkdir(dataDirectory, { recursive: true });

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(body));
}

async function readEvents() {
  try {
    const content = await readFile(eventFile, "utf8");
    return content.split("\n").filter(Boolean).flatMap((line) => {
      try { return [JSON.parse(line)]; } catch { return []; }
    });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function startDateFor(days) {
  if (days === "all") return null;
  const count = Math.max(1, Math.min(365, Number(days) || 7));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - count + 1);
  return start;
}

function summarize(events, days) {
  const start = startDateFor(days);
  const filtered = start ? events.filter((event) => new Date(event.event_time) >= start) : events;
  const visitEvents = filtered.filter((event) => event.event_name === "energy_module_viewed");
  const favoriteEvents = filtered.filter((event) => event.event_name === "energy_course_favorited");
  const visitors = new Set(visitEvents.map((event) => event.user_id)).size;
  const favoriters = new Set(favoriteEvents.map((event) => event.user_id)).size;
  const byDay = new Map();
  for (const event of filtered) {
    const date = String(event.event_time).slice(0, 10);
    if (!byDay.has(date)) byDay.set(date, { date, visitors: new Set(), favoriters: new Set() });
    const item = byDay.get(date);
    if (event.event_name === "energy_module_viewed") item.visitors.add(event.user_id);
    if (event.event_name === "energy_course_favorited") item.favoriters.add(event.user_id);
  }
  const trend = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)).map((item) => ({
    date: item.date,
    label: `${Number(item.date.slice(5, 7))}/${Number(item.date.slice(8, 10))}`,
    visitors: item.visitors.size,
    favoriters: item.favoriters.size,
  }));
  const courseMap = new Map();
  for (const event of favoriteEvents) {
    const id = event.course_id || "unknown";
    if (!courseMap.has(id)) courseMap.set(id, { id, title: event.course_title || id, users: new Set(), total: 0 });
    const course = courseMap.get(id);
    course.users.add(event.user_id);
    course.total += 1;
  }
  const courses = [...courseMap.values()].map((course) => ({ id: course.id, title: course.title, users: course.users.size, total: course.total })).sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
  return {
    visitors,
    favoriters,
    favorite_total: favoriteEvents.length,
    conversion_rate: visitors ? (favoriters / visitors) * 100 : 0,
    trend,
    courses,
    generated_at: new Date().toISOString(),
  };
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 64_000) throw new Error("payload too large");
  }
  return JSON.parse(body || "{}");
}

function textLength(value) {
  return Array.from(String(value || "").trim()).length;
}

function validReadingRequest(body) {
  return body
    && typeof body.user_key === "string"
    && /^\d{4}-\d{2}-\d{2}$/.test(body.date_key || "")
    && Number.isInteger(body.personal_day)
    && typeof body.daily_theme === "string"
    && typeof body.moment_keyword === "string"
    && typeof body.compass?.horizontal === "string"
    && typeof body.compass?.vertical === "string"
    && typeof body.compass?.intensity === "string"
    && typeof body.chakras?.primary?.name === "string"
    && typeof body.chakras?.secondary?.name === "string";
}

function validGreetingRequest(body) {
  return body
    && typeof body.user_key === "string"
    && body.user_key.length <= 128
    && /^\d{4}-\d{2}-\d{2}$/.test(body.date_key || "")
    && Number.isInteger(body.personal_day_number)
    && body.personal_day_number >= 1
    && body.personal_day_number <= 9
    && typeof body.personal_day_theme === "string"
    && body.personal_day_theme.length <= 24
    && Number.isInteger(body.life_path_number)
    && typeof body.daily_angle === "string"
    && body.daily_angle.length <= 16
    && Array.isArray(body.recent_greetings)
    && body.recent_greetings.length <= 30
    && body.recent_greetings.every((item) => typeof item === "string" && textLength(item) <= 40);
}

function readingCacheKey(body) {
  return [
    body.user_key,
    body.date_key,
    body.personal_day,
    body.daily_theme,
    body.moment_keyword,
    body.compass.horizontal,
    body.compass.vertical,
    body.compass.intensity,
    body.chakras.primary.name,
    body.chakras.secondary.name,
  ].join(":");
}

function greetingCacheKey(body) {
  return [
    body.user_key,
    body.date_key,
    body.personal_day_number,
    body.life_path_number,
    body.daily_angle,
    "daily-greeting-v2",
  ].join(":");
}

function normalizeGreeting(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

function greetingWasUsed(greeting, recentGreetings) {
  const normalized = normalizeGreeting(greeting).replace(/[，。！？、]/g, "");
  return recentGreetings.some((item) => normalizeGreeting(item).replace(/[，。！？、]/g, "") === normalized);
}

async function generateDailyGreeting(body) {
  const recent = body.recent_greetings.map(normalizeGreeting).filter(Boolean).slice(-30);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5500);
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${deepseekApiKey}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: deepseekModel,
          thinking: { type: "disabled" },
          messages: [
            {
              role: "system",
              content: "你是HAF探索本心模块的每日问候语编辑。上游已经按照毕达哥拉斯数字体系完成计算，你绝不重新计算数字，只把今日个人数字的含义转化为一句自然、有感受的中文问候。要求：只写一句，14到30个中文字符，标点计数；不出现数字，也不出现灵数、生命路径、脉轮、罗盘等术语；不复述输入标签；不使用命中注定、必然、将会、好运、坏运、宇宙安排等预测；不做医疗或心理诊断；避免空泛堆叠能量、靠近、听见、温柔、慢慢；结合今日表达切面给出具体落点；与最近用过的句子在核心动词、句式和意象上不同。只输出json，格式为{\"greeting\":\"今天，为真正想做的事留一个开始。\"}。格式示例不得照抄。",
            },
            {
              role: "user",
              content: `请输出json。日期：${body.date_key}；今日个人数字：${body.personal_day_number}；数字主题：${body.personal_day_theme}；生命路径数仅作语气辅助：${body.life_path_number}；今日表达切面：${body.daily_angle}；最近使用过的问候语：${recent.length ? recent.join("｜") : "无"}。${attempt ? "上一次结果不符合长度或重复要求，请换一个核心动词和句式。" : ""}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 80,
          temperature: attempt ? 0.92 : 0.82,
          stream: false,
        }),
      });
      if (!response.ok) throw new Error(`DeepSeek returned ${response.status}`);
      const payload = await response.json();
      const parsed = JSON.parse(payload?.choices?.[0]?.message?.content || "{}");
      const greeting = normalizeGreeting(parsed.greeting);
      if (textLength(greeting) < 14 || textLength(greeting) > 30 || greetingWasUsed(greeting, recent)) continue;
      return greeting;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("unable to generate a valid greeting");
}

async function generateEnergyReading(body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${deepseekApiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: deepseekModel,
        thinking: { type: "disabled" },
        messages: [
          {
            role: "system",
            content: "你是HAF探索本心模块的中文编辑。根据已计算的事实写一条有洞察的今日能量解读。不是算命断言，不做医学或心理诊断，不复述用户已经看到的标签，不提灵数、脉轮、罗盘等术语。捕捉这些线索背后的内在张力，给出一句温柔但具体的提醒。总长度18到50个中文字符，最多两句。只输出json，格式示例：{\"reading\":\"你真正想说的，不是答案，而是希望自己的感受被认真听见。\"}",
          },
          {
            role: "user",
            content: `请输出json。日期：${body.date_key}；今日主题：${body.daily_theme}；此刻关键词：${body.moment_keyword}；方向：${body.compass.horizontal}、${body.compass.vertical}；强度：${body.compass.intensity}；主要能量：${body.chakras.primary.name}（${body.chakras.primary.themes.join("、")}）；辅助能量：${body.chakras.secondary.name}（${body.chakras.secondary.themes.join("、")}）。不要复述这些标签。`,
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 120,
        temperature: 0.72,
        stream: false,
      }),
    });
    if (!response.ok) throw new Error(`DeepSeek returned ${response.status}`);
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content || "{}");
    const reading = String(parsed.reading || "").replace(/\s+/g, "").trim();
    if (textLength(reading) < 18 || textLength(reading) > 50) throw new Error("invalid reading length");
    return reading;
  } finally {
    clearTimeout(timeout);
  }
}

async function serveStatic(response, pathname) {
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.normalize(path.join(root, relative));
  if (!filePath.startsWith(root)) return false;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return false;
    response.writeHead(200, { "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream", "Cache-Control": "no-cache" });
    createReadStream(filePath).pipe(response);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (request.method === "OPTIONS") return sendJson(response, 204, {});

  if (request.method === "POST" && url.pathname === "/api/events") {
    try {
      const event = await readBody(request);
      if (!allowedEvents.has(event.event_name) || !event.event_id || !event.user_id || !event.event_time) return sendJson(response, 400, { ok: false });
      const existing = await readEvents();
      if (!existing.some((item) => item.event_id === event.event_id)) await appendFile(eventFile, `${JSON.stringify(event)}\n`, "utf8");
      return sendJson(response, 202, { ok: true });
    } catch {
      return sendJson(response, 400, { ok: false });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/energy-reading") {
    try {
      const body = await readBody(request);
      if (!validReadingRequest(body)) return sendJson(response, 400, { ok: false, error: "invalid_request" });
      if (!deepseekApiKey) return sendJson(response, 503, { ok: false, error: "ai_not_configured" });
      const cacheKey = readingCacheKey(body);
      if (readingCache.has(cacheKey)) return sendJson(response, 200, { ok: true, reading: readingCache.get(cacheKey), source: "cache" });
      const reading = await generateEnergyReading(body);
      readingCache.set(cacheKey, reading);
      return sendJson(response, 200, { ok: true, reading, source: "deepseek" });
    } catch {
      return sendJson(response, 502, { ok: false, error: "ai_unavailable" });
    }
  }

  if (request.method === "POST" && url.pathname === "/api/daily-greeting") {
    try {
      const body = await readBody(request);
      if (!validGreetingRequest(body)) return sendJson(response, 400, { ok: false, error: "invalid_request" });
      if (!deepseekApiKey) return sendJson(response, 503, { ok: false, error: "ai_not_configured" });
      const cacheKey = greetingCacheKey(body);
      if (greetingCache.has(cacheKey)) return sendJson(response, 200, { ok: true, greeting: greetingCache.get(cacheKey), source: "cache" });
      const greeting = await generateDailyGreeting(body);
      greetingCache.set(cacheKey, greeting);
      return sendJson(response, 200, { ok: true, greeting, source: "deepseek" });
    } catch {
      return sendJson(response, 502, { ok: false, error: "ai_unavailable" });
    }
  }

  if (request.method === "GET" && url.pathname === "/api/summary") return sendJson(response, 200, summarize(await readEvents(), url.searchParams.get("days") || "7"));
  if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { ok: true, deepseek_configured: Boolean(deepseekApiKey), deepseek_model: deepseekModel });
  if (request.method === "GET" && await serveStatic(response, url.pathname)) return;
  sendJson(response, 404, { ok: false });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`HAF energy dashboard available at http://localhost:${port}`);
});
