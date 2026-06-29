# 命令路由、前置门禁、审批状态机与权限边界

本文档定义 Skill 的三层路由机制、Gate 结果状态、审批状态机与角色权限矩阵。
本文档是 Skill 运行时的权威规则；删除或弱化任一字段视为破坏内核。
所有状态标识符（`gate_passed` 等）均为机器可校验的精确字符串，不得用自然语言替代。

---

## 1. 三层路由架构

```
Layer 1: Intent Classification
  输入：用户原始消息（中文 / 英文）
  输出：一组候选工作流 ID（无歧义时 1 个，有歧义时多个）
  失败输出：unrouted_intent
  禁止行为：不得将歧义解释为授权；不得跳过本层直接进入 Layer 2

Layer 2: Workflow Selection
  输入：Layer 1 候选工作流 ID + 当前 Active Context
  输出：精确工作流 ID + 运行时参数（workflow_id、required_reads、preflight_gates）
  失败输出：unrouted_intent / ambiguous_intent
  禁止行为：不得在未确认工作流时开始读取文件

Layer 3: Gate Evaluation
  输入：Layer 2 选定工作流 + required_reads
  输出：Gate 结果状态（gate_passed / gate_failed / approval_required / blocked_by_conflict / blocked_by_dirty_worktree / unrouted_intent）
  失败输出：不得将 gate_failed 映射为 gate_passed 或 reported
  禁止行为：不得跳过 Gate Evaluation 直接进入 writes_started

三层的每一步必须记录到执行上下文（Active Context 或等效日志），包含：
  - 层名称（Layer 1 / Layer 2 / Layer 3）
  - 输入概要
  - 输出结果
  - 时间戳
```

---

## 2. Gate 结果状态

所有 Gate 结果状态均为互斥枚举；任一时刻只处于一种状态。

| 状态标识符 | 定义 | 必须进入的下一状态 |
|---|---|---|
| `gate_passed` | 所有前置门均通过；允许进入 Layer 3 后的写入阶段 | writes_started |
| `gate_failed` | 至少一个强制前置门未通过 | 不得进入 writes_started；不得进入 reported；必须输出 Escalation |
| `approval_required` | 前置门通过但请求的操作需要 Project Owner 或 Sponsor Approver 审批 | 不得写入正式文件；必须进入 PM_PENDING_UPDATES.md 或等效审批队列 |
| `blocked_by_conflict` | 目标对象存在状态冲突（C-01~C-04）或命名冲突（N-01~N-05） | 不得覆盖任一冲突方；必须进入 PM_GAP_ANALYSIS.md → GAP-CFL-### |
| `blocked_by_dirty_worktree` | Git 工作树脏（存在未提交变更）且操作涉及跨基线写入 | 不得写入正式文件；必须进入 preflight_blocked；提示用户清理或 checkpoint |
| `unrouted_intent` | Layer 1 无法将用户意图映射到已知工作流 | 不得自行猜测；必须输出 Gap：unrouted intent 并提供三选项 |

**禁止映射规则**：
- `gate_failed` 不得映射为 `gate_passed`、`reported`、`approved`
- `blocked_by_conflict` 不得映射为 `gate_passed` 或 `reported`
- `blocked_by_dirty_worktree` 不得映射为 `reported`
- `approval_required` 在审批完成前不得进入 `writes_started`

---

## 3. P0 工作流标准路由对象

每个工作流对象必须包含以下字段：

> **具体实现**：INIT、INTAKE、APPLY、TAKEOVER、AUDIT 五个 P0 工作流的完整行为契约（包括 8 字段详细定义、P0/P1 边界、failure_escalation 规则）见 `references/project-workflow-rules.md`。
> **专业工作流补充**：BRIEFING、MEETING、TODO、REPORT_DAILY、REPORT_PERIODIC、REPORT_STEERING 六个 P0 专业工作流的完整行为契约（包括 9 字段详细定义、quality_checks、禁止编造规则）见 `references/communication-and-reporting-rules.md`。

| 字段 | 说明 | 约束 |
|---|---|---|
| `workflow_id` | 唯一标识符，全部大写 | 不得重复 |
| `trigger` | 触发关键词（中文/英文） | 必须可正则匹配 |
| `required_reads` | Gate Evaluation 前必须读取的文件列表 | 不得为空（P0 工作流至少 1 项） |
| `preflight_gates` | 前置门条件数组 | 必须至少 1 项 |
| `allowed_outputs` | 允许输出的文件/制品类型 | 不得含跨基线写入（无审批时）|
| `forbidden_outputs` | 禁止输出的文件/制品 | 必须含每工作流至少 1 项 |
| `failure_state` | Gate 失败时对应的状态 | 必须为 §2 中的有效状态 |

### WF-01: INIT

| 字段 | 值 |
|---|---|
| `workflow_id` | INIT |
| `trigger` | 初始化 / initialize / 启动项目 / init / initialize project |
| `required_reads` | Memory Index；Scope Baseline（若存在）；PM_ROLE_CONFIG.md |
| `preflight_gates` | Scope Baseline 不存在或状态为 Draft；PM_ROLE_CONFIG.md 可读 |
| `allowed_outputs` | Project Brief（Draft）；PM_ROLE_CONFIG.md（若不存在）；00_PM_MEMORY/PM_MEMORY_INDEX.md |
| `forbidden_outputs` | Scope Baseline（Approved 状态）；正式 WBS；已批准的 Project Brief |
| `failure_state` | gate_failed |

### WF-02: INTAKE

| 字段 | 值 |
|---|---|
| `workflow_id` | INTAKE |
| `trigger` | 处理新材料 / process material / intake / intake material |
| `required_reads` | PM_INPUT_LOG.md；PM_ACTIVE_CONTEXT.md；PM_RAID_LOG.md |
| `preflight_gates` | PM_INPUT_LOG.md 可写；PM_ACTIVE_CONTEXT.md 可读 |
| `allowed_outputs` | PM_INPUT_LOG.md（追加条目）；PM_RAID_LOG.md（追加 Action/Risk）；PM_GAP_ANALYSIS.md（Gap 条目） |
| `forbidden_outputs` | 正式 Scope Baseline；PM_PENDING_UPDATES.md（INTAKE 本身不产生 PU，需 APPLY）|
| `failure_state` | gate_failed |

### WF-03: MEETING

| 字段 | 值 |
|---|---|
| `workflow_id` | MEETING |
| `trigger` | 处理 transcript / meeting transcript / 会议纪要 / meeting notes |
| `required_reads` | PM_MEETING_INDEX.md；PM_RAID_LOG.md；PM_DECISIONS_LOG.md；PM_PENDING_UPDATES.md |
| `preflight_gates` | PM_MEETING_INDEX.md 可写；PM_RAID_LOG.md 可读 |
| `allowed_outputs` | PM_MEETING_INDEX.md（追加条目）；PM_RAID_LOG.md（追加 Action/Risk）；PM_DECISIONS_LOG.md（追加 Decision）；PM_PENDING_UPDATES.md（新增 PU） |
| `forbidden_outputs` | 直接修改已批准的 Scope Baseline；跳过 PU 直接写入正式文件 |
| `failure_state` | gate_failed |

### WF-04: BRIEFING

| 字段 | 值 |
|---|---|
| `workflow_id` | BRIEFING |
| `trigger` | 今日 briefing / what should I do / 今日工作 / daily briefing |
| `required_reads` | PM_CURRENT_STATUS.md；PM_TODO.md；PM_RAID_LOG.md；PM_APPROVAL_STATUS.md |
| `preflight_gates` | PM_CURRENT_STATUS.md 可读 |
| `allowed_outputs` | Briefing 文件（Draft）；PM_TODO.md（更新）；PM_GAP_ANALYSIS.md |
| `forbidden_outputs` | Scope Baseline 修改；正式审批文件；直接写入 Approved 状态 |
| `failure_state` | gate_failed |

### WF-05: TODO

| 字段 | 值 |
|---|---|
| `workflow_id` | TODO |
| `trigger` | 生成 To-do / todo / 今日 To-do / update todo |
| `required_reads` | PM_TODO.md（昨日/今日）；PM_RAID_LOG.md；PM_ACTIONS_LOG.md；PM_APPROVAL_STATUS.md |
| `preflight_gates` | PM_TODO.md 可写；当前日期可定位 |
| `allowed_outputs` | PM_TODO.md（更新）；PM_RAID_LOG.md（新增 Action） |
| `forbidden_outputs` | 跨日 TODO 自动归档（必须保留来源）；跳过 Active Context 直接写 Approved |
| `failure_state` | gate_failed |

### WF-06: APPLY

| 字段 | 值 |
|---|---|
| `workflow_id` | APPLY |
| `trigger` | 应用 PU / apply pending update / 批准 / approve |
| `required_reads` | PM_PENDING_UPDATES.md；Approved Baseline（相关文件）；Git 工作树状态 |
| `preflight_gates` | PM_PENDING_UPDATES.md 至少 1 条 Proposed PU；Git 工作树允许创建 checkpoint（dirty 但无冲突）|
| `allowed_outputs` | PM_PENDING_UPDATES.md（状态变更为 Approved/Applied）；正式文件（按 PU 内容）；Git checkpoint |
| `forbidden_outputs` | 未批准 PU 的任何正式文件写入；跳过 preflight 直接写入 Approved Baseline；跳过 checkpoint |
| `failure_state` | gate_failed 或 blocked_by_dirty_worktree |

### WF-07: REPORT_DAILY

| 字段 | 值 |
|---|---|
| `workflow_id` | REPORT_DAILY |
| `trigger` | 日报 / daily report / 今日报告 |
| `required_reads` | PM_TODO.md；PM_ACTIONS_LOG.md；PM_MEETING_MINUTES.md；PM_RAID_LOG.md |
| `preflight_gates` | 当日有已批准 Action 或 Decision 或 Meeting Minutes |
| `allowed_outputs` | PM_DAILY_REPORT_YYYYMMDD.md（Draft）；PM_GAP_ANALYSIS.md |
| `forbidden_outputs` | 历史日报覆盖修改；编造不存在的 Action；直接写入 Approved Baseline |
| `failure_state` | gate_failed |

### WF-08: REPORT_WEEKLY

| 字段 | 值 |
|---|---|
| `workflow_id` | REPORT_WEEKLY |
| `trigger` | 周报 / weekly report / 本周报告 |
| `required_reads` | PM_DAILY_REPORTS/（周内日报）；PM_ACTIONS_LOG.md；PM_RAID_LOG.md；PM_SPRINT_STATUS.md（若存在）|
| `preflight_gates` | 周内有至少 1 份日报或 3 个 Action |
| `allowed_outputs` | PM_WEEKLY_REPORT_YYYY-WNN.md（Draft）；PM_GAP_ANALYSIS.md |
| `forbidden_outputs` | 跨周修改日报内容；编造 Velocity 数据；直接写入 Scope Baseline |
| `failure_state` | gate_failed |

### WF-09: DASHBOARD_SYNC

| 字段 | 值 |
|---|---|
| `workflow_id` | DASHBOARD_SYNC |
| `trigger` | 刷新 dashboard / refresh dashboard / sync dashboard |
| `required_reads` | 07_DATA/（JSON schema 文件）；Markdown 权威源文件 |
| `preflight_gates` | 07_DATA/*.json 所有规定文件存在且 JSON 有效 |
| `allowed_outputs` | 07_DATA/*.json（同步写入）；PM_GAP_ANALYSIS.md |
| `forbidden_outputs` | 删除 JSON 数据字段；覆盖未批准 JSON；覆盖 Markdown 权威源 |
| `failure_state` | gate_failed |

### WF-10: TAKEOVER

| 字段 | 值 |
|---|---|
| `workflow_id` | TAKEOVER |
| `trigger` | 接管 / takeover / 接手 / 接手这个项目 |
| `required_reads` | PM_MEMORY_INDEX.md；PM_RAID_LOG.md；PM_DECISIONS_LOG.md；PM_BACKLOG.md |
| `preflight_gates` | PM_MEMORY_INDEX.md 可读 |
| `allowed_outputs` | PM_TAKEOVER_ASSESSMENT.md（Draft）；PM_GAP_ANALYSIS.md；PM_DOCUMENT_REGISTRY.md |
| `forbidden_outputs` | 接管评估期间修改已批准 Baseline；直接进入 Sprint；直接生成 Approved Scope |
| `failure_state` | gate_failed |

### WF-11: AUDIT

| 字段 | 值 |
|---|---|
| `workflow_id` | AUDIT |
| `trigger` | 审计 / audit / 检查项目状态 |
| `required_reads` | PM_SCOPE.md；PM_PENDING_UPDATES.md；PM_RAID_LOG.md；PM_SPRINT_STATUS.md |
| `preflight_gates` | PM_MEMORY_INDEX.md 可读 |
| `allowed_outputs` | PM_AUDIT_REPORT.md（Draft）；PM_GAP_ANALYSIS.md；PM_PENDING_UPDATES.md（新增 Issue） |
| `forbidden_outputs` | 审计报告本身写入 Approved Baseline；跳过 Gap 直接修改 Scope；自动批准 PU |
| `failure_state` | gate_failed |

### WF-12: AGILE

| 字段 | 值 |
|---|---|
| `workflow_id` | AGILE |
| `trigger` | 敏捷 / agile / scrum / kanban / sprint / backlog / DoR / DoD / WIP |
| `required_reads` | PM_BACKLOG.md；PM_SPRINT_BACKLOG.md；agile-delivery-rules.md |
| `preflight_gates` | 有活跃项目上下文（Backlog 或 Sprint 文件存在）；Backlog 可写 |
| `allowed_outputs` | PM_BACKLOG.md；PM_SPRINT_BACKLOG.md；PM_GAP_ANALYSIS.md |
| `forbidden_outputs` | 未批准 Story 进入 Sprint Backlog（committed）；跳过 DoR 直接 committed；跳过 DoD 直接 done |
| `failure_state` | gate_failed |

---

## 4. 审批状态机

### 4.1 状态定义

| 状态标识符 | 定义 | 典型文件 |
|---|---|---|
| `Draft` | 初始起草；可自由修改 | 所有 *_TEMPLATE.md、Draft 报告 |
| `Proposed` | 已提交待审批 | PM_PENDING_UPDATES.md 条目 |
| `Pending Review` | 正在审查（可选中间状态）| 审查流程专用 |
| `Approved` | 已批准；可用于正式文件写入 | Approved Baseline 相关文件 |
| `Rejected` | 已拒绝；不得执行对应变更 | PM_PENDING_UPDATES.md 条目 |
| `Superseded` | 被更新的 PU/Decision 取代 | 历史记录 |
| `Applied` | 对应变更已写入正式文件并同步 | PM_PENDING_UPDATES.md 条目 |
| `Parked` | 暂停执行（待澄清或条件满足）| PM_PENDING_UPDATES.md 条目 |

### 4.2 允许的转换

```
Draft          → Proposed / Parked / Rejected
Proposed       → Pending Review / Approved / Rejected / Parked
Pending Review → Approved / Rejected / Parked
Approved       → Superseded / Applied / Parked
Rejected       → Draft / Proposed（重新起草） / Superseded
Superseded    → （终态，不允许再转换）
Applied       → Parked（若发现质量问题）
Parked         → Draft / Proposed / Approved（解除暂停）
```

### 4.3 禁止的转换

以下转换被严格禁止（违者 fail-closed）：

| 源状态 | 目标状态 | 禁止原因 |
|---|---|---|
| `Draft` | `Applied` | 未经过审批流程 |
| `Draft` | `Approved` | 未经过审批流程 |
| `Rejected` | `Applied` | 已拒绝的 PU 不得执行 |
| `Rejected` | `Approved` | 已拒绝的 PU 不得批准 |
| `Superseded` | `Approved` | 已被取代的状态不得复活 |
| `Proposed` | `Applied` | 必须经过审批（不得跳过审批）|
| `Pending Review` | `Applied` | 审查中不得直接应用 |
| `Parked` | `Applied` | 必须先解除暂停并审批 |

---

## 5. 角色与权限矩阵

### 5.1 角色定义

| 角色 ID | 名称 | 典型 Owner 字段 |
|---|---|---|
| `ROLE-PM-OWNER` | PM Owner — 项目管理负责人 | PM Owner |
| `ROLE-HUMAN-OWNER` | Project Owner — 人类最终决策者 | Project Owner |
| `ROLE-PM-REVIEWER` | PM Reviewer — PM 质量审查者 | PM Reviewer |
| `ROLE-SPONSOR-APPROVER` | Sponsor Approver — 发起人/出资人审批者 | Sponsor Approver |
| `ROLE-PRODUCT-OWNER` | Product Owner — 产品负责人 | Product Owner |
| `ROLE-TECH-OWNER` | Tech Owner — 技术负责人 | Tech Owner |
| `ROLE-BUSINESS-OWNER` | Business Owner — 业务负责人 | Business Owner |
| `ROLE-AGILE-OWNER` | Agile Owner / Scrum Master — 敏捷治理负责人 | Agile Owner / Scrum Master |
| `ROLE-UAT-OWNER` | UAT Owner — 用户验收测试负责人 | UAT Owner |

### 5.2 权限矩阵

| 操作 | PM Owner | Project Owner | PM Reviewer | Sponsor Approver | Product Owner | Tech Owner | Business Owner | Agile Owner | UAT Owner |
|---|---|---|---|---|---|---|---|---|---|
| 批准 Scope Baseline | — | Y | — | Y | — | — | — | — | — |
| 批准 PU（常规）| — | Y | — | — | — | — | — | — | — |
| 批准 PU（重大：跨基线、角色拆分）| — | Y | Y | Y | — | — | — | — | — |
| 批准 Sprint Commit | — | — | — | — | Y | — | — | Y | — |
| 批准 Story DoD | — | — | — | — | Y | Y | — | Y | — |
| 签署 DoR | — | — | — | — | Y | — | — | — | — |
| UAT Acceptance | — | — | — | — | — | — | — | — | Y |
| 批准变更（Scope/基线）| — | Y | — | Y | — | — | — | — | — |
| 批准 Audit Report | — | Y | — | — | — | — | — | — | — |
| 接收 Takeover Assessment | — | Y | — | — | — | — | — | — | — |

> Y = 有权限；— = 无权限（不得越权操作）
> 常规 PU = 不涉及跨基线、角色拆分或 Scope 变更
> 重大 PU = 涉及 Approved Baseline、跨基线写入、新角色或 Scope 变更

### 5.3 个人默认角色配置

默认情况下，单人用户同时承担以下角色：

| 默认承担角色 | 原因 |
|---|---|
| PM Owner | 发起并管理项目 |
| Project Owner | 最终人类决策权 |
| PM Reviewer | PM 质量自我审查 |
| Sponsor Approver | 无人更高层级时自批准 |

**规则要求**：
- 角色配置必须存储在 `PM_ROLE_CONFIG.md` 和 `07_DATA/project_roles.json` 中
- `PM_ROLE_CONFIG.md` 必须包含 `future_split_supported: true` 字段，表明规则支持未来拆分
- 规则文件不得写死"单人永久承担"——必须有字段声明可拆分
- 未来引入多人时，只需修改 `PM_ROLE_CONFIG.md` 而无需修改规则文件逻辑
- 拆分时，原来由单人承担的角色由多个真实人员分别承担

---

## 6. 未授权请求的失败关闭（Fail-Closed）

以下请求类别必须被 Skill 明确拒绝（fail-closed），不得进入成功状态：

### 6.1 跳过审批

| 请求 | 正确行为 |
|---|---|
| 用户要求"直接写入 Approved Baseline" | 输出 `Escalation: approval-required`；进入 PU 流程；不得写入 |
| 用户要求"跳过 PU 直接批准" | 输出 `Escalation: approval-required`；列出所需审批路径 |
| 用户要求"帮我把这份材料直接落地"（含跨基线内容）| 进入 INTAKE；输出 Gap：`missing-approval-path` |

### 6.2 跳过前置门

| 请求 | 正确行为 |
|---|---|
| 用户要求"直接生成正式 Scope Baseline"（无 Scope Baseline 文件）| 输出 `Escalation: gate-failed`；列出缺失前置 |
| 用户要求"直接写报告"（无 Active Context）| 进入 BRIEFING；输出 Gap：`missing-context-for-report` |

### 6.3 直接进入 Sprint

| 请求 | 正确行为 |
|---|---|
| 用户要求"把这个 Story 直接加入 Sprint"（无 DoR 确认）| 输出 `Escalation: gate-failed`；列出 DoR 未满足项 |
| 用户要求"直接标记 done"（无 DoD）| 输出 `Escalation: gate-failed`；列出 DoD 未满足项 |

### 6.4 错误地报告成功状态

| 请求 | 正确行为 |
|---|---|
| 任意请求后报告 `accepted` / `complete` / `done` / `finished` | 验证门必须全部通过；未经 Project Owner 明确审批不得使用这些词 |
| 用户说"简洁"/"赶快"/"一键复制" | 仅当文件已存在且授权明确时允许 path-only；否则拒绝 |

---

## 7. COC 路由集成（已废弃）

> **COC 路由表已废弃。** 原工作包契约（COB-CWP）、返工契约（COB-RWP）、质量问题契约（COB-PQR）、人工验收契约（COB-HAR）已从 `runtime-compliance-contracts.md` 中删除。

关键输出契约仅剩：
- `COC-CAR-004`（变更审批请求）
- `COC-PUA-005`（Pending Update 批准请求）

---

## 8. 与状态机集成

Gate 结果状态与执行状态机（`execution-integrity.md`）的映射说明：

- `gate_passed`：允许进入执行状态机的 `preflight_passed` 状态。
- `gate_failed`：不得进入执行状态机的 `reported` 终态；必须进入 `recovery_required`。
- `approval_required`：Gate sub-state，等待 Project Owner 审批；不直接映射到执行状态机状态。审批通过后以 `gate_passed` 继续。
- `blocked_by_conflict`：Gate sub-state，冲突未解决前不得进入执行状态机写入阶段；进入 `recovery_required`。
- `blocked_by_dirty_worktree`：Gate sub-state，Git 工作树未清理前不得进入 `writes_started`；必须输出 Gap。
- `unrouted_intent`：Gate sub-state，意图无法路由；必须输出 Gap 后以 `recovery_required` 等待用户重新表述。

**强制约束**：任何 Gate 失败状态均不得进入执行状态机的 `reported` 终态。
