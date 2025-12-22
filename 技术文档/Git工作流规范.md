# Git 工作流规范 (Git Workflow Guide)

---

## 1. 核心原则 (Core Principles)

本规范旨在统一项目的Git使用流程，确保代码库的整洁、版本迭代的清晰以及团队协作的高效。所有项目成员都应严格遵守本规范。

## 2. 分支模型 (Branching Model)

我们采用基于 `Git Flow` 的简化模型，主要包含以下几种分支：

### 主要分支 (Main Branches)

- **`main`**: 主分支。
  - 存放的是最稳定、可随时部署到生产环境的代码。
  - **严禁**直接向 `main` 分支提交代码。所有合并都必须通过 Pull Request (PR) 进行。

- **`develop`**: 开发主分支。
  - 这是所有功能开发的基准分支，包含了项目最新的开发成果。
  - 当一个版本的功能全部开发完成并通过测试后，`develop` 分支将被合并到 `main` 分支以发布新版本。

### 辅助分支 (Supporting Branches)

- **`feature/*`**: 功能分支。
  - **命名规范**: `feature/模块-简短功能描述` (例如: `feature/order-api-对接`)
  - **来源**: 从 `develop` 分支创建。
  - **用途**: 用于开发一个新的、独立的功能。
  - **合并**: 功能开发完成后，合并回 `develop` 分支（通过PR）。

- **`fix/*`**: Bug修复分支。
  - **命名规范**: `fix/模块-bug描述` (例如: `fix/login-undefined-param`)
  - **来源**: 从 `develop` 分支创建。
  - **用途**: 用于修复 `develop` 分支上的Bug。
  - **合并**: 修复完成后，合并回 `develop` 分支（通过PR）。

- **`hotfix/*`**: 紧急修复分支。
  - **命名规范**: `hotfix/紧急问题描述` (例如: `hotfix/payment-callback-error`)
  - **来源**: 从 `main` 分支创建。
  - **用途**: 用于紧急修复线上生产环境的Bug。
  - **合并**: 修复完成后，**必须同时合并回 `main` 和 `develop` 分支**，以确保修复同步。

## 3. 提交信息规范 (Commit Message Convention)

为了保证提交历史的可读性，我们采用 `Angular` 提交规范。每次提交的Commit Message都应遵循以下格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

- **`<type>` (必需)**: 提交类型，常用类型如下：
  - `feat`: 新功能 (feature)
  - `fix`: Bug修复
  - `docs`: 文档变更
  - `style`: 代码格式（不影响代码运行的变动）
  - `refactor`: 重构（既不是新增功能，也不是修改bug的代码变动）
  - `test`: 增加测试
  - `chore`: 构建过程或辅助工具的变动

- **`<scope>` (可选)**: 本次提交影响的范围，如模块名（`login`, `order`, `api` 等）。

- **`<subject>` (必需)**: 简短描述，不超过50个字符，清晰说明本次提交的目的。

**示例:**

- `feat(order): 实现用户端创建订单接口对接`
- `fix(admin): 修复商品编辑后状态未更新的Bug`
- `docs(git): 添加Git工作流规范文档`

## 4. 开发流程 (Development Workflow)

1.  **开始新任务**: 
    - `git checkout develop`
    - `git pull origin develop` (确保本地 `develop` 是最新的)
    - `git checkout -b feature/your-feature-name` (创建新的功能分支)

2.  **进行开发**: 
    - 在新分支上进行编码和修改。
    - 遵循“小步快跑”原则，频繁提交有意义的变更。
    - `git add .`
    - `git commit -m "feat(scope): your commit message"`

3.  **完成开发**: 
    - `git push origin feature/your-feature-name` (将本地分支推送到远程仓库)

4.  **创建Pull Request (PR)**:
    - 在代码托管平台（如GitHub, GitLab）上，创建一个从 `feature/your-feature-name` 到 `develop` 的Pull Request。
    - 在PR中详细描述本次变更的内容和目的。

5.  **代码审查与合并 (Code Review & Merge)**:
    - 至少需要一名其他团队成员进行代码审查 (Code Review)。
    - 审查通过后，由项目负责人将PR合并到 `develop` 分支。
    - 合并后，删除该功能分支。

