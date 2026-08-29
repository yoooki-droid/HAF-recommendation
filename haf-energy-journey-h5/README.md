# HAF 探索本心 H5

嵌入 HAF 小程序 WebView 的全屏每日能量感应模块。当前工作版本在 `design/visual-refresh-2026-08-26` 分支维护。

## 当前流程

```text
加载用户资料
├─ 无资料 → 填写个人信息 → 今日感应
└─ 有资料 → 今日感应
                ↓
         按住、移动、松手锁词
                ↓
             合成解读
                ↓
      今日回响 + 三项课程推荐
                ↓
       收藏 / 换一批 / 重新感应
```

入口介绍和回访欢迎页属于小程序，不在 H5 内。用户资料接口接入前，H5 暂时以 `localStorage` 的完成标记完成首次/回访分流。

## 本地运行

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

浏览器预览：<http://127.0.0.1:4173/>

## 构建与发版验收

```bash
npm run release:check
```

这条命令会完成移动运行时完整性检查、TypeScript 编译、Vite 构建、Sites Worker 打包，并验证感应页的背景视频、背景音乐和冥想引导音频均完整进入 `dist/client`。

正式发布产物为 `dist/`，不要把 `.env*`、`qa/`、`docs/`、`skills/`、截图或本地缓存作为静态站点上传。

## 环境变量

```bash
VITE_HAF_ANALYTICS_ENDPOINT=https://api.example.com/api/events
VITE_HAF_READING_ENDPOINT=https://api.example.com/api/energy-reading
```

第三方模型 Key 只能放在 HAF 后端密钥管理中，不能使用 `VITE_` 变量，也不能进入 H5、小程序包、Git、日志或截图。

## 文档入口

- [发版与前后端交接](docs/RELEASE_HANDOFF.md)
- [文档分类索引](docs/README.md)
- [接口契约](docs/API_CONTRACTS.md)
- [当前系统架构](docs/SYSTEM_ARCHITECTURE.md)
- [上线 QA 清单](docs/QA_RELEASE_CHECKLIST.md)
- [隐私与 AI 边界](docs/PRIVACY_AI_BOUNDARIES.md)

产品与运行时的长期约束以 [AGENTS.md](AGENTS.md) 为准。
