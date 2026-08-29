# HAF 探索本心：发版与前后端交接

版本：visual-refresh-2026-08-29
状态：可作为联调与发版单一入口；正式用户信息、课程和收藏接口待提供。

## 1. 发布范围

H5 只负责用户资料缺失时的建档、每日感应、结果合成、课程推荐和收藏界面。小程序负责入口介绍、登录态和 WebView 容器。

```text
小程序登录/入口
  → WebView 打开 H5
  → H5 加载用户资料状态
      ├─ missing: 个人资料页
      └─ ready: 感应页
  → 合成页
  → 结果/课程/收藏页
```

“重新感应”回到现有感应路由并创建新一轮状态：清除旧词、锁定白点和完成按钮，将小球归回中性起点；背景音乐继续，已经播放过的当天冥想引导不重复。

## 2. 前端构建

要求：Node.js 20+，依赖以 `package-lock.json` 为准。

```bash
npm ci
npm run release:check
```

`release:check` 顺序执行：

1. 校验受保护移动运行时没有意外变化。
2. 执行 TypeScript 编译和 Vite 生产构建。
3. 生成 Sites/Cloudflare Worker 包装。
4. 验证 SPA 回退、Worker 文件和全部感应媒体资源。

唯一应部署的目录是 `dist/`：

```text
dist/
├─ client/                 静态 H5 与媒体资源
├─ server/index.js         Sites Worker
└─ .openai/hosting.json    托管配置
```

## 3. 必须随包发布的媒体

源文件位于 `public/assets/haf/sensing/`，Vite 会原样复制到 `dist/client/assets/haf/sensing/`：

| 文件 | 用途 | 当前源文件大小 |
| --- | --- | ---: |
| `intuitive-flow-seedance-2-5-v1.mp4` | 感应页静音循环背景 | 2,776,987 bytes |
| `haf-fingertip-energy-flow-suno-mobile-v1.m4a` | 全流程环境音乐 | 1,751,477 bytes |
| `meditation-guide-haf-chenguang-v1.mp3` | 每自然日一次的冥想引导 | 78,573 bytes |

`tests/sites-worker.test.mjs` 会比较源文件与发布文件的字节数；缺失、空文件或复制不完整都会使 `release:check` 失败。

WebView 音频受 iOS 自动播放限制：用户第一次触摸用于解锁音频。旁白结束后才开放感应；环境音乐在感应、合成、结果、收藏和修改档案之间复用同一个实例，不在切页时重新下载或重新播放。

## 4. 环境变量与安全

前端只允许配置 HAF 自有接口：

```text
VITE_HAF_ANALYTICS_ENDPOINT=https://<haf-api>/api/events
VITE_HAF_READING_ENDPOINT=https://<haf-api>/api/energy-reading
```

未配置时当前原型会访问 `http://localhost:4174` 并在失败后使用本地规则文案。生产构建必须显式配置 HTTPS 地址并验证 CORS、超时和降级。

DeepSeek、火山、Seedance、语音或其他第三方 Key 只能由 HAF 后端保存。任何 `VITE_*` 都会进入浏览器包，因此绝不能放密钥。上线前必须轮换曾在对话、截图或终端中出现过的 Key。

## 5. 待接用户信息接口

当前 `JourneyProvider` 用一个异步 bootstrap 状态隔离资料路由：`loading | missing | ready`。接入接口时只替换该适配层，不恢复旧的 H5 介绍/问候页面。

建议后端返回：

```json
{
  "user_id": "haf-user-id",
  "profile_status": "ready",
  "profile": {
    "birth_date": "1992-08-07",
    "birth_time_period": "不确定",
    "gender": "女性",
    "city": "上海"
  },
  "updated_at": "2026-08-29T08:00:00+08:00"
}
```

约束：

- `profile_status=missing` 才显示个人资料页。
- 年份允许输入，前端当前接受并收敛到 1936–2010；月份和日期仍以轻点切换，日期按真实月份及闰年校验。
- 出生时间只接受 `早上 / 中午 / 下午 / 晚上 / 不确定`。
- 登录身份由小程序或 HAF 会话提供，不能相信 URL 中可伪造的用户 ID。
- 资料提交需幂等，保存成功后再进入感应页；失败时保留用户输入并允许重试。

## 6. 其他后端接口

- `POST /api/energy-reading`：只接收派生后的日期、灵数主题、锁定词和主次脉轮信号；不发送生日、性别、城市或模型 Key。
- `POST /api/events`：当前仅 `energy_module_viewed` 和成功新增收藏事件，失败不得阻断体验。
- 课程列表：必须返回稳定 ID、真实标题/封面/描述、课程状态和场次；当前运行时使用 `qa/course-recall-2025/catalog-normalized.json` 做历史召回验证。
- 收藏接口：需要鉴权与幂等键；生产环境应以后端最终状态为准，并支持新增与取消。

完整字段见 `API_CONTRACTS.md`，生产替换顺序见 `PRODUCTION_INTEGRATION_CHECKLIST.md`。

## 7. 小程序 WebView 联调

- 容器允许 H5 画满全屏，顶部/底部内容继续遵守安全区。
- 小程序先完成登录，再向 H5 提供可验证的 HAF 会话；不要把第三方 Key 或长期令牌拼在 URL。
- 域名加入小程序业务域名白名单，全部资源和接口使用 HTTPS。
- 验证 iOS 首触音频解锁、Android 返回键、前后台切换、静音状态和弱网回退。
- 用户当天首次感应播放一次引导；同一天“重新感应”只保留音乐，不重播旁白。

## 8. 不应进入发布包的内容

以下内容保留在源码仓库或设计工作区，不上传为站点静态文件：

- `.env*`、密钥、令牌、本地服务日志和 `data/`
- `qa/`、`ref/`、截图、Figma 导出和阶段性视觉对比
- `docs/`、`skills/`、测试脚本与开发工具
- `node_modules/`、源代码和未使用的生成素材

发布系统应只接收 `dist/`，不要直接把仓库根目录作为静态目录。

## 9. 上线门槛

1. `npm run release:check` 全绿。
2. 内置浏览器完成：首次建档、年份输入、感应、结果、收藏、换批、重新感应重置。
3. iPhone 和 Android 小程序 WebView 各走一遍完整流程。
4. 检查生产接口、CORS、超时与本地兜底。
5. 检查 `dist/client` 中没有 `.env`、Key、源码映射或非发布参考文件。
6. 抽查三项媒体返回 200、支持缓存，并在弱网下有海报/静默降级。
7. 轮换所有曾暴露的第三方凭证，再创建正式构建。
