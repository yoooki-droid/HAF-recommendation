# HAF 探索本心数据看板

当前版本：`v1.0-minimal-dashboard`  
本地入口：`http://localhost:4174/`

这是探索本心 H5 的轻量数据看板与本地事件收集器。

- Dashboard: `http://localhost:4174/`
- Event endpoint: `POST http://localhost:4174/api/events`
- Summary endpoint: `GET http://localhost:4174/api/summary?days=7`

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

## 当前数据存储

本地收集器把事件保存到 `data/events.jsonl`。它只适合本地 Demo 和联调，不适合正式生产。

正式上线时应保留事件与聚合接口契约，但完成以下替换：

- JSONL 文件 → HAF 后端数据库
- 无鉴权看板 → 登录和权限控制
- 本地地址 → 正式 HTTPS API
- 单实例内存/文件去重 → 数据库唯一约束

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
