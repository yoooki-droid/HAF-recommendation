# HAF Miniapp 项目 Review

日期：2026-08-24  
工作区：`/Users/at_lp007/Documents/HAF_miniapp`  
Review 范围：根目录说明、活跃 H5、后端/数据看板、领域 Skills、QA 文档与证据、历史快照、旧 numerology 工作副本、构建与浏览器运行状态。

## 结论先行

当前项目作为本地 Demo/产品原型是健康可运行的：H5 首次流程、罗盘、AI/本地解读、三条历史课程推荐和数据看板都能打开，源码可编译，移动运行时与领域规则测试全部通过，2026-08-23 的 v3 冻结快照也能通过 SHA-256 校验。

但当前还不是生产就绪状态。最需要优先处理的四件事是：

1. 这台电脑上的工作区没有 `.git`，无法查看分支、提交历史、未提交修改或安全回滚。
2. 2025 课程回溯验证脚本的日期解析函数已损坏，报告中的“所有场次都过期”结论无效。
3. 活跃 H5 已经从 15 门 Demo 课程切到 226 门历史课程，但 README、架构/算法文档和 QA 状态仍有大量 v3 旧描述。
4. `.env.local` 中存在已配置的真实 DeepSeek Key；它没有进入冻结快照，但随整个工作目录被复制到了新电脑，生产前必须轮换并重新建立版本控制边界。

综合判断：

- 产品原型完成度：高
- 本地可运行性：通过（新电脑依赖已重建）
- 测试基础：中上，但主要覆盖运行时与 Python 规则，缺少活跃 H5 业务端到端测试
- 文档一致性：需要整理
- 工程可追溯性：当前不合格（无 Git 元数据）
- 生产准备度：低到中，仍缺真实身份、课程/收藏服务、数据库、权限、数据删除与生产监控

## 当前产品与系统

活跃产品由两部分组成：

- `haf-energy-journey-h5/`：嵌入小程序首页、约 700px 高的“探索本心”H5。
- `haf-energy-dashboard/`：本地 DeepSeek 代理、匿名事件收集器、聚合接口和轻量看板。

当前主流程：

```text
首次 Loading
→ 三步玩法介绍
→ 一次性生日/资料建档
→ 四象连续罗盘
→ 规则合成 + Loading 阶段 AI 解读
→ 今日关键词、三条来源线索与总结
→ 三条“此刻契合”的体验推荐
→ 本地收藏与收藏页
```

回访时不重复建档，而是在 Loading 阶段生成每日问候，再进入罗盘。DeepSeek 只润色问候和解读，不参与数字、罗盘、脉轮或课程事实计算；请求失败或超过六秒时使用本地确定性文案。

目前后端和看板仍是本机 Demo：无登录、无权限、事件落在 JSONL、AI 缓存在单进程内存、收藏和档案在浏览器 localStorage。

## 实际进度重建

### 2026-08-21：Numerology Compass V1

- 已冻结在 `versions/2026-08-21-numerology-compass-v1/`。
- `haf-numerology-h5/` 是遗留工作副本，不属于根 README 定义的当前活跃项目，而且已与 V1 快照再次产生差异。
- 该目录约 158 MB，包含从旧电脑复制来的依赖；后续应明确归档、删除或重新纳入版本路线，避免和当前 Energy Journey 混淆。

### 2026-08-22：Energy Journey + Dashboard V2

- 完成 Personal Day 回访问候、完整能量旅程、三条课程、收藏页、最小埋点和本地看板。
- 冻结在 `versions/2026-08-22-energy-journey-dashboard-v2/`。

### 2026-08-23：Personalized Journey V3

- 增加首次三步介绍、真实日期规则、城市自由输入。
- 每日问候与能量解读改为 Loading 阶段预取，加入六秒超时、稳定缓存和展示后文案锁定。
- 修正结果页排版、重新感应闭环、问候缓存 Life Path 签名。
- 四个 HAF 领域 Skill 与 Python 测试齐全。
- 冻结在 `versions/2026-08-23-energy-journey-personalized-v3/`；本次 SHA-256 校验通过。

### 2026-08-24：尚未冻结的活跃改动

与 v3 快照对比，主要新增/修改集中在：

- `src/Prototype.tsx`：约增加 256 行，课程源从 15 门 Demo 切到历史标准化目录。
- `qa/course-recall-2025/`：254 场次、合并后 226 门课程、自动标签、召回报告和人工复核 CSV。
- `scripts/validate_course_recall.py`：实时目录规范化、标签、可用性和 2025 个能量组合的召回测试。
- 推荐策略变为“前两张准确优先 + 第三张合格探索位”。
- 课程卡展示真实历史日期、时间和形式；三张理由分别尝试使用数字、脉轮和罗盘证据。
- UI 叙事从“3 节课”改为“此刻与你契合的体验”。
- 8 月 24 日完成了新一轮文案审查截图。

活跃 Dashboard 源码与 v3 冻结版本一致；差异主要是本地 `.env.local` 和 `data/events.jsonl`。

## 验证结果

### 自动检查

| 检查 | 结果 |
| --- | --- |
| 移动运行时锁 | 28 个受保护文件全部通过 |
| Numerology Python 测试 | 5/5 通过 |
| Chakra Python 测试 | 6/6 通过 |
| Energy Synthesis Python 测试 | 6/6 通过 |
| Course Recommendation Python 测试 | 7/7 通过 |
| TypeScript 编译 | 通过 |
| Vite production build | 通过 |
| Sites Worker 测试 | 4/4 通过 |
| Dashboard `server.mjs` 语法检查 | 通过 |
| Playwright 移动运行时测试 | 8/8 通过 |
| v3 快照 SHA-256 | 通过 |

### 浏览器走查

使用本地 H5 与 Dashboard 实际走查：

- 首次介绍 → 建档 → 罗盘 → 结算成功。
- 结果页返回三张历史课程卡，日期、时间、形式和三种理由都正常显示。
- H5 首屏和结果页控制台无 warning/error。
- Dashboard 能正常展示访问用户、收藏用户、收藏总量、转化率、趋势和课程明细，控制台无 warning/error。
- 本次走查会按现有设计向本地 `events.jsonl` 增加一条匿名 `energy_module_viewed` 测试事件；未删除，避免擅自改动现有数据。

### 新电脑环境

旧 `node_modules` 来自 Intel/x64 Mac，命令脚本内含 `/Users/yokichen/...`，并缺少 ARM 版 TypeScript/浏览器二进制，不能直接复用。本次已完成：

- 把旧 H5 依赖移动到 `/tmp/haf-energy-journey-node_modules-x64-20260824`。
- 在活跃 H5 内重新安装当前 ARM 平台依赖。
- 下载 ARM 版 Playwright Chromium。
- 重新完成编译、构建和 8 项浏览器测试。

标准 `pnpm run build` 仍会因为 `prebuild` 内部硬编码调用 `npm run check:runtime`、而本机没有 `npm` 命令而失败；逐步执行等价命令已证明源码本身构建通过。

## 主要问题与风险

### P1：工作区没有 Git 元数据

`/Users/at_lp007/Documents/HAF_miniapp` 及其父级没有找到 `.git`。因此目前无法回答：

- 当前在哪个分支；
- 8 月 24 日改动是否已提交；
- 哪些文件是本地修改；
- 是否有远端仓库；
- `.env.local`、事件数据和构建产物是否曾被跟踪；
- 如何做一次可靠的代码级回滚。

现有 `versions/` 冻结目录是唯一恢复点。应在继续开发前恢复原 Git 仓库，或以 v3 快照为基线初始化新仓库并建立首个明确提交。不要在未确认忽略规则前直接 `git add .`。

### P1：课程可用性验证报告是错误的

`scripts/validate_course_recall.py` 的 `parse_datetime()` 在非空输入时没有返回解析结果。真正的 `datetime.strptime()` 被错误缩进到了 `parse_inventory()` 的 `return None` 之后，永远不可达。

直接复算结果：

```text
parse_datetime("2025-10-24 16:00:00") → None
```

因此 `RECALL_VALIDATION_REPORT.md` 中七个检查点全部显示 0 门可用课程，不代表真实数据。目录实际第一场为 2025-10-24 09:30，最后一场为 2025-10-26 18:00；活跃 H5 的 JavaScript 过滤在 2025-10-24 08:00 检查点得到 226 门可用课程。

该脚本还存在命名/覆盖风险：默认 API URL 已指向 `HAF 2026`，但验证版本、默认输出目录和报告标题仍叫 2025。若直接再次运行，会把 2026 数据写进 `qa/course-recall-2025/`。

建议先修复日期解析并增加单元测试，再拆分 `--event-id`、`--catalog-year` 和输出目录，最后重新生成报告。

### P1：真实 Key 随工作目录迁移

`haf-energy-dashboard/.env.local` 中检测到已配置 Key，文件权限为 `600`，且 `.gitignore` 已排除它；v3 冻结快照也没有包含该文件。这些边界是正确的。

风险在于当前没有 Git 元数据，且本次通过整目录复制完成迁移。项目文档已明确写过“曾在对话中出现的 Key 上线前必须轮换”。在连接远端、打包共享或生产部署前，应直接在 DeepSeek 控制台吊销旧 Key、生成新 Key，并只在新电脑本地密钥环境中配置。

### P2：活跃代码与文档状态漂移

以下表述已经不符合活跃 H5：

- `haf-energy-journey-h5/README.md` 仍写“课程来自 demo-courses.json”。
- `docs/ENERGY_RECOMMENDATION_ENGINE_PLAN.md` 仍写“当前课程目录为 15 节 Demo”。
- 2025 召回报告仍写“本轮不修改 V3 H5”，但活跃 `Prototype.tsx` 已经直接导入该历史目录。
- `VERSION.md` 仍只描述 v3 基线，没有说明 8 月 24 日 working state。

建议把“已批准 v3 基线”和“v4/2025 召回实验工作区”明确拆开，并把 README、架构、算法、QA 与版本文档同步到同一个状态描述。

### P2：推荐算法已有三套实现

目前至少存在三套相近但不同的推荐逻辑：

1. `src/Prototype.tsx` 中的活跃 H5 逻辑：226 门历史课程、两准确位 + 一探索位。
2. `skills/haf-course-recommendation/scripts/recommend_courses.py`：Skill/Demo 目录逻辑。
3. `scripts/validate_course_recall.py`：召回覆盖与曝光公平逻辑。

文档要求产品与 Skill 使用同一套规则，但目前三处在课程源、数字匹配、时长目标、探索位和理由模板上已经分叉。Python 的 7 项课程测试通过，并不能证明 H5 内的 TypeScript 推荐实现正确。

建议抽出一个版本化的共享课程 Schema、评分配置和黄金样例；至少让 TypeScript 与 Python 对同一批 fixture 产出相同前三 ID 和分数轨迹。

### P2：缺少活跃业务端到端测试

Playwright 的 8 项测试只覆盖通用移动运行时：Carousel、MobileScroll、BottomSheet、键盘、Pixel 导航和 FlowStack。当前没有自动测试覆盖：

- 首次/回访路由；
- 闰年生日与城市输入；
- 六秒 AI 超时及结果锁定；
- 226 门历史目录的场次过滤；
- 任意能量输入都恰好返回三张卡；
- 三张理由证据不重复；
- 收藏/取消、收藏页和重新感应；
- 事件只上报一次。

这些是当前项目最值得补的测试层。

### P2：FlowStack 旧页面仍暴露给辅助技术

浏览器走查从 Welcome 推到 Profile 后，DOM 中同时存在两个 `<main>`。旧页面虽然 `pointer-events: none`，但没有 `aria-hidden` 或 `inert`，可访问性树仍能读到旧页面按钮和标题。结算页也同时保留罗盘 `<main>`。

这不会阻断视觉使用，但会导致屏幕阅读器重复主区域、焦点误入旧路由。因为 FlowStack 属于受保护运行时，应在单独的 runtime 修改中修复，并加一项可访问性回归测试。

### P2：Dashboard 只能作为本地 Demo

当前 Dashboard 明确无鉴权，CORS 为 `*`，事件 ID 去重使用“读完整 JSONL → 检查 → append”，并发下不能保证唯一；事件字段校验也较弱。它适合本地展示，不应直接暴露到网络或生产环境。

生产替换仍需：登录/角色权限、数据库唯一约束、服务端时间与时区、限流、请求鉴权、持久缓存、审计和删除策略。

### P3：工程与性能清理项

- 主 JS 产物约 921 KB，gzip 约 263 KB，Vite 报出超过 500 KB 的拆包警告。
- `Prototype.tsx` 已达 1256 行，产品流程、规则、网络、缓存、推荐和页面都在一个文件里，后续变更风险会上升。
- 当前仓库总量约 405 MB，两个 working H5 都携带依赖，`versions/` 约 73 MB，另有 `.DS_Store`、`__pycache__`、测试结果和增量缓存。
- `AGENTS.md`、`VERSION.md`、旧 design QA 和旧测试结果仍含 `/Users/yokichen/...` 绝对路径；迁移后不可点击或执行。
- `haf-numerology-h5` 也携带旧 x64 依赖，尚未重建；它当前不是活跃项目。
- 课程自动标签仍有 4 门需要人工复核，且生产上线前必须用 2026 正式目录重新验证。

## 明天建议先做什么

建议按以下顺序推进，不要先继续做视觉微调：

1. 找回原远端 Git 地址或旧电脑的 `.git`，恢复提交历史；找不到时，以 v3 快照为基线创建新仓库。
2. 轮换 DeepSeek Key，确认 `.env.local`、`data/events.jsonl`、`node_modules`、`dist`、测试产物都不进入版本控制。
3. 修复 `validate_course_recall.py` 的日期解析和 2025/2026 输出隔离，增加最小单元测试并重跑报告。
4. 决定 8 月 24 日这轮是 `v4-course-recall-experiment` 还是临时 QA 分支；确认后创建新的只读快照。
5. 更新 README、VERSION、架构、算法和 QA 文档，使其准确描述 226 门历史课程回溯状态。
6. 为活跃 H5 增加产品流程与推荐端到端测试，并建立 TS/Python 推荐黄金样例对照。
7. 统一包管理器。若继续使用 npm，就在新电脑安装正式 Node.js/npm 并坚持 `package-lock.json`；若改用 pnpm，就更新脚本并提交 `pnpm-lock.yaml`，不要混用。

## 后续生产路线

完成以上工程整理后，再进入生产接入：

- 正式 HAF 登录与匿名 ID 映射；
- 真实 2026 课程目录、库存/售卖状态与详情接口；
- 服务端收藏与幂等；
- 一次结算生成能量文案 + 三条有证据的课程理由；
- 数据库、权限看板、共享缓存、限流和监控；
- 档案/历史结果/个性化授权删除；
- iPhone 与 Android 小程序 WebView 实机验收；
- 可访问性与对比度测试；
- 前端代码拆分和首屏性能优化。

## 可继续使用的本地入口

- H5：`http://127.0.0.1:4173/`
- Dashboard：`http://127.0.0.1:4174/`

本次 Review 没有部署、发布或修改产品源码；只重建了新电脑所需的 H5 依赖与 Playwright 浏览器环境，执行构建/测试，并新增了本 Review 文档。

## 2026-08-25 跟进状态

- 已确认新建远端仓库：`https://github.com/yoooki-droid/HAF-recommendation`。
- 远端是空仓库，原复制目录也没有 `.git`，所以旧提交历史无法从现有材料恢复；已在工作区初始化 `main` 并连接 `origin`。
- 已修复课程回溯日期解析，新增 5 项回归测试。
- 已将活动 ID、目录年份和输出目录显式隔离，并支持从现有标准化目录离线复算。
- 2025 报告已更正：10 月 24 日 08:00 为 226 门课程/254 个场次可用，18:00 仍有 158 门课程/177 个场次可用。
