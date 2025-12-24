# Project Context

## Purpose
本项目是一个可本地运行的“卡密交易平台”MVP，覆盖用户端下单、支付模拟、自动发货卡密、管理端库存/订单/财务运营管理的完整流程。
目标是提供清晰可扩展的演示版本，便于后续接入真实支付与扩展业务规则。

## Tech Stack
- 后端：Node.js 18 + Express
- 数据库：MySQL 5.7+ / MariaDB 10.6+
- 管理端（B 端）：Vue 3 + TypeScript + Vite + Element Plus
- 用户端（C 端）：HTML/CSS/JS + Bootstrap + jQuery
- 文档：Markdown
- CI：GitHub Actions（生产交付打包）

## Project Conventions

### Code Style
- 保持现有风格与结构，不引入全局格式化工具变更
- TS/JS 采用现有文件风格（函数式为主，避免过度抽象）
- Windows 环境执行命令使用 `npm.cmd`
- 默认 ASCII，除非文件已使用中文/Unicode

### Architecture Patterns
- B/C 端 API 分离：`/api/b/*` 管理端，`/api/c/*` 用户端
- Express 路由分层：`server/routes/b`、`server/routes/c`
- 数据访问：SQL + mysql2 连接池
- 静态站点：C 端由服务端托管 `web/`，B 端生产环境托管 `admin/dist`

### Testing Strategy
- 以接口烟雾测试为主：`tests/api-smoke.js`、`tests/order-lock-smoke.js`、`tests/marketing-smoke.js`
- 运行方式：`node tests/<script>.js`（需后端与数据库启动）

### Git Workflow
- 分支模型：`main` + `develop`，功能分支 `feature/*`，修复分支 `fix/*`，紧急修复 `hotfix/*`
- 提交规范：Angular 约定（`feat/fix/docs/test/chore`）
- 远端：`https://github.com/kipp7/auto-card`

## Domain Context
- 订单创建会预占卡密库存，超时自动释放
- 支付为模拟流程，真实支付后续接入
- 支持促销价与满减规则，订单记录原价/优惠/实付
- 对账检查用于发现“已支付但卡密异常”的订单

## Important Constraints
- 需 MySQL/MariaDB 服务；Anaconda 不包含 MySQL
- 生产环境需配置 `.env`（不提交）
- 订单超时策略受 `ORDER_EXPIRE_MINUTES` 控制

## External Dependencies
- MySQL / MariaDB
- 可能的云存储：七牛（如启用上传）
- 前端依赖：Bootstrap、Element Plus
- GitHub Actions（生产交付打包）
