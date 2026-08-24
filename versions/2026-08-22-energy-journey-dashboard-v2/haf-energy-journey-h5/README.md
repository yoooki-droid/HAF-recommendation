# HAF 探索本心 H5

当前稳定版本：`v2.0-energy-journey`  
本地预览：`http://localhost:4173/`  
配套数据看板：`http://localhost:4174/`

## 产品定位

探索本心是嵌入 HAF 小程序首页的 700px 高 H5 模块。它把用户的每日数字节律、手指罗盘感应和 HAF 七脉轮反思模型结合，生成当日关键词、能量总结和三节课程推荐。

这里呈现的是用于自我觉察的提示，不是医疗、心理诊断或确定性预测。

## 当前完整流程

### 首次进入

加载 → 温柔介绍 → 一次性建档 → 罗盘感应 → 合成动画 → 今日结果 → 三节推荐课程 → 收藏页。

### 再次进入

加载 → 根据 Personal Day 变化的每日文字问候 → 罗盘感应 → 合成动画 → 今日结果 → 三节推荐课程 → 收藏页。

## 已完成能力

- 生日驱动的生命路径数与 Personal Day 计算
- Personal Day 1–9 的每日问候
- 四象连续坐标罗盘
- 罗盘、数字和七脉轮的结构化合成
- 每次推荐恰好三节课程
- 课程图片、名称、契合理由、时长与形式展示
- 本地收藏、取消收藏和独立收藏页
- 第二轮重新感应，不产生重复路由或死循环
- 访问和成功收藏的轻量埋点
- 埋点失败不阻断用户体验

## 当前仍为 Demo 的部分

- 课程数据来自 `skills/haf-course-recommendation/references/demo-courses.json`
- 收藏状态保存在浏览器本地
- 推荐理由来自确定性规则模板
- 埋点默认发送到本地看板服务 `http://localhost:4174/api/events`
- 未接入正式用户身份、课程、收藏、DeepSeek 和生产数据库

## 正式接口接入原则

1. 课程 API 提供课程事实：ID、标题、图片、时长、介绍、发布状态。
2. 收藏 API 成功后才更新收藏状态并记录收藏事件。
3. DeepSeek只能由 HAF 后端调用，前端不得持有 Key。
4. DeepSeek可批量提炼课程标签，但最终推荐理由仍需结合用户当日结果生成。
5. 任何模型失败都必须回退到规则结果，不能让页面中断。

## 数据看板

配套项目位于：

`/Users/yokichen/Documents/HAF_miniapp/haf-energy-dashboard`

第一版只统计：

- 访问用户数
- 收藏用户数
- 收藏总量
- 访问后收藏率
- 每日趋势
- 各课程收藏用户数与收藏次数

## 本地运行

H5：

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 4173
```

可使用环境变量替换埋点地址：

```bash
VITE_HAF_ANALYTICS_ENDPOINT=https://example.com/api/events
```

## 验证

交付前运行：

```bash
npm run check:runtime
npm run build
```

并实际验证：首次流程、回访流程、罗盘拖动、第二轮重新感应、三张课程卡、收藏页和看板同步。

## 相关文档

- `AGENTS.md`：不可违背的产品与运行约束
- `docs/ENERGY_RECOMMENDATION_ENGINE_PLAN.md`：算法与生产架构
- `docs/DAILY_GREETING_AND_REASON_STRATEGY.md`：每日问候和推荐理由
- `docs/ENERGY_ANALYTICS_DASHBOARD_PLAN.md`：轻量看板定义
- `docs/PRODUCTION_INTEGRATION_CHECKLIST.md`：正式接口接入清单
- `docs/UI_UX_NEXT_ITERATION.md`：下一轮 UI/UX 优化边界

