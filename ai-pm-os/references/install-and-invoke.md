# Install & Invoke — 安装与调用

`ai-pm-os` 支持两种安装方式：本地复制（复制整个项目壳）和 Git URL agent-assisted 安装（仅复制 `ai-pm-os/` 目录）。两种方式均有效。

## 1. 安装方式一：本地复制（全量安装）

复制整个项目壳目录（含 `ai-pm-os/`、`scripts/`、`AGENTS.md` 等全部文件）。

### 1.1 文件布局（全量安装）

```text
<PROJECT_ROOT>/
├── ai-pm-os/                    # Skill 包（含全部运行时文件）
│   ├── SKILL.md
│   ├── PACKAGE_MANIFEST.md
│   ├── references/
│   │   ├── framework-matrix.md
│   │   ├── router.md
│   │   ├── fact-layers.md
│   │   ├── stability-rules.md
│   │   ├── agile-delivery-rules.md
│   │   ├── memory-and-recovery.md
│   │   ├── runtime-compliance-contracts.md
│   │   ├── execution-integrity.md
│   │   └── install-and-invoke.md
│   ├── scenarios/
│   │   └── scenarios.md
│   └── scripts/
│       └── validate-skill.js    # 包内验证入口（独立运行）
├── scripts/
│   ├── validate-skill.js        # 仓库 QA 包装器（调用包内实现）
│   └── check-pollution.js      # 仓库级污染检查（非 Skill 运行时必需）
├── _AI_GLOBAL_MEMORY/           # 宿主适配层（Skill 引用但不需要安装）
├── AGENTS.md                    # 宿主 Agent 治理（Skill 只读）
├── 00_PM_MEMORY/                # 宿主项目数据
├── 01_PM_DOCUMENTS/            # 宿主项目文档
└── ...
```

### 1.2 Cursor / Codex 安装（全量）

1. 在 Cursor/Codex 中打开项目根目录。
2. Cursor/Codex 应自动发现 `ai-pm-os/SKILL.md`。
3. 若未自动发现，将 `ai-pm-os/` 路径加入 Agent 的工作区/上下文路径。
4. 验证：在对话框输入 `/ai-pm-os 今日 briefing`，期待输出包含当前阶段和待审批数量。

## 2. 安装方式二：Git URL agent-assisted（仅 `ai-pm-os/`）

将 `ai-pm-os/` 目录（或其所在的独立 Git Repository）作为 Skill 安装源。

独立仓库根目录包含 `ai-pm-os/` 子目录；该子目录直接包含 `SKILL.md`、
`PACKAGE_MANIFEST.md`、`references/`、`scenarios/` 和 `scripts/`。
Git URL 安装时应明确指定 `ai-pm-os/` 子目录。

### 2.1 仅包文件布局（Git URL 安装）

```text
ai-pm-os/                         # Skill 包（独立可发布）
├── SKILL.md
├── PACKAGE_MANIFEST.md
├── references/
│   ├── framework-matrix.md
│   ├── router.md
│   ├── fact-layers.md
│   ├── stability-rules.md
│   ├── agile-delivery-rules.md
│   ├── memory-and-recovery.md
│   ├── runtime-compliance-contracts.md
│   ├── execution-integrity.md
│   └── install-and-invoke.md
├── scenarios/
│   └── scenarios.md
└── scripts/
    └── validate-skill.js        # 包内验证入口（独立运行；零包外依赖）
```

### 2.2 调用方式

1. 将 `ai-pm-os/SKILL.md` 路径加入 Cursor/Codex 的 skill 索引。
2. 使用 `/ai-pm-os` 前缀或等价的自然语言意图。
3. 平台不支持原生命令时，按 §4 约定调用方式执行。

推荐给安装 Agent 的完整指令：

```text
请从 https://github.com/Shak-Zhu/AI_PM_OS_SKILL/tree/main/ai-pm-os 安装 ai-pm-os Skill。
Skill 位于仓库的 ai-pm-os/ 子目录。必须完整安装 SKILL.md、PACKAGE_MANIFEST.md、
references、scenarios 和 scripts，不得只复制 SKILL.md。
安装后运行 node ai-pm-os/scripts/validate-skill.js；退出码必须为0并报告实际安装路径。
完成后提醒我重启Agent。
```

### 2.3 验证

```bash
node ai-pm-os/scripts/validate-skill.js
```

退出 0 = Skill 包结构完整。验证器自动检测执行环境：
- **完整宿主模式**：检测到 `AGENTS.md` 和 `_AI_GLOBAL_MEMORY/` 后，运行全部 SI-01~SI-20 检查（含宿主启动顺序验证）。
- **隔离包模式**（仅 `ai-pm-os/` 复制到空目录）：宿主文件缺失时跳过 SI-09 的宿主文件部分，输出 `[ISOLATED ... host integration checks skipped]`，仍退出 0。

两种模式均返回退出码 0。

## 3. 包内验证入口

包内验证脚本位于 `ai-pm-os/scripts/validate-skill.js`，是 Skill 包的唯一验证实现。

```bash
# 方式一：从包内运行（独立，无需其他文件）
node ai-pm-os/scripts/validate-skill.js

# 方式二：从仓库根运行（包装器）
node scripts/validate-skill.js
```

包内验证脚本的约束：
- **零包外运行时依赖**：仅使用 Node.js 标准库。
- **相对路径定位**：从 `ai-pm-os/scripts/` 向上两级定位宿主项目根。
- **不要求根目录 `scripts/`、`AGENTS.md` 或 `_AI_GLOBAL_MEMORY/`**：Skill 运行时引用这些宿主文件，但验证脚本不依赖其存在。
- **隔离模式自动检测**：检测到宿主文件缺失时自动切换为隔离模式，跳过宿主集成检查并报告 `ISOLATED`，不影响退出码（仍退出 0）。

## 4. 仓库级 QA 命令

以下命令属于仓库级 QA，不属于 Skill 运行时：

```bash
node scripts/check-pollution.js  # 项目壳污染检查
node scripts/validate-skill.js   # 仓库包装器（调用包内实现）
node --check scripts/validate-skill.js
```

Git URL 独立安装后，`scripts/check-pollution.js` 需要用户额外复制根目录 `scripts/` 目录才能使用。

## 5. 最低必要调用验证

- **Memory Boot**：`/ai-pm-os 今日 briefing` 必须输出当前阶段、Scope Baseline 状态、待审批数量。
- **路由验证**：`/ai-pm-os 初始化项目` 在未初始化项目上必须返回 `INIT` 工作流，在已初始化项目上进入 `Conflict: already-initialized` 而不重复创建。
- **稳定性验证**：`node ai-pm-os/scripts/validate-skill.js` 在干净包上退出 0。

任一失败：禁止投入实际项目使用。

## 6. 平台说明

- 脚本均使用 Node.js 标准库 `fs` / `path`，可运行于 Windows / macOS / Linux。
- 禁止在 Skill 文件中写死绝对路径。
- Skill 仅操作当前宿主项目中已声明的项目相对路径。

## 7. 与宿主项目的关系

| 宿 主文件 | Skill 运行时是否必需 | 说明 |
|---|---|---|
| `ai-pm-os/SKILL.md` | **是** | Skill 入口 |
| `ai-pm-os/references/*.md` | **是** | Skill 规则源码 |
| `ai-pm-os/scenarios/scenarios.md` | **是** | 行为场景库 |
| `ai-pm-os/scripts/validate-skill.js` | 否（可选项） | 验证脚本 |
| `00_PM_MEMORY/PM_CURRENT_STATUS.md` | **是** | 项目状态数据 |
| `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md` | **是** | 项目范围基线 |
| `AGENTS.md` | 否（仅引用） | Agent 治理适配层 |
| `_AI_GLOBAL_MEMORY/AI_SKILL_OPERATING_RULES.md` | 否（仅引用） | 全局规则适配层 |
| `scripts/validate-skill.js` | 否（包装器） | 仓库 QA 适配器 |
| `scripts/check-pollution.js` | 否（仓库 QA） | 污染检查（非运行时） |

## 8. Cooper Helper Bootstrap

`ai-pm-os` 在 Memory Boot 后、正常意图路由前，自动检查 `cooper-mcp-helper` 是否已安装：

```bash
# 自动调用（首次）：无参数
node ai-pm-os/scripts/bootstrap-cooper-helper.js

# 显式重试（用户说"重试 Cooper 安装"）：
node ai-pm-os/scripts/bootstrap-cooper-helper.js --retry
```

状态机行为：
- `installed` → 永久跳过，不调用 runner。
- `deferred` / `unavailable` → 非阻塞，不自动重试。
- 成功 → `restart_required=true`，提示重启 Cursor/Codex。
- bootstrap 非 0 或 unavailable 不阻断正常项目管理请求。

详见 `references/cooper-helper-bootstrap.md`。

## 9. 升级与维护

- 修改 `ai-pm-os/**` 后必须同步更新 `ai-pm-os/scripts/validate-skill.js` 的必查列表与 `scenarios/scenarios.md` 的对应场景。
- 不得在未更新验证脚本与场景的情况下向用户宣传"已升级"。
- 对 Skill 规则的破坏性变更必须经过当前维护仓库定义的变更控制和验证流程；不得假设宿主项目存在特定私有目录。
