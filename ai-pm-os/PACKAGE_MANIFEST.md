# ai-pm-os Package Manifest

本文件定义 `ai-pm-os/` 目录作为独立、可发布的 Skill 源码包。
发布时将此目录内容推送至独立 Git Repository 即可实现 Git URL 安装。

独立 Repository 根目录包含 `ai-pm-os/` 子目录，本目录内容原样位于该子目录中。
安装 URL 必须明确指向 `ai-pm-os/`，以保持当前验证器和安装器的路径契约。
本文档将包内运行时源码与外部宿主依赖严格区分。

---

## 1. 包内运行时源码（Package Runtime Source）

以下文件/目录位于 `ai-pm-os/` 内部，构成 Skill 独立运行所需的全部源码。
**包外运行时源码依赖计数：0**。

### 1.1 核心入口

| 文件 | 用途 |
|---|---|
| `ai-pm-os/SKILL.md` | Skill 主入口；包含触发条件、能力标签、执行循环、路由、失败升级路径 |
| `ai-pm-os/PACKAGE_MANIFEST.md` | 本文件；包边界与依赖契约 |

### 1.2 引用规则文件（references/）

| 文件 | 用途 | 包外依赖 |
|---|---|---|
| `references/framework-matrix.md` | 框架适用边界（PMBOK/PRINCE2/APM/PMO/Scrum/Kanban/Hybrid） | 无 |
| `references/router.md` | 意图→工作流路由表 | 无 |
| `references/fact-layers.md` | 事实层级（L0~L9）与转换规则 | 无 |
| `references/stability-rules.md` | 重复/冲突/脏工作树/原子PU/COC失败关闭 | 无 |
| `references/agile-delivery-rules.md` | Scrum/Kanban/Hybrid 行为规则与 DoR/DoD/Sprint/WIP 定义 | 无 |
| `references/agile-data-model-rules.md` | 11 类敏捷对象数据模型契约（ADM-01~11）、字段规范、状态枚举、审批规则、禁止状态 | 无 |
| `references/agile-reporting-rules.md` | 敏捷报告输入/JSON读取契约、8类P0指标、Burndown 9字段、Velocity 8字段、Scope冲突检查、fail-closed规则 | 无 |
| `references/json-data-contract-rules.md` | 26 个 JSON 数据契约、Schema 孤儿检查、P0 限制声明 | 无 |
| `references/json-sync-and-audit-rules.md` | Markdown→JSON 同步规则、审计契约、Source Map、Fail-Closed 行为 | 无 |
| `references/memory-and-recovery.md` | 六层信息源、Memory Boot 顺序、Active Context 契约 | 无 |
| `references/runtime-compliance-contracts.md` | 6 类 Critical Output Contract、10 字段、Pre-send Compliance Gate | 无 |
| `references/execution-integrity.md` | 执行身份模型、状态机、幂等 PU、部分失败恢复 | 无 |
| `references/conflict-and-chaos-rules.md` | 四类冲突、六类缺失、五类命名违规、五类脏工作树、Markdown/JSON 冲突方向（C-01~C-04、M-01~M-06、N-01~N-05、D-01~D-05） | 无 |
| `references/command-and-approval-rules.md` | 三层路由、六 Gate 状态、九审批状态、九类角色权限矩阵、十二 P0 工作流标准对象、未授权请求失败关闭 | 无 |
| `references/project-workflow-rules.md` | INIT/INTAKE/APPLY/TAKEOVER/AUDIT 五个 P0 基础工作流行为契约，含 P0/P1 边界声明 | 无 |
| `references/communication-and-reporting-rules.md` | BRIEFING/MEETING/TODO/REPORT_DAILY/REPORT_PERIODIC/REPORT_STEERING 六个 P0 专业工作流行为契约，含 9 字段、质量检查、事实来源禁止编造规则 | 无 |
| `references/install-and-invoke.md` | 安装与调用说明 | 无 |

### 1.3 行为场景（scenarios/）

| 文件 | 用途 | 包外依赖 |
|---|---|---|
| `scenarios/scenarios.md` | 138 个结构化 Given/When/Then/Allow/Forbid/Evidence 场景（60 原 + 10 WP-006 + 10 WP-007 + 10 WP-008 + 12 WP-009 + 10 WP-010 + 10 WP-011 + 12 WP-012 + 12 WP-013 新增，8 SC-COC 场景已移除） | 无 |

### 1.4 包内验证脚本（scripts/）

| 文件 | 用途 | 说明 |
|---|---|---|
| `scripts/validate-skill.js` | SI-01~SI-85（包含 SI-14b CHG-011 Applicability Gate）机器可验证规则；自包含运行（无外部包依赖）；支持隔离模式（无宿主文件时跳过 AGENTS.md/_AI_GLOBAL_MEMORY/ 检查） | 唯一验证实现 |

**注意**：`scripts/check-pollution.js` 不属于包内文件；它是完整项目壳的仓库 QA 适配器，不在独立 Skill 包安装范围内。

---

## 2. 外部宿主数据契约（Host Project Data Contracts）

以下目录/文件属于**宿主项目**（用户项目）的数据，不属于 Skill 包内。
Skill 运行时从宿主项目读取这些数据，但它们不是 Skill 包的内容。

### 2.1 项目 Memory 层

| 路径 | 用途 | 说明 |
|---|---|---|
| `00_PM_MEMORY/` | 项目内存状态（PM_CURRENT_STATUS.md 等） | 宿主项目提供 |
| `01_PM_DOCUMENTS/` | 正式项目文档（PM_SCOPE_BASELINE.md 等） | 宿主项目提供 |
| `02_AGILE/` | 敏捷数据 | 宿主项目提供 |
| `03_MEETINGS/` | 会议记录 | 宿主项目提供 |
| `04_TODO/` | To-do 数据 | 宿主项目提供 |
| `05_REPORTS/` | 报告数据 | 宿主项目提供 |
| `07_DATA/*.json` | JSON 可视化同步层 | 宿主项目提供 |
| `08_INTAKE/` | 输入材料 | 宿主项目提供 |
| `09_ARCHIVE/` | 归档材料 | 宿主项目提供 |

### 2.2 项目壳文件

| 路径 | 用途 | 说明 |
|---|---|---|
| `AGENTS.md` | Agent 治理铁律 | 宿主项目适配层；Skill 只读 |
| `README.md` | 项目说明 | 宿主项目提供 |
| `PRODUCT_SHELL_MANIFEST.md` | 产品壳结构 | 宿主项目提供 |
| `_AI_GLOBAL_MEMORY/` | 全局记忆规则 | 宿主项目适配层；Skill 引用但不依赖其存在 |

---

## 3. 包内验证器独立运行约束

包内验证脚本（`scripts/validate-skill.js`）必须满足：

1. **零外部包依赖**：仅使用 Node.js 标准库（`fs`、`path` 等）。
2. **相对路径定位**：`baseDir = path.resolve(__dirname, '..')`，向上定位到宿主项目根。
3. **不要求根目录 `scripts/`**：包内 `scripts/validate-skill.js` 自行承载验证逻辑。
4. **不要求 `AGENTS.md` 或 `_AI_GLOBAL_MEMORY/`**：Skill 运行时引用这些文件，但验证器不依赖其存在。
5. **退出码必须为 0**：`node ai-pm-os/scripts/validate-skill.js` 在干净包上退出码必须为 0。不接受"退出码 0 或 1"、"1=FAIL 也可预测"或其他弱化语义。

---

## 4. 仓库 QA 适配器（Repository QA Adapter）

根目录 `scripts/` 下的文件是**仓库级 QA 适配器**，不是 Skill 运行时必需文件：

| 脚本 | 用途 |
|---|---|
| `scripts/check-pollution.js` | 仓库污染检查 |
| `scripts/verify-release.js` | 发布边界与复制验证 |
| `scripts/verify-governance.js` | P0 治理证据验证（REQ-004~008、REQ-028） |

它们扫描完整项目壳，需要访问项目根目录的模板、数据与发布边界文件。

安装说明：
- **本地复制安装**：用户复制整个项目壳（含根目录 `scripts/`）后，所有脚本均可使用。
- **Git URL 安装（仅 `ai-pm-os/`）**：仓库 QA 适配器需要用户额外复制根目录 `scripts/`。

---

## 5. 包自包含验证（AC-13）

| 检查项 | 要求 | 通过标准 |
|---|---|---|
| 包外运行时源码依赖计数 | 必须为 0 | §1 中所有文件均在 `ai-pm-os/` 内 |
| 外部宿主数据契约 | 不得作为 Skill 运行时必需 | §2 中所有文件均标注为"宿主项目提供" |
| 包内验证脚本独立运行 | `node ai-pm-os/scripts/validate-skill.js` 在临时目录中退出码必须为 0 | 退出码 0 |
| 根目录 `scripts/` 非必需 | 移除根目录 `scripts/` 后 Skill 仍可正常触发和运行 | 不执行根目录脚本时 Skill 行为不受影响 |
