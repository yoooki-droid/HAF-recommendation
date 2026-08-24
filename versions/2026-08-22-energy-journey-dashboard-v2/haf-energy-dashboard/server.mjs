import { appendFile, mkdir, readFile, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDirectory = path.join(root, "data");
const eventFile = path.join(dataDirectory, "events.jsonl");
const port = Number(process.env.HAF_DASHBOARD_PORT || 4174);
const allowedEvents = new Set(["energy_module_viewed", "energy_course_favorited"]);
const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8" };

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

  if (request.method === "GET" && url.pathname === "/api/summary") return sendJson(response, 200, summarize(await readEvents(), url.searchParams.get("days") || "7"));
  if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { ok: true });
  if (request.method === "GET" && await serveStatic(response, url.pathname)) return;
  sendJson(response, 404, { ok: false });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`HAF energy dashboard available at http://localhost:${port}`);
});
