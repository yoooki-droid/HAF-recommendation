import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const mediaDir = join(projectRoot, "public/assets/haf/sensing");
const qaDir = join(projectRoot, "qa/sensing-generated-media-v1");
const sourceFrame = join(projectRoot, "public/assets/haf/visual-refresh/intuitive-flow-field-v1.png");
const audioOutput = join(mediaDir, "meditation-guide-haf-chenguang-v1.mp3");
const videoOutput = join(mediaDir, "intuitive-flow-seedance-2-5-v1.mp4");
const mode = process.argv.find((value) => ["audio", "video", "all"].includes(value)) ?? "all";
const dryRun = process.argv.includes("--dry-run");

const audioText = "深呼吸，感受此刻。让能量汇聚指尖，轻触屏幕，在感受到回应的地方停下。";
const audioSpeaker = process.env.VOLC_VOICE_SPEAKER_ID || "";
const audioResourceId = process.env.VOLC_VOICE_RESOURCE_ID || "seed-icl-2.0";

const videoPrompt = `以首帧和尾帧提供的同一张蓝紫、青蓝、微暖橙色能量流场为唯一视觉依据，生成一个可无缝循环的手机全屏抽象背景。镜头完全固定，不推进、不旋转、不摇晃；不改变原图构图，不添加人物、物体、文字、符号或新的线条。只有原有的柔和光带像呼吸一样非常缓慢地流动，局部明暗轻轻起伏，细小光粒偶尔沿曲线漂移，首尾画面严格回到相同状态。质感空灵、克制、细腻、有深度，不廉价，不像屏保，不出现向外爆炸或放射状扩张，不闪烁，不突然变亮，不造成眩晕。静音，无对白，无配乐，无音效。`;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function delay(milliseconds) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function loadLocalEnv() {
  const path = join(projectRoot, ".env.media.local");
  try {
    const source = await readFile(path, "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function readJsonResponse(response, label) {
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`${label} returned a non-JSON response (${response.status}).`);
  }
  if (!response.ok) {
    const code = body?.error?.code ?? body?.code ?? "unknown_error";
    const message = body?.error?.message ?? body?.message ?? "request failed";
    throw new Error(`${label} failed (${response.status}, ${code}): ${message}`);
  }
  return body;
}

async function downloadPrivateUrl(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Media download failed (${response.status}).`);
  const media = Buffer.from(await response.arrayBuffer());
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, media, { mode: 0o644 });
  return media;
}

function parseChunkedTts(body) {
  const chunks = [];
  const records = body
    .trim()
    .split(/\r?\n|(?<=})\s*(?={)/)
    .map((line) => line.trim())
    .filter(Boolean);
  for (const record of records) {
    let message;
    try {
      message = JSON.parse(record);
    } catch {
      continue;
    }
    if (message.code !== 0 && message.code !== 20000000) {
      throw new Error(`Voice synthesis failed (${message.code ?? "unknown_error"}): ${message.message || "request failed"}`);
    }
    if (typeof message.data === "string" && message.data.length > 0) {
      chunks.push(Buffer.from(message.data, "base64"));
    }
  }
  if (chunks.length === 0) throw new Error("Voice synthesis succeeded without audio data.");
  return Buffer.concat(chunks);
}

async function generateAudio() {
  const apiKey = process.env.VOLC_AUDIO_API_KEY;
  if (!apiKey) throw new Error("VOLC_AUDIO_API_KEY is not configured.");
  if (!audioSpeaker) throw new Error("VOLC_VOICE_SPEAKER_ID is not configured.");
  const response = await fetch("https://openspeech.bytedance.com/api/v3/tts/unidirectional", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": audioResourceId,
      "X-Api-Request-Id": randomUUID(),
    },
    body: JSON.stringify({
      user: { uid: "haf-energy-journey" },
      req_params: {
        text: audioText,
        model: "seed-tts-2.0-standard",
        speaker: audioSpeaker,
        audio_params: {
          format: "mp3",
          sample_rate: 24000,
          speech_rate: -6,
          loudness_rate: -2,
        },
      },
    }),
  });
  const body = await response.text();
  if (!response.ok) {
    const headerCode = response.headers.get("x-api-status-code");
    const headerMessage = response.headers.get("x-api-message");
    let message = `Voice synthesis failed (${response.status}${headerCode ? `, ${headerCode}` : ""}): ${headerMessage || "request failed"}`;
    try {
      const error = JSON.parse(body);
      message = `Voice synthesis failed (${response.status}, ${error.code ?? "unknown_error"}): ${error.message ?? "request failed"}`;
    } catch {
      // Keep the status-only error so responses never leak request credentials.
    }
    throw new Error(message);
  }
  const audio = parseChunkedTts(body);
  await mkdir(dirname(audioOutput), { recursive: true });
  await writeFile(audioOutput, audio, { mode: 0o644 });
  return {
    kind: "audio",
    model: "doubao-voice-design + seed-icl-2.0",
    speaker_id: audioSpeaker,
    text_sha256: sha256(Buffer.from(audioText)),
    duration_seconds: null,
    output: `public/assets/haf/sensing/${basename(audioOutput)}`,
    output_sha256: sha256(audio),
  };
}

async function generateVideo() {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new Error("ARK_API_KEY is not configured.");
  const model = process.env.SEEDANCE_MODEL || "doubao-seedance-2-5-260628";
  const source = await readFile(sourceFrame);
  const sourceUrl = `data:image/png;base64,${source.toString("base64")}`;
  const createResponse = await fetch("https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      content: [
        { type: "text", text: videoPrompt },
        { type: "image_url", image_url: { url: sourceUrl }, role: "first_frame" },
        { type: "image_url", image_url: { url: sourceUrl }, role: "last_frame" },
      ],
      duration: 6,
      ratio: "adaptive",
      resolution: "480p",
      generate_audio: false,
      watermark: false,
      return_last_frame: true,
    }),
  });
  const created = await readJsonResponse(createResponse, "Seedance task creation");
  if (!created.id) throw new Error("Seedance task creation returned no task ID.");
  process.stdout.write(`Seedance task ${created.id} submitted.\n`);

  const deadline = Date.now() + 15 * 60 * 1000;
  let result;
  while (Date.now() < deadline) {
    await delay(8000);
    const response = await fetch(`https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${encodeURIComponent(created.id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    result = await readJsonResponse(response, "Seedance task query");
    process.stdout.write(`Seedance task status: ${result.status}.\n`);
    if (result.status === "succeeded") break;
    if (["failed", "cancelled", "expired"].includes(result.status)) {
      const code = result?.error?.code ?? "generation_failed";
      throw new Error(`Seedance task stopped (${code}).`);
    }
  }
  if (result?.status !== "succeeded") throw new Error("Seedance task timed out while polling.");
  if (!result?.content?.video_url) throw new Error("Seedance succeeded without a video URL.");
  const video = await downloadPrivateUrl(result.content.video_url, videoOutput);
  return {
    kind: "video",
    model,
    task_id: created.id,
    prompt_sha256: sha256(Buffer.from(videoPrompt)),
    source_sha256: sha256(source),
    duration_seconds: Number(result.duration ?? 6),
    resolution: result.resolution ?? "480p",
    ratio: result.ratio ?? "adaptive",
    output: `public/assets/haf/sensing/${basename(videoOutput)}`,
    output_sha256: sha256(video),
  };
}

await loadLocalEnv();
await mkdir(mediaDir, { recursive: true });
await mkdir(qaDir, { recursive: true });

if (dryRun) {
  process.stdout.write(`${JSON.stringify({
    mode,
    audio: { model: "doubao-voice-design + seed-icl-2.0", speaker: audioSpeaker || "<configure VOLC_VOICE_SPEAKER_ID>", text: audioText, duration: "~10s", format: "mp3", sample_rate: 24000 },
    video: { model: process.env.SEEDANCE_MODEL || "doubao-seedance-2-5-260628", duration: 6, ratio: "adaptive", resolution: "480p", generate_audio: false, watermark: false },
    outputs: { audio: audioOutput, video: videoOutput },
  }, null, 2)}\n`);
  process.exit(0);
}

const results = [];
if (mode === "audio" || mode === "all") results.push(await generateAudio());
if (mode === "video" || mode === "all") results.push(await generateVideo());

let previousResults = [];
try {
  const previous = JSON.parse(await readFile(join(qaDir, "manifest.json"), "utf8"));
  previousResults = Array.isArray(previous.results) ? previous.results : [];
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}
const kinds = new Set(results.map((item) => item.kind));
const manifest = {
  generated_at: new Date().toISOString(),
  status: "review_candidate",
  results: [...previousResults.filter((item) => !kinds.has(item.kind)), ...results],
};
await writeFile(join(qaDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
process.stdout.write(`Saved ${results.map((item) => item.output).join(", ")} as review candidates.\n`);
