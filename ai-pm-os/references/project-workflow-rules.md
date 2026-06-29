# 项目工作流规则（Project Workflow Rules）

本文档定义 INIT、INTAKE、APPLY、TAKEOVER、AUDIT 五个 P0 基础工作流的完整行为契约。
本文档是 `command-and-approval-rules.md` §3 中 P0 工作流标准路由对象的具体实现。
每个工作流对象必须包含以下 8 个字段：

| 字段 | 说明 | 约束 |
|---|---|---|
| `workflow_id` | 唯一标识符，全部大写 | 不得重复 |
| `entry_triggers` | 触发关键词（中文/英文） | 必须可正则匹配 |
| `required_reads` | 执行前必须读取的文件列表 | 不得为空 |
| `preflight_gates` | 前置门条件 | 必须至少 1 项 |
| `allowed_outputs` | 允许输出的文件/制品 | 不得含未批准 Baseline 写入 |
| `forbidden_outputs` | 禁止输出的文件/制品 | 必须至少 1 项 |
| `state_transitions` | 状态转换规则 | 不得跳过审批 |
| `failure_escalation` | 失败升级路径 | 不得静默失败 |

---

## WF-P0-01: INIT — 项目初始化

### 工作流概述

INIT 是项目的第一个工作流，用于在空白目录或无现有文件时创建 Draft 模板、metadata、空工作状态和 JSON 初始状态。INIT 输出均为 Draft 或 Draft-adjacent 文件，不得直接生成 Approved 状态。

### entry_triggers

- 初始化 / initialize / 启动项目 / init / initialize project / 新建项目 / setup project

### required_reads

1. `PM_MEMORY_INDEX.md`（若存在）
2. `PM_ROLE_CONFIG.md`（若存在）
3. 外层目录结构（用于判断是否为空目录）

### preflight_gates

1. 目标目录为空目录或只含 `.git/`（无其他 PM 文件）
2. 不存在已批准的 Scope Baseline
3. 无冲突文件（C-01~C-04）

### allowed_outputs

- `PM_MEMORY_INDEX.md`（Draft，00_PM_MEMORY 文件清单）
- `01_PM_DOCUMENTS/PM_PROJECT_BRIEF.md`（Draft）
- `00_PM_MEMORY/PM_ROLE_CONFIG.md`（若不存在）
- `04_TODO/`（空目录占位，To-do 由后续工作流管理）
- `00_PM_MEMORY/PM_RAID_LOG.md`（Draft 空状态）
- `00_PM_MEMORY/PM_PENDING_UPDATES.md`（Draft 空状态）
- `00_PM_MEMORY/PM_DOCUMENT_REGISTRY.md`（Draft）
- `00_PM_MEMORY/PM_INPUT_LOG.md`（Draft 空状态）
- `00_PM_MEMORY/PM_GAP_ANALYSIS.md`（Draft 空状态）
- `00_PM_MEMORY/PM_APPROVAL_STATUS.md`（Draft）
- `07_DATA/project_roles.json`（初始状态，若不存在）
- `07_DATA/documents.json`（初始状态，若不存在）

### forbidden_outputs

- **禁止**生成 `Scope Baseline` 或任何 `Approved` 状态文件
- **禁止**生成已批准的 WBS 或已批准的 Project Brief
- **禁止**跳过 Draft 直接输出正式文件
- **禁止**在已有完整项目结构时重新初始化（必须先执行 TAKEOVER）

### state_transitions

- 初始状态：`draft`（隐式）
- INIT 完成后：输出文件状态为 `Draft`
- 不得从 `Draft` 直接跳转为 `Approved`

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| 目录非空且含 PM 文件 | L2：输出 Gap：目录非空，请先执行 TAKEOVER |
| 存在 Approved Baseline | L2：Scope Baseline 已存在，请确认是否需要接管 |
| 存在命名冲突 | L2：输出 Conflict 报告，停止 |
| 目录不存在 | L4：输出 Issue：目录不可创建，停止 |

---

## WF-P0-02: INTAKE — 材料处理与需求登记

### 工作流概述

INTAKE 接收外部材料（文档、消息、邮件内容、文件），识别其中的需求（Requirement）、RAID（Risk/Action/Issue/Decision）条目和 Gap，输出 Pending Updates 草案（PM_PENDING_UPDATES.md 草案）和 Input Log 条目。INTAKE 不直接修改 Approved Baseline；所有正式变更必须通过 APPLY。

### entry_triggers

- 处理新材料 / process material / intake / intake material / 登记材料 / 材料登记 / 文件录入

### required_reads

1. `PM_INPUT_LOG.md`（追加前读取）
2. `PM_ACTIVE_CONTEXT.md`（当前 Active Context）
3. `PM_RAID_LOG.md`（检查重复条目）
4. `PM_GAP_ANALYSIS.md`（检查已有 Gap）
5. `PM_PENDING_UPDATES.md`（检查是否有相关待处理 PU）

### preflight_gates

1. `PM_INPUT_LOG.md` 可写
2. `PM_ACTIVE_CONTEXT.md` 可读
3. 目标材料可读（文件存在或文本非空）

### allowed_outputs

- `PM_INPUT_LOG.md`（追加新条目，包含 source_fingerprint、时间戳、摘要）
- `PM_RAID_LOG.md`（追加 Action/Risk 条目，状态为 `Draft`）
- `PM_GAP_ANALYSIS.md`（追加 Gap 条目，状态为 `Open`）
- `PM_PENDING_UPDATES.md`（追加 PU 草案，状态为 `Proposed`）
- `PM_DOCUMENT_REGISTRY.md`（新增文档条目，状态为 `Draft`）
- `PM_MEETING_INDEX.md`（若材料为会议记录）

### forbidden_outputs

- **禁止**直接写入已批准的 Scope Baseline
- **禁止**跳过 PU 草案直接修改正式文件
- **禁止**对不可读材料生成虚构内容（必须标记为 `unreadable`）
- **禁止**INTAKE 阶段就做出"已批准"或"已完成"的结论

### state_transitions

- 输入材料状态：`received`（记录）
- 识别结果状态：`Draft`（写入 RAID/Gap 条目）
- PU 草案状态：`Proposed`（供 APPLY 使用）

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| 材料完全不可读 | L1：记录 `source_fingerprint: unreadable`，完成 Input Log 条目 |
| 材料含命名冲突 | L2：输出 Conflict，停止 INTAKE |
| 已有相同 source_fingerprint 的 PU | L1：复用既有 PU 引用，不生成新 PU |
| 检测到 Scope 相关内容但无审批授权 | L2：生成 Gap：Scope 变更需审批 |

---

## WF-P0-03: APPLY — Pending Update 应用

### 工作流概述

APPLY 是唯一允许将 `Proposed` PU 转化为 `Approved`/`Applied` 状态的工作流。APPLY 必须执行 preflight 检查、Git checkpoint、原子应用和状态追踪。Proposed/Rejected PU 禁止进入 Applied 状态。

### entry_triggers

- 应用 PU / apply pending update / 批准 / approve / 执行变更 / apply change / 批准变更

### required_reads

1. `PM_PENDING_UPDATES.md`（待应用的 PU）
2. `PM_APPROVAL_STATUS.md`（当前审批状态）
3. 目标文件（PU 中指定的文件路径）
4. `PM_ROLE_CONFIG.md`（确认审批权限）
5. Git 工作树状态（dirty/clean/clean-with-untracked）

### preflight_gates

1. `PM_PENDING_UPDATES.md` 至少存在 1 条 `Proposed` 状态的 PU
2. 该 PU 关联的目标文件存在且可写
3. Git 工作树允许创建 checkpoint（无冲突文件 C-01~C-04）
4. 工作树为 dirty 或 clean（若 dirty，checkpoint 后继续）
5. `PM_APPROVAL_STATUS.md` 中该 PU 对应条目状态为 `Approved`

### allowed_outputs

- `PM_PENDING_UPDATES.md`（PU 状态变更为 `Applied`）
- 目标文件（PU 指定路径，按 PU 内容写入）
- Git checkpoint（自动创建，带 PU ID 标签）
- `PM_DOCUMENT_REGISTRY.md`（状态变更为 `Approved`）
- `07_DATA/*.json`（若 PU 涉及 JSON 数据变更）

### forbidden_outputs

- **禁止**应用状态为 `Proposed` 但未获 `Approved` 的 PU
- **禁止**应用状态为 `Rejected` 的 PU
- **禁止**跳过 preflight 直接写入
- **禁止**跳过 Git checkpoint（dirty 工作树时）
- **禁止**部分应用（同一 PU 的文件必须全部应用或不应用）
- **禁止**在 APPLY 后不更新 `PM_PENDING_UPDATES.md` 状态

### state_transitions

- PU 初始状态：`Proposed`（INTAKE 产出）
- PU 审批后状态：`Approved`（Project Owner/Sponsor Approver 产出）
- APPLY 后状态：`Applied`
- 不得：`Draft → Applied`、`Proposed → Applied`（跳过审批）、`Rejected → Applied`

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| PU 状态为 `Proposed`（未批准） | L3：请求 Project Owner 审批，禁止应用 |
| PU 状态为 `Rejected` | L1：拒绝应用，报告 PU 已拒绝 |
| Git 冲突存在 | L2：输出 Conflict，停止 APPLY |
| 工作树 dirty 且无法创建 checkpoint | L2：输出 Gap，提示用户清理或 checkpoint |
| 部分文件写入失败 | L2：回滚已写文件，进入 `recovery_required` |

---

## WF-P0-04: TAKEOVER — P0 基础项目接管

### 工作流概述

TAKEOVER 是 P0 基础接管入口，用于在半路接手已有项目时快速评估现状。TAKEOVER P0 仅输出结构化接管评估草案（PM_TAKEOVER_ASSESSMENT.md），不实现完整深度接管（P1）。必须明确识别：已有文件、缺失文件、明显风险、未确认范围、待补信息。

> **P0 vs P1 边界**：完整项目接管分析（REQ-031）属于 P1，不在 TAKEOVER P0 范围内。TAKEOVER P0 只做入口识别，不做跨文件全量一致性分析。

### entry_triggers

- 接管 / takeover / 接手 / 接手这个项目 / 继续项目 / resume project / 项目状态评估

### required_reads

1. `PM_MEMORY_INDEX.md`（文件清单）
2. `00_PM_MEMORY/PM_RAID_LOG.md`（已有 RAID 条目）
3. `01_PM_DOCUMENTS/PM_DECISION_LOG.md`（已做决策）
4. `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md`（若存在）
5. `04_TODO/`（当前 To-do）
6. `00_PM_MEMORY/PM_PENDING_UPDATES.md`（待处理变更）
7. `PM_APPROVAL_STATUS.md`（审批状态）
8. 外层目录文件列表（判断项目结构）

### preflight_gates

1. 目标项目目录可读
2. 存在至少 1 个 PM 文件（判断为有效 PM 项目）
3. 无未提交的冲突文件

### allowed_outputs

- `PM_TAKEOVER_ASSESSMENT.md`（Draft，结构化评估报告）
- `PM_GAP_ANALYSIS.md`（缺失文件/待补信息的 Gap 条目）
- `PM_RAID_LOG.md`（识别到的 Risk/Issue 条目，状态为 `Draft`）
- `PM_DOCUMENT_REGISTRY.md`（新增文件条目）
- `PM_CURRENT_STATUS.md`（更新当前状态快照）

### forbidden_outputs

- **禁止**在 P0 接管评估阶段写入已批准 Baseline
- **禁止**做出 Scope 变更决策（P0 接管只识别和报告）
- **禁止**跳过 INIT 直接生成完整正式文件结构（无 Draft 阶段）
- **禁止**深度 PM Audit（属于 AUDIT 工作流）

### P0 五项最低验收标准

TAKEOVER P0 必须完整覆盖以下五项，不得缺失任一项：

| # | 验收项 | 说明 |
|---|---|---|
| P0-TK-01 | 已有文件识别 | 读取 PM_MEMORY_INDEX.md 或目录扫描，列出已有文件及其状态 |
| P0-TK-02 | 缺失文件识别 | 对比 `PM_MEMORY_INDEX.md` 或目录扫描，识别明显缺失的 PM 文件 |
| P0-TK-03 | 明显风险识别 | 从 RAID Log 和 Pending Updates 识别状态为 `Open` 或 `Overdue` 的风险 |
| P0-TK-04 | 未确认范围识别 | 识别 Scope 边界模糊或无 Owner 的变更需求 |
| P0-TK-05 | 待补信息识别 | 识别缺少 owner/due_date/next_step 的 Action/Risk 条目 |

### state_transitions

- 接管前：未知或 `Parked`（原项目状态）
- 接管评估：`Draft`（TAKEOVER_ASSESSMENT 输出）
- 接管后状态：取决于 Project Owner 决策

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| 项目目录不存在 | L4：Issue，目录不可访问，停止 |
| 存在 Approved Baseline 且无接管授权 | L3：请求 Project Owner 确认接管 |
| 目录完全为空（无 PM 文件） | L2：Gap，目录为空，请先 INIT |

---

## WF-P0-05: AUDIT — P0 基础 PM Audit

### 工作流概述

AUDIT 是 P0 基础 PM Audit 入口，用于对现有项目进行结构化审查，识别治理缺口。P0 审计仅检查显式异常，不做跨文件全量一致性分析（深度 Audit 属于 P1）。必须输出基础审计清单（PM_AUDIT_REPORT.md）。

> **P0 vs P1 边界**：深度 PM Audit（REQ-032）属于 P1，不在 AUDIT P0 范围内。AUDIT P0 只做显式检查，不做整改建议闭环。

### entry_triggers

- 审计 / audit / 审计项目 / 项目审查 / project audit / pm audit / governance review

### required_reads

1. `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md`
2. `00_PM_MEMORY/PM_PENDING_UPDATES.md`
3. `00_PM_MEMORY/PM_RAID_LOG.md`
4. `00_PM_MEMORY/PM_APPROVAL_STATUS.md`
5. `04_TODO/`
6. `00_PM_MEMORY/PM_GAP_ANALYSIS.md`
7. `07_DATA/documents.json`（若存在）

### preflight_gates

1. 项目目录可读
2. 存在至少 1 个 PM 文件

### allowed_outputs

- `PM_AUDIT_REPORT.md`（Draft，结构化审计报告）
- `PM_GAP_ANALYSIS.md`（新增 Gap 条目，状态为 `Open`）
- `PM_RAID_LOG.md`（新增 Risk 条目，状态为 `Open`）
- `PM_DOCUMENT_REGISTRY.md`（新增条目）

### forbidden_outputs

- **禁止**在 P0 审计阶段直接修复发现的缺口（只报告）
- **禁止**生成整改建议（属于 P1 深度 Audit）
- **禁止**跳过 P0 审计清单直接进入跨文件一致性分析
- **禁止**修改已批准 Baseline

### P0 六项检查标准

AUDIT P0 必须完整覆盖以下六项，不得缺失任一项：

| # | 检查项 | 说明 |
|---|---|---|
| P0-AD-01 | Scope 批准状态检查 | 检查 Scope Baseline 是否存在且状态为 Approved/Draft |
| P0-AD-02 | 未审批变更检查 | 检查 PM_PENDING_UPDATES.md 中是否存在 `Proposed` 超过 7 天未审批 |
| P0-AD-03 | 逾期 Action 检查 | 检查 PM_RAID_LOG.md 中是否存在状态为 `Open` 且 due_date 早于当前日期的 Action |
| P0-AD-04 | 缺失 owner/due/next_step 检查 | 检查 Action/Risk 条目是否缺少这三个必填字段 |
| P0-AD-05 | Markdown/JSON 明显不同步检查 | 检查 document_registry 中状态为 `Approved` 的文件，其 JSON 对应条目是否存在且状态一致 |
| P0-AD-06 | P0-TODO-06: 命名规范检查 | 检查文件 ID 格式是否符合 `N-##` / `C-##` / `GAP-##` / `PU-##` 规范 |

### state_transitions

- 审计前：项目当前状态（由 Active Context 提供）
- 审计中：不变更任何文件状态
- 审计后：输出 `Draft` 审计报告

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| 关键 PM 文件完全不存在 | L2：Gap：审计无法进行，缺少关键文件 |
| 存在未解决的冲突文件 | L2：Conflict，停止 Audit |
| Markdown/JSON 严重不同步 | L2：Gap，标记为 High，提示修复 |

---

## 附录：模板契约定义

以下模板契约定义存在于本文件中（`project-workflow-rules.md`），不新增实际模板文件：

| 模板 | 用途 | 工作流 | 状态字段 |
|---|---|---|---|
| `PM_TAKEOVER_ASSESSMENT.md` | 接管评估报告模板（契约定义） | TAKEOVER | Draft / Approved / Parked |
| `PM_AUDIT_REPORT.md` | PM 审计报告模板（契约定义） | AUDIT | Draft / Approved / Parked |
| `00_PM_MEMORY/PM_PENDING_UPDATES.md` | Pending Update 条目模板 | INTAKE、APPLY | Draft / Proposed / Approved / Rejected / Applied / Parked |
| `00_PM_MEMORY/PM_INPUT_LOG.md` | 输入材料登记模板 | INTAKE | Draft / Approved / Parked |
| `00_PM_MEMORY/PM_GAP_ANALYSIS.md` | Gap 分析条目模板 | 所有工作流 | Draft / Open / Proposed / Approved / Rejected / Parked |

> 注：以上模板为契约定义，状态字段声明如第四列所示；实际文件由对应工作流的 `allowed_outputs` 字段控制。
