# AI工作记忆 (AI Working Memory)

---

## 1. 项目概述 (Project Overview)

- **项目名称**: 24小时自动卡密下单系统
- **核心业务**: 为小红书等平台的虚拟账号提供自动发卡服务。用户在线购买后，系统自动发送账号密码。
- **系统组成**:
  - **用户端 (C端)**: 响应式Web应用，用于商品展示、下单、订单查询。
  - **管理端 (B端)**: 后台管理系统，用于商品、订单、用户、公告等管理。
  - **后端服务**: Node.js API服务，处理业务逻辑和数据交互。

## 2. 技术栈 (Tech Stack)

- **C端前端**: Bootstrap 5, jQuery, AJAX, Day.js
- **B端前端**: Vue 3, TypeScript, Element Plus
- **后端**: Node.js, Express
- **数据库**: MySQL 5.7
- **图片存储**: 七牛云
- **自动化测试**: Node.js, axios, chalk

## 3. 核心开发规范 (Core Development Guidelines)

- **API对接**: 严格遵循 `docs/c-api` 和 `docs/b-api` 目录下的API文档进行开发，所有字段和路径必须完全一致。
- **代码风格**: 
  - 遵循各端现有代码风格，优先复用已有组件和工具类 (`utils` 目录)。
  - 所有请求和响应字段均使用 **驼峰命名法 (camelCase)**。
  - 禁止使用任何emoji图标。
- **数据表**: 严格遵循 `docs/数据表设计.md` 进行设计，所有表和字段需有中文注释。
- **密码加密**: 使用 **MD5** 算法。
- **配置文件**: 数据库、七牛云等敏感配置信息存放于 `.env` 和 `config` 文件中。

## 4. 当前项目状态 (Current Project Status)

当前仓库已落地一套可运行的 MVP：

1.  **C端（`web/`）**：首页商品列表、商品详情、下单/支付演示、订单列表/详情、登录/注册、我的页面。
2.  **B端（`admin/`）**：Vue 3 + TS + Element Plus 管理端（登录、仪表板、商品/订单/公告/用户/财务基础页面）。
3.  **后端（`server/`）**：Express + MySQL 接口（`/api/c/*`、`/api/b/*`），含 JWT 鉴权与七牛上传 Token。
4.  **文档（`docs/`）**：补齐 `数据表设计.md`、`c-api`、`b-api`。
5.  **脚本与测试**：`server/scripts/init-db.js`（`npm run db:init`），`tests/api-smoke.js`（冒烟脚本）。

## 5. 主要待办任务 (Key TODOs)

1.  **反向生成核心文档**: **(当前核心任务)** 由于API文档和数据表设计缺失，需要通过分析现有代码，优先生成以下文档：
    - `数据表设计.md`
    - `c-api.md` (用户端API)
    - `b-api.md` (管理端API)
2.  **C端API对接**: 在文档生成后，将用户端前端与后端API全面对接，替换所有静态数据。
3.  **B端API对接完善**: 检查并确保B端所有模块的功能均已完整对接API。
4.  **自动化测试覆盖率**: 完善并执行所有API的自动化测试。
5.  **七牛云上传功能**: 确保B端商品管理模块的图片上传功能已对接七牛云接口。
6.  **日期格式统一**: 确保所有返回给前端的日期时间格式为 `YYYY-MM-DD HH:mm:ss`。

## 6. 快速上手指令 (Quick Start Commands)

- **启动后端服务**:
  - `cd server`
  - `npm.cmd run db:init`（首次初始化）
  - `npm.cmd run dev`
- **启动B端前端**:
  - `cd admin`
  - `npm.cmd install`
  - `npm.cmd run dev`
- **启动C端前端**:
  - 直接打开 `web/index.html`（或使用 Live Server）
- **运行冒烟测试**:
  - `node tests/api-smoke.js`（需先启动后端并初始化数据库）
- **测试服务器地址**: `http://localhost:3000`

*（Windows PowerShell 环境如遇到脚本执行策略限制，请使用 `npm.cmd`。）*
