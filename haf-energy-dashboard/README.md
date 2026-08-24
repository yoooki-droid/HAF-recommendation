# HAF 探索本心数据看板

当前版本：`v1.1-ai-copy-and-dashboard`  
本地入口：`http://localhost:4174/`

这是探索本心 H5 的轻量数据看板与本地事件收集器。

- Dashboard: `http://localhost:4174/`
- Event endpoint: `POST http://localhost:4174/api/events`
- Summary endpoint: `GET http://localhost:4174/api/summary?days=7`
- Energy reading endpoint: `POST http://localhost:4174/api/energy-reading`
- Daily greeting endpoint: `POST http://localhost:4174/api/daily-greeting`

## 当前指标

- 访问用户数
- 收藏用户数
- 收藏总量
- 访问后收藏率
- 每日访问与收藏趋势
- 各课程收藏用户数与收藏次数

页面每 5 秒读取一次聚合结果。

## 当前事件接口

`POST /api/events`

支持：

- `energy_module_viewed`
- `energy_course_favorited`

服务端通过 `event_id` 去重，收藏事件只应在收藏成功后发送。

## DeepSeek 能量解读

`POST /api/energy-reading` 只接收已经计算完成的匿名能量事实，不接收生日、性别或城市。后端使用 DeepSeek 将这些事实润色为 18–50 个中文字符的解读，并按匿名用户、自然日和结果签名缓存。同一次结果不会重复调用；接口失败时 H5 使用本地规则文案。H5 在合成 Loading 阶段发起请求，最长等待 6 秒，进入结果页后不再更新文字。

本机密钥保存在不会提交的 `.env.local`：

```bash
DEEPSEEK_API_KEY=replace_with_your_server_side_key
DEEPSEEK_MODEL=deepseek-v4-flash
```

浏览器端不得读取或保存该密钥。

`POST /api/daily-greeting` 使用已经计算好的 Personal Day、主题、生命路径数、每日表达切面和最近30条问候，实时生成14–30个中文字符的问候标题。缓存签名包含匿名用户、自然日、Personal Day、Life Path、每日表达切面和提示词版本，因此用户修改生日后不会错误复用旧 Life Path 的问候。H5 在初始化 Loading 阶段发起请求，最长等待6秒；超时后锁定本地问候，不在问候页继续请求。接口不接收生日、性别或城市。

## 接口错误行为

- 请求校验失败：`400 invalid_request`
- 未配置 Key：`503 ai_not_configured`
- DeepSeek 超时、非 2xx 或无效输出：`502 ai_unavailable`
- 所有响应都使用 `Cache-Control: no-store`
- 前端必须始终保留确定性兜底，不得让 AI 接口阻断旅程

## 当前数据存储

本地收集器把事件保存到 `data/events.jsonl`。它只适合本地 Demo 和联调，不适合正式生产。

正式上线时应保留事件与聚合接口契约，但完成以下替换：

- JSONL 文件 → HAF 后端数据库
- 无鉴权看板 → 登录和权限控制
- 本地地址 → 正式 HTTPS API
- 单实例内存/文件去重 → 数据库唯一约束
- 问候与解读内存缓存 → 带 TTL、模型版本和提示词版本的共享缓存

H5 通过 `VITE_HAF_ANALYTICS_ENDPOINT` 指向正式事件接口。

## 本地运行

```bash
npm run start
```

默认端口为 4174，可通过 `HAF_DASHBOARD_PORT` 修改。

## 生产注意事项

- 不向看板发送生日、姓名、手机号、罗盘坐标或完整推荐理由
- 统一使用服务端时间划分自然日
- 看板只展示聚合数据
- 上线前核对一次访问和一次收藏只计一次
- 生产上线前轮换曾在对话中出现过的 DeepSeek Key
- 不把 `.env.local` 或 `data/events.jsonl` 放入版本快照

完整请求/响应字段见 `../haf-energy-journey-h5/docs/API_CONTRACTS.md`。
