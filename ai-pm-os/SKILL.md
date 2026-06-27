---
name: ai-pm-os
version: 0.1.0
status: Active
language: zh-CN (default)
description: |
  ai-pm-os 是 AI PM OS Local Shell 的统一核心执行引擎。它以资深项目经理
  （精通 PMP/PMBOK、PRINCE2、APM、PMO、Scrum、Kanban、Hybrid）的判断力
  编排本地 Markdown 权威项目文件、JSON 可视化同步层与 React/Vite Dashboard
  的持续治理。它不是普通 prompt、写作助手或命令集合；它是可重复执行、
  可中断恢复、跨 Agent 一致的项目管理操作内核。
owner: PM AI
target_agents: [Cursor, Codex]
---

# ai-pm-os Skill

## 1. 适用边界

### 1.1 触发条件

当且仅当以下条件全部满足时，Skill 进入执行态：

- 工作目录存在本项目壳的 `_AI_GLOBAL_MEMORY/` 与 `00_PM_MEMORY/`。
- 用户消息以 `/ai-pm-os` 前缀或与之等价的自然语言意图出现。
- 任何一次执行前已读取 `_AI_GLOBAL_MEMORY/AI_SKILL_OPERATING_RULES.md`。

### 1.2 适用场景

- 项目初始化、半路接管、PM Audit。
- 新材料处理、会议 transcript 处理、Pending Updates 生成。
- 每日 Briefing、To-do 生成与滚动、日报 / 周报 / 月报生成。
- 缺口识别、估算建议、Sprint 治理、Change 评估。

### 1.3 不适用场景（明确拒绝）

- 多人实时协作、权限系统、在线数据库、SaaS 部署。
- 自研 OCR / parser / Watchdog / 后台监听 / 主动推送。
- 跨项目组合管理、第三方 PM 工具集成。
- 任何"覆盖 Approved Baseline"或"绕过 Pending Updates 直接改正式文件"的要求。
- 任何"忽略 Memory Boot 直接执行"的要求。

## 2. 能力标签（必需）

`scripts/validate-skill.js` 校验本节；删除或改名以下任一标签即视为破坏内核：

- `governance:judgment`
- `framework:pmp_pmbok`
- `framework:prince2`
- `framework:apm`
- `framework:pmo`
- `framework:scrum`
- `framework:kanban`
- `framework:hybrid`
- `fact:layered`
- `stability:idempotent`
- `stability:recoverable`
- `stability:traced`
- `stability:deterministic`
- `consistency:cross_agent`

## 3. 执行循环（强制）

每次执行必须严格按以下六步推进，不得跳步：

1. **Memory Boot**：读取 `ai-pm-os/references/memory-and-recovery.md` 定义的六层信息源与
   严格读取顺序；`REQUIRED_MEMORY_BOOT_FILES` 定义 Global Rules 层（3 文件）+
   PM Memory 层（6 文件），详见 memory-and-recovery.md §2。
2. **Intent Routing**：识别用户意图，对照 `references/router.md` 选择工作流。
   若无法路由，输出 `Gap：unrouted intent` 并停止，不得自行猜测。
3. **Pre-flight Check**：依据所选工作流读取对应权威文件、检查前置门
   （例如 Scope Baseline 是否批准、Active WBS 是否锁定、当前 Sprint 是否存在）。
4. **Execution & Write**：按选定框架（见 `references/framework-matrix.md`）
   生成制品。对关键正式文件必须走 `PM_PENDING_UPDATES.md`，不得直接覆盖。
   对每个事实必须标注其层级（见 `references/fact-layers.md`）。
5. **Sync & Verify**：同步 JSON 数据副本，校验 Markdown 与 JSON 一致性，
   更新 `PM_INPUT_LOG.md`、`PM_CURRENT_STATUS.md`、`PM_DOCUMENT_REGISTRY.md`。
6. **Report & Escalate**：在对话中向用户输出：
   - 识别到的事实层级数量；
   - 生成的 Pending Updates 编号与建议应用方式；
   - 触发的 Gap / Risk / Issue / Decision 候选项；
   - 下一工作流建议与触发条件；
   - 任何失败或中断时的升级路径（见 §5）。

## 4. 路由与框架

### 4.1 路由

完整意图→工作流映射见 `references/router.md`。本节仅给出主干：

| 意图 | 主工作流 | 主框架 |
|---|---|---|
| 初始化项目 | INIT | Hybrid + PMO |
| 处理新材料 | INTAKE | PMP/PMBOK |
| 处理会议 transcript | MEETING | PMP/PMBOK + PMO |
| 今日 Briefing | BRIEFING | PMO + PMP/PMBOK |
| 生成 To-do | TODO | PMP/PMBOK |
| 应用 Pending Updates | APPLY | PMO + PMP/PMBOK |
| 日报 | REPORT_DAILY | PMO + PMP/PMBOK |
| 周报 | REPORT_WEEKLY | PMO + PMP/PMBOK + APM |
| 接管已有项目 | TAKEOVER | PMO + APM |
| 审计项目 | AUDIT | PMO + APM |
| 估算建议 | ESTIMATION | PMP/PMBOK + APM |
| 缺口识别 | GAP | PMO + APM |
| 会议建议 | MEETING_ADVISORY | PMO + PRINCE2 |
| 敏捷治理 | AGILE | Scrum / Kanban / Hybrid（自动选择）|
| 刷新 Dashboard | DASHBOARD_SYNC | Hybrid |

### 4.2 框架适用边界

八类框架（PMBOK、PRINCE2、APM、PMO、Scrum、Kanban、Hybrid、Agile Delivery）的
适用 / 不适用 / 组合 / 输出规则见 `references/framework-matrix.md`。
敏捷专业行为规则见 `references/agile-delivery-rules.md`。敏捷报告与指标规则见 `references/agile-reporting-rules.md`。
任何输出必须显式声明所用的框架组合；不得用"按最佳实践"代替。

## 5. 失败与升级

### 5.1 失败判定

- **读失败**：必读文件不存在或不可读 → 停止，输出 `Issue: read-failure`
  并请求用户提供材料；不得自动 fallback 到无源推断。
- **冲突**：Markdown ↔ JSON、PU ↔ Approved Baseline、Scope ↔ Sprint、
  Material A ↔ Material B 四类冲突 → 停止，输出 `Conflict: <type>`，
  转入 Gap 而非自动覆盖。
- **越权**：用户要求覆盖 Approved Baseline、跳过 Pending Updates、
  删除 Scope 之外未结清的 Change → 拒绝，输出 `Escalation: <rule>`。
- **未批变更**：发现任何绕过审批的尝试 → 记录为 `Risk: scope-creep-firewall-breach`。
- **不可信证据**：输入材料可读但内容缺失关键字段（owner / due_date /
  scope impact / acceptance criteria）→ 标记为 `Gap: incomplete-evidence`，
  不生成 Decision。

### 5.2 升级路径

- **L1 / 对话澄清**：仅缺信息，缺字段，可继续。
- **L2 / Pending Update**：可能影响 Scope / Decision / RAID / Change / Sprint，
  必须进入 `PM_PENDING_UPDATES.md` 并立即对话确认。
- **L3 / Human Owner**：触及 Approved Baseline、跨基线变更、跨 Role 责任。
- **L4 / 停止执行**：不可恢复（重复初始化损坏、无法读取材料、Scope 与
  已批准 WBS 强冲突等）→ 写入 `PM_GAP_ANALYSIS.md` 并停下，等待 PM AI 决定。

### 5.3 中断恢复

任何中断点恢复必须输出至少 5 个项目状态字段：

- 当前阶段（from `PM_CURRENT_STATUS.md`）
- Scope Baseline 状态与版本
- 活跃 WBS / 活动 WP 编号
- 待审批 Pending Updates 数量
- 当前 Sprint 编号与剩余 Point

依据这 5 字段选择 §4.1 中的正确下一工作流。

## 6. 稳定性规则摘要

完整规则见 `references/stability-rules.md` 和 `references/execution-integrity.md`，本节仅列骨架：

- **幂等性**：同输入同状态下重复执行不创建重复 ID、Action、Decision。
  详见 `references/execution-integrity.md` §0（执行身份模型）和 §2（四类重入判定）。
- **可恢复性**：中断后能从项目文件恢复阶段、基线、活动项、阻塞和下一步。
  详见 `references/memory-and-recovery.md` §5 和 `references/execution-integrity.md` §4（部分失败恢复）。
- **可追溯性**：每项正式更新可追溯到输入、PU、批准人和 Git 证据。
- **确定性边界**：无法读取 / 无法确认 / 信息冲突时停止升级事实，
  转为 Gap / Pending / Issue。
- **跨 Agent 一致性**：Cursor 与 Codex 在相同壳和输入下遵守同一状态机、
  同一目录和同一审批规则。
- **幂等 PU 应用**：批准 PU 采用 at-most-once 语义；禁止静默部分应用。
  详见 `references/execution-integrity.md` §3。
- **执行状态机**：七状态（received → preflight_passed → writes_started → writes_completed → sync_completed → reported）。
  详见 `references/execution-integrity.md` §1。
- **Markdown 权威恢复方向**：Markdown 成功而 JSON 失败时只能 Markdown → JSON。
  详见 `references/execution-integrity.md` §5。
- **冲突 / 缺失 / 命名 / 脏工作树**：输入矛盾、信息缺失、ID 混乱或 Git 工作树脏时，
  Skill 必须识别、记录 Gap/Issue/Conflict 并阻断写入，不得自动合并或编造。
  详见 `references/conflict-and-chaos-rules.md`（C-01~C-04、M-01~M-06、N-01~N-05、D-01~D-05）。

## 6b. Critical Output Contract（REQ-035 / WP-017）

关键输出在发送前必须命中 `references/runtime-compliance-contracts.md` 中的契约，并完成 Pre-send Compliance Gate；删除或弱化任一字段视为破坏内核。

### 6b.1 6 类关键输出契约

| 编号 | 契约 | 触发 |
|---|---|---|
| COC-CWP-001 | Coder Work Package | PM AI 签发工作包给 Coder |
| COC-RWP-002 | Rework Package | QC 报告 L3 rework required |
| COC-PQR-003 | PM/QC Report | PM/QC 完成对一个 WP 的独立验收 |
| COC-CAR-004 | Change / Approval Request | 用户提出 Scope / Baseline 变更请求 |
| COC-PUA-005 | Pending Updates Approval Request | Skill 生成 Pending Update 后请求批准 |
| COC-HAR-006 | Human Acceptance Request | Coder + PM/QC 均通过后请求 Human 验收 |

每个契约具备 10 个字段：`contract_id` / `trigger` / `required_reads` / `required_sections` / `required_file_write` / `required_chat_delivery` / `abbreviation_exception` / `forbidden_shortcuts` / `evidence` / `fail_closed_behavior`。

### 6b.2 Pre-send Compliance Gate（8 步）

发送前必须按 8 步顺序检查，任一失败 → 停止发送制品 → 记录 Escalation + Gap：

1. 意图与契约匹配
2. Required Project Files 读取证据
3. 必需章节完整
4. 权威文件落盘
5. 聊天交付模式
6. 规范化一致性
7. 禁止项未触发
8. PASS/FAIL 证据

### 6b.3 关键语义

- `one-click-copy` = `完整正文单代码块`；不等于 path-only。
- `path-only` 仅在 Human Owner 当前消息**显式**要求短指针时允许。
- 三种非授权表达：`简洁` / `赶快` / `一键复制` 均不构成 path-only 授权。
- 双输出事务：文件落盘 + 聊天全文必须同时成功；任一失败即交付失败。
- 错误成功状态：不得在缺字段、缺渠道或授权不明时输出 `issued` / `accepted` / `complete` / `done` / `finished`。
- 上下文压缩后必须重新读取契约来源；不得依赖聊天记忆替代正式规则。
- 验证器 `SI-14` 机器检查契约和门禁；任一不通过即退出非 0。

### 6c. 前置门禁与审批状态机（WP-007 / REQ-005、REQ-006、REQ-009）

完整定义见 `references/command-and-approval-rules.md`：

- **三层路由**：Intent Classification → Workflow Selection → Gate Evaluation。
- **6 个 Gate 结果状态**：gate_passed、gate_failed、approval_required、blocked_by_conflict、blocked_by_dirty_worktree、unrouted_intent。
- **9 个审批状态**：Draft、Proposed、Pending Review、Approved、Rejected、Superseded、Applied、Human Accepted、Parked。
- **9 类角色**：PM Owner、Human Owner、PM Reviewer、Sponsor Approver、Product Owner、Tech Owner、Business Owner、Agile Owner、UAT Owner。
- **12 个 P0 工作流**：INIT、INTAKE、MEETING、BRIEFING、TODO、APPLY、REPORT_DAILY、REPORT_WEEKLY、REPORT_STEERING、TAKEOVER、AUDIT、AGILE。
- **INIT/INTAKE/APPLY/TAKEOVER/AUDIT 详细行为规则**：含 P0/P1 边界、失败升级、禁止动作，见 `references/project-workflow-rules.md`。
- **BRIEFING/MEETING/TODO/REPORT_DAILY/REPORT_PERIODIC/REPORT_STEERING 详细行为规则**：含 9 字段定义、质量检查、事实来源禁止编造规则，见 `references/communication-and-reporting-rules.md`。
- **个人默认角色**：单人用户默认承担 PM Owner、Human Owner、PM Reviewer、Sponsor Approver；规则支持未来拆分。
- **Fail-Closed**：跳过审批/前置门/直接写 Approved Baseline/直接进入 Sprint 均阻断。

## 7. 行为场景

≥146 个 Given / When / Then 行为场景见 `scenarios/scenarios.md`，覆盖：

- 4 个专业框架组合（PMBOK / PRINCE2 / APM / PMO / Scrum / Kanban / Hybrid）
- 4 个审批与权限（PU 绕过、Approved Baseline 覆盖、Sprint / Scope 冲突、Owner 缺失）
- 4 个冲突与混乱（Markdown / JSON 冲突、重复材料、过期 Action、脏工作树）
- 4 个重复与恢复（同一初始化 3 次、重复 transcript、Missing 材料、中断恢复）
- 4 个跨 Agent 与输出一致性
- 4 个 Memory / Recovery 场景
- 8 个 Critical Output Contract 场景（SC-COC-01~08）
- 10 个执行完整性场景（SC-EI-01~10，幂等、重放、检查点、部分失败恢复）
- 10 个冲突治理场景（SC-CHX-01~10）
- 10 个命令路由场景（SC-CMD-01~10）
- 12 个沟通报告场景（SC-RP-01~12，BRIEFING/MEETING/TODO/报告）
- 10 个敏捷数据模型场景（SC-AGDM-01~10）
- 12 个 JSON/Schema 数据契约场景（SC-DATA-01~12）
- 12 个 JSON 同步与审计场景（SC-SYNC-01~12，Markdown→JSON 同步、幂等性、审计、禁止 watcher）

合计 146 个场景。

敏捷数据模型契约（DoR/DoD/Story Point/Backlog/Sprint 等）详见 `references/agile-data-model-rules.md`。JSON 数据契约与 schema 规则详见 `references/json-data-contract-rules.md`。JSON 同步与审计规则详见 `references/json-sync-and-audit-rules.md`。

## 8. 安装与调用

详见 `references/install-and-invoke.md`。最低限度要求：

- Skill 源码以 `ai-pm-os/SKILL.md` 为入口。
- Cursor / Codex 用户需手动将 `ai-pm-os/` 路径纳入 Agent 可读范围。
- 调用方式：`/ai-pm-os <意图>` 或与之等价的自然语言。

## 9. 跨平台与隐私

- 脚本与模板一律使用相对路径与 `path.join` / `path.resolve`。
- 禁止写死 Windows / macOS 绝对路径。
- 项目文件默认保存在本地，Skill 不上传任何材料到外部服务。

## 10. 与项目壳的关系

- Markdown（`00_PM_MEMORY/`、`01_PM_DOCUMENTS/`、`02_AGILE/`、`03_MEETINGS/`
  等）是权威源。
- JSON（`07_DATA/`）是可视化同步层，Dashboard 只读 JSON。
- `PRODUCT_SHELL_MANIFEST.md` 定义壳结构与禁止污染类型。
- 控制空间 `_DEV_PROJECT_CONTROL/` 由外层 Git 忽略，独立维护 PM baseline。

## 11. 版本与变更

| 版本 | 日期 | 变更 |
|---|---|---|
| v0.1.0 | YYYY-MM-DD | 初版：执行循环、能力标签、失败升级、路由与框架适用边界 |
