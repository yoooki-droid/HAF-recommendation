# HAF 探索本心 H5

当前稳定版本：`v3.0-personalized-journey`  
冻结日期：`2026-08-23`  
本地预览：`http://localhost:4173/`  
配套后端与数据看板：`http://localhost:4174/`

## 产品定位

“探索本心”是嵌入 HAF 小程序首页的全屏 H5 模块。它把用户的出生数字线索、当天自然日节律、用户亲手选中的共鸣词，以及 HAF 七脉轮反思模型结合，生成当日主旋律、能量解读和一组与此刻能量契合的体验推荐。

这里呈现的是用于自我觉察的象征性提示，不是医学、心理诊断或确定性命运预测。

## 当前用户流程

### 首次进入

```text
灵性 Loading
→ 三步玩法介绍
→ 一次性建档
→ 共鸣词感应
→ AI/本地合成 Loading
→ 今日结果
→ 与此刻契合的体验
→ 收藏或进入收藏页
```

首次介绍用三步解释玩法：

1. 天生线索：由生日生成数字基线。
2. 此刻感应：用户移动手指寻找一个贴近当下的词。
3. 今日回响：系统返回关键词、解读和契合练习。

### 再次进入

```text
Loading 中生成每日问候
→ 文字问候
→ 共鸣词感应
→ Loading 中生成能量解读
→ 今日结果与契合体验
```

不会重复询问生日，除非用户主动点击“修改资料”。

## 当前已完成能力

- 生命路径数与 Personal Day 的确定性计算
- 真实月份天数和闰年生日选择
- 城市自由输入，出生时间和性别可选
- DeepSeek 后端实时生成 14–30 字每日问候
- 问候根据自然日、Personal Day、生命路径数和每日表达切面稳定缓存
- 最近 30 条问候去重
- 七脉轮各十词的 70 词隐藏感应场
- 位置变化才换词、松手锁词、选词直接确定主脉轮
- 选词、数字、主脉轮与次脉轮的结构化合成
- DeepSeek 后端生成 18–50 字能量解读
- 问候和解读均在 Loading 阶段请求，页面展示后不再替换文字
- 前端统一 6 秒请求上限；超时、异常或无配置时锁定本地兜底文案
- 结果页保留今日主旋律、当下共鸣、能量落点和一句有判断的总结
- 推荐引擎固定返回三条课程记录；界面以“此刻与你契合的体验”呈现，包含真实小图、名称、契合理由、日期、时间和形式
- 本地收藏、取消收藏和独立收藏页
- “重新感应”返回已有感应页，不产生重复路由或死循环
- 访问与成功收藏的最小匿名埋点
- 独立轻量数据看板

## 个性化来源

| 层 | 输入 | 影响 |
| --- | --- | --- |
| 每日数字 | 生日、自然日期 | 今日主旋律与每日问候 |
| 生命路径 | 完整生日 | 问候语气与脉轮投影基线 |
| 共鸣词 | 隐藏 7 × 10 词场中的最终位置 | 用户亲手锁定的当下词与主脉轮 |
| 脉轮模型 | 选词 70%、生命路径 20%、Personal Day 10% | 主脉轮、次脉轮与主题 |
| 课程推荐 | 上述结构化结果、课程标签 | 三节课程及确定性契合理由 |

相同用户、自然日和结果签名保持稳定；新的自然日、出生计算结果或最终选词可以产生新内容。

## Loading 与回退

- 初始化 Loading 最短约 1.65 秒，同时准备回访问候。
- 合成 Loading 最短约 1.75 秒，同时准备 AI 能量解读。
- 每个前端 AI 请求最多等待 6 秒。
- 超时、非 2xx、非法长度或解析失败时，保存本地兜底结果。
- 页面一旦出现，文案不会再被晚到的网络结果替换，避免布局跳动。
- 相同签名的并发请求会在前端合并，避免 React 严格模式或快速操作造成重复调用。

## 当前仍为 Demo 的部分

- 课程来自 `skills/haf-course-recommendation/references/demo-courses.json`
- 收藏保存在浏览器本地
- 推荐理由来自结构化规则模板，尚未使用真实课程 API 做当次 AI 理由生成
- 埋点保存在本地 `data/events.jsonl`
- DeepSeek 缓存保存在单实例内存
- 尚未接入正式登录用户、课程、收藏、数据库和权限系统

## 隐私与安全

- DeepSeek Key 只存在后端 `.env.local`，H5 不读取、不保存、不传输 Key。
- H5 调用 AI 时只发送匿名用户键和已经计算好的数字/能量事实。
- 不向 AI 发送生日、出生时间、性别或城市。
- 不向数据看板发送生日、感应位置、脉轮结果或完整推荐理由。
- `.env.local`、`data/*.jsonl`、`node_modules` 和测试临时结果不进入版本快照。
- 对话中曾出现过的 Key 在生产上线前必须轮换。

## 本地运行

H5：

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

后端与数据看板：

```bash
cd ../haf-energy-dashboard
npm install
npm start
```

可配置的前端接口：

```bash
VITE_HAF_ANALYTICS_ENDPOINT=https://example.com/api/events
VITE_HAF_READING_ENDPOINT=https://example.com/api/energy-reading
VITE_HAF_GREETING_ENDPOINT=https://example.com/api/daily-greeting
```

## 验证

```bash
npm run check:runtime
npm run build
npm run test:sites
```

`npm run test:runtime` 需要本机已安装 Playwright Chromium。无该依赖时，仍需在内嵌手机预览中手动走完首次、回访、修改资料、感应页多个位置、重新感应、三张课程卡和收藏页。

## 文档索引

- `AGENTS.md`：产品决策、视觉边界和运行时保护规则
- `VERSION.md`：当前冻结版本说明
- `docs/SYSTEM_ARCHITECTURE.md`：当前系统架构、数据流和缓存
- `docs/API_CONTRACTS.md`：H5、AI、埋点、课程和收藏接口契约
- `docs/PRIVACY_AI_BOUNDARIES.md`：隐私、AI 使用和表达红线
- `docs/QA_RELEASE_CHECKLIST.md`：快照与上线验证清单
- `docs/ENERGY_RECOMMENDATION_ENGINE_PLAN.md`：算法与生产演进
- `docs/DAILY_GREETING_AND_REASON_STRATEGY.md`：每日问候和课程理由策略
- `docs/ENERGY_ANALYTICS_DASHBOARD_PLAN.md`：轻量数据看板定义
- `docs/PRODUCTION_INTEGRATION_CHECKLIST.md`：正式接口接入事项
- `docs/UI_UX_NEXT_ITERATION.md`：当前 UI/UX 基线与下一轮边界
