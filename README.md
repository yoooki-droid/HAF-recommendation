# HAF Miniapp：探索本心工作区

当前批准基线：`v3.0-personalized-journey`  
日期：2026-08-23

## 版本控制

- GitHub：`https://github.com/yoooki-droid/HAF-recommendation`
- 主分支：`main`
- 2026-08-25 在新电脑恢复为 Git 工作区；原复制目录没有携带旧 `.git`，因此仓库从当前恢复状态建立历史。

## 活跃项目

- `haf-energy-journey-h5/`：嵌入小程序首页的探索本心 H5
- `haf-energy-dashboard/`：本地 AI 接口、埋点收集器和轻量数据看板
- `versions/`：不可直接编辑的历史快照
- `design/`：早期流程探索稿

## 当前入口

- H5：`http://localhost:4173/`
- 数据看板：`http://localhost:4174/`

## 当前快照

`versions/2026-08-23-energy-journey-personalized-v3`

该快照冻结已确认的首次介绍、每日 AI 问候、罗盘、数字与脉轮合成、AI 能量解读、三节课程推荐、收藏页和最小数据看板。未来修改只在活跃项目进行，确认后创建新的版本目录。

## 文档入口

从 `haf-energy-journey-h5/README.md` 开始。它链接产品、架构、接口、隐私、QA、算法、看板和正式接入文档。

项目迁移与进度审查见 `PROJECT_REVIEW_2026-08-24.md`。

## 安全规则

- 不将 `.env.local`、API Key、事件数据或依赖目录复制进快照。
- 不直接编辑 `versions/` 下的旧版本。
- 生产上线前轮换曾经在聊天中出现过的 DeepSeek Key。
