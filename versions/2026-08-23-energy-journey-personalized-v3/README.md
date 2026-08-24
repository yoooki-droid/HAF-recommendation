# HAF Energy Journey Personalized v3 Snapshot

冻结日期：2026-08-23  
版本：`v3.0-personalized-journey`

## 快照范围

- `haf-energy-journey-h5/`：H5 源码、移动运行时、资产、四个 HAF 领域 Skill、文档、QA 证据和可部署构建
- `haf-energy-dashboard/`：本地 DeepSeek 代理、埋点收集器、聚合接口和数据看板
- `SHA256SUMS`：快照内文件校验值

## 冻结能力

- 首次三步玩法介绍
- 一次性建档、真实日期规则和城市自由输入
- Loading 阶段生成的每日 AI 问候
- 四象连续罗盘
- 数字、罗盘与主次脉轮合成
- Loading 阶段生成的 AI 能量解读
- 6 秒超时、本地兜底和展示后文案锁定
- 包含 Life Path 的前后端问候缓存签名
- 不出现单字孤行的结算页排版
- 三节课程推荐、个性化规则理由与收藏页
- 重新感应闭环
- 最小访问/收藏数据看板

## 明确排除

- `.env.local` 和任何真实 API Key
- `data/events.jsonl` 和用户/测试事件
- `node_modules`
- `test-results`
- 临时日志与 TypeScript 增量缓存

## 恢复

不要直接修改本目录。恢复时把目标子目录复制到新的工作目录，安装依赖后执行：

```bash
npm install
npm run check:runtime
npm run build
npm run test:sites
```

后端需在新的安全环境中重新配置 `.env.local`，不得从聊天、旧日志或快照恢复已暴露的 Key。

## 继续开发

未来 UI、算法或接口修改继续在 `/Users/yokichen/Documents/HAF_miniapp/haf-energy-journey-h5` 与 `/Users/yokichen/Documents/HAF_miniapp/haf-energy-dashboard` 进行。下一次获得确认后创建新的版本快照。

