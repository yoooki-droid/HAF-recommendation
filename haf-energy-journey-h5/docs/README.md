# HAF 探索本心文档索引

更新日期：2026-08-29

## 发版必读

这些文档描述当前可运行版本，前后端联调和发版以它们为准：

1. `RELEASE_HANDOFF.md`：唯一发版入口，包含构建产物、媒体资源、环境变量、接口接入与验收步骤。
2. `API_CONTRACTS.md`：H5 与 HAF 后端的请求/响应边界。
3. `SYSTEM_ARCHITECTURE.md`：当前页面流、规则层、存储和服务边界。
4. `PRIVACY_AI_BOUNDARIES.md`：数据最小化、模型调用和密钥红线。
5. `PRODUCTION_INTEGRATION_CHECKLIST.md`：正式用户、课程、收藏和埋点服务接入事项。
6. `QA_RELEASE_CHECKLIST.md`：WebView 与回归验收清单。

## 规则与算法依据

- `NUMEROLOGY_RULE_REVIEW_2026-08-27.md`
- `COURSE_AVAILABILITY_AND_RECALL_RULES.md`
- `ENERGY_RECOMMENDATION_ENGINE_PLAN.md`
- `SENSING_WORD_CONNECTION_AUDIT.md`

运行时的版本化规则还依赖项目内 `skills/haf-*` 的 JSON 模型和测试；修改公式时必须同步更新这些来源，不能只改页面文案。

## 设计与研究参考（不参与发版）

- `INTUITIVE_SENSING_DESIGN_QA.md`
- `UI_UX_NEXT_ITERATION.md`
- `DAILY_GREETING_AND_REASON_STRATEGY.md`：其中 H5 每日问候页已移交小程序，仅保留历史研究价值。
- `ENERGY_ANALYTICS_DASHBOARD_PLAN.md`
- 项目根目录外的 `ref/`、项目内 `qa/` 截图与阶段性复盘材料。

上述参考文件用于追溯设计和算法决策，不应复制到静态站点发布目录。发布脚本只上传构建后的 `dist/`。
