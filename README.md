# 24小时卡密交易平台

一个包含 **用户端（C端）**、**管理端（B端）** 与 **后端 API** 的本地可运行 MVP，用于演示“交易创建 → 支付（模拟）→ 获取卡密”的完整流程。

## 目录结构

- `web/`：用户端（C端）静态站点（Bootstrap + jQuery + AJAX）
- `admin/`：管理端（B端）前端（Vue 3 + TypeScript + Element Plus）
- `server/`：后端 API 服务（Node.js + Express + MySQL 5.7+）
- `docs/`：数据表设计与 API 文档（`docs/数据表设计.md`、`docs/c-api/`、`docs/b-api/`）
- `技术文档/`：项目过程文档与协作规范

## 运行环境（Windows）

- Node.js ≥ 18（推荐 LTS），npm
- MySQL ≥ 5.7（建议 8.0+；已在 8.4 测试）或 MariaDB ≥ 10.6

> Anaconda/Miniconda 主要用于管理 **Python 环境**，一般不会自带 MySQL 服务端；本项目后端需要单独的 MySQL（或 MariaDB）服务。

## 快速开始（Windows）

### 1) 安装并启动 MySQL（推荐一键脚本）

以“管理员”打开 PowerShell，执行（会写入 `server/.env` 并初始化数据库）：

- `powershell -ExecutionPolicy Bypass -File server/scripts/setup-db-win.ps1 -InstallMySQL -DbUser root -DbPassword "你的root密码" -DbName auto_card`

脚本默认会创建并启动 Windows 服务：`MySQLAutoCard`（端口 `3306`）。

如你更想用 MariaDB（MySQL 兼容），改用：

- `powershell -ExecutionPolicy Bypass -File server/scripts/setup-db-win.ps1 -InstallMariaDB -DbUser root -DbPassword "你的root密码" -DbName auto_card`

### 2) 手动配置（不使用脚本）

1) 安装数据库（任选其一）：

- MySQL：`winget install -e --id Oracle.MySQL --source winget --accept-source-agreements --accept-package-agreements --silent`
- MariaDB：`winget install -e --id MariaDB.Server --source winget --accept-source-agreements --accept-package-agreements --silent`

2) 准备 `server/.env`：

- 复制 `server/.env.example` → `server/.env`，填写 `DB_*`、`JWT_SECRET` 等
- 注意：`server/.env` 已在 `.gitignore` 中忽略，不要提交

3) 初始化并启动后端：

- `cd server`
- `npm.cmd install`
- `npm.cmd run db:init`
- `npm.cmd run dev`

默认地址：`http://localhost:3000`

> 说明：如果 PowerShell 执行策略导致 `npm` 不能运行，请使用 `npm.cmd`（本仓库统一按此写法）。

## 前端启动

### 用户端（web）

- 推荐：启动后端后直接访问 `http://localhost:3000/`（后端会托管 `web/` 静态页面）
- 也可以直接打开 `web/index.html`（或用 VSCode Live Server）；此时默认请求 `http://localhost:3000`

### 管理端（admin）

- `cd admin`
- `npm.cmd install`
- `npm.cmd run dev`
- 访问：`http://localhost:5173`

生产预览（可选）：

- `cd admin`
- `npm.cmd run build`
- 启动后端后访问：`http://localhost:3000/admin/`

## Docker Compose（推荐）

- `cp server/.env.example server/.env`（按需修改配置）
- `docker compose up -d --build`

Docker 会自动等待 MySQL 就绪并执行 `db:init`，无需手动初始化。
镜像包含 C 端静态页与管理端构建产物，如修改前端需重新 `docker compose up -d --build`。

## 用户自行配置（DB/JWT/支付）

1) 数据库（DB_*）
   - Docker：由 `MYSQL_DATABASE` 创建数据库；启动时自动执行 `db:init` 建表
   - 非 Docker：执行 `npm.cmd --prefix server run db:init` 自动创建数据库与表（需具备权限）
2) JWT（登录鉴权）
   - `JWT_SECRET` 必须替换为强随机字符串（用于签发/校验登录 token）
3) 支付（可选）
   - 默认走演示支付流程
   - 需要真实支付时，在 `server/.env` 填写 `PAYMENT_*` 并按你的支付服务商接入

## 数据库备份/恢复（可选）

- 备份：
  - Windows：`powershell scripts/backup-db.ps1`
  - Linux/Mac：`bash scripts/backup-db.sh`
- 恢复：
  - Windows：`powershell scripts/restore-db.ps1 backups/xxx.sql`
  - Linux/Mac：`bash scripts/restore-db.sh backups/xxx.sql`

## 默认账号

- 管理员：`admin` / `admin123`

## 业务说明（演示版）

- 卡密按“唯一库存”处理：交易创建后会临时锁定（默认 15 分钟），支付成功后自动发货并发放卡密
- 超时未支付会自动取消并释放库存；可在 `server/.env` 通过 `ORDER_EXPIRE_MINUTES` 调整
- 支持促销价（可配置开始/结束时间）与满减规则，订单记录原价/优惠/实付金额
- 库存导入提供重复/超长/已存在等校验与失败清单导出
- 支付为演示流程，真实支付可通过 `.env` 中 `PAYMENT_*` 自行接入

## 文档入口

- 数据表与接口：`docs/README.md`
- 项目概述/架构/部署与协作规范：`技术文档/`

## 常见问题

- 数据库端口：`Test-NetConnection 127.0.0.1 -Port 3306`
- 服务是否启动：`Get-Service MySQLAutoCard`（或在“服务”里查看）
- 连接失败优先检查：`server/.env` 的 `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
- **DB 是什么？** 数据库连接配置（MySQL/MariaDB）。容器启动会创建数据库，但表结构需要 `db:init` 创建。
- **JWT 是什么？** 登录令牌的签名密钥，用于管理员/用户登录鉴权，必须自定义且保密。
