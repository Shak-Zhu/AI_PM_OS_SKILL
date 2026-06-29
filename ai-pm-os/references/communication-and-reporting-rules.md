# 沟通与报告工作流规则（Communication and Reporting Rules）

本文档定义 BRIEFING、MEETING、TODO、REPORT_DAILY、REPORT_PERIODIC、REPORT_STEERING 六个 P0 专业工作流的完整行为契约。
本文档是 `command-and-approval-rules.md` §3 中 P0 工作流标准路由对象的补充实现。
每个工作流对象必须包含以下 9 个字段：

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
| `quality_checks` | 质量检查项 | 必须至少 1 项 |

---

## WF-P0-01: BRIEFING — Daily Briefing 与会议建议

### 工作流概述

BRIEFING 在每个工作日开始时提供每日简报，包含 3~5 个建议动作、待催办/审批/风险提醒，以及可选的结构化会议建议。BRIEFING 本身不写任何正式文件，输出仅为建议性内容。

### entry_triggers

- 今日 briefing / what should I do / 今日工作 / daily briefing / 今日工作建议 / 今天做什么 / morning briefing

### required_reads

1. `00_PM_MEMORY/PM_CURRENT_STATUS.md`（当前阶段、活跃工作包、RAG）
2. `04_TODO/`（当前 To-do 列表）
3. `00_PM_MEMORY/PM_RAID_LOG.md`（逾期 Action/风险）
4. `00_PM_MEMORY/PM_APPROVAL_STATUS.md`（待审批 PU）
5. `03_MEETINGS/meeting_index/PM_MEETING_INDEX.md`（近期会议计划）
6. `00_PM_MEMORY/PM_PENDING_UPDATES.md`（Proposed PU）

### preflight_gates

1. `00_PM_MEMORY/PM_CURRENT_STATUS.md` 可读
2. 当前日期可定位

### allowed_outputs

- **每日建议动作**：3~5 个优先级排序的动作建议（含背景、owner 建议、due_date）
- **待催办列表**：已批准但逾期未完成的 Action
- **待审批提醒**：Proposed PU 列表（超过 7 天未审批）
- **风险/问题提醒**：状态为 `Open` 且 severity 为 `High` 的 Risk/Issue
- **会议建议（可选）**：若识别到需要同步讨论的议题，输出结构化会议建议

### forbidden_outputs

- **禁止**修改任何正式文件（Scope Baseline、Approval Status、Decision Log 等）
- **禁止**将建议动作直接写入 `04_TODO/daily/YYYY-MM-DD_TODO.md`（须经用户确认）
- **禁止**编造不存在的 Action、Risk 或 Decision
- **禁止**生成正式审批文件

### state_transitions

- Briefing 输出状态：`advisory`（建议性，非正式文件）
- 建议动作在用户确认前不得进入 `04_TODO/` 或 `PM_RAID_LOG.md`

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| `PM_CURRENT_STATUS.md` 不存在 | L2：Gap：无法获取项目状态，建议用户先执行 INIT 或 TAKEOVER |
| 当前日期无法定位 | L1：Error：日期识别失败，请重试 |
| To-do 和 RAID 均无可用数据 | L2：Gap：无足够数据生成有效建议，输出空白 Briefing 并提示 |

### quality_checks

1. 建议动作数必须为 3~5 个（不超过 5 个）
2. 建议动作必须包含：`action_title`、`owner`（建议）、`due_date`（建议）、`priority`
3. 会议建议必须包含 7 个字段：背景（background）、人员（participants）、目标（objective）、议程（agenda）、材料（materials）、输出（outputs）、完成标准（done_criteria）

---

## WF-P0-02: MEETING — Transcript 处理与会议纪要

### 工作流概述

MEETING 处理会议 transcript，输出专业会议纪要、Action 摘要、Decision 摘要，并更新 Meeting Index。未确认内容不得直接写入 Approved Decision，必须通过 Pending Updates 流程。

### entry_triggers

- 处理 transcript / meeting transcript / 会议纪要 / meeting notes / 会议记录 / 会议摘要 / meeting summary / 整理会议 / parse meeting

### required_reads

1. `03_MEETINGS/meeting_index/PM_MEETING_INDEX.md`（会议索引）
2. `00_PM_MEMORY/PM_RAID_LOG.md`（已有 Action/Risk 条目）
3. `00_PM_MEMORY/PM_DOCUMENT_REGISTRY.md`（文档注册表）
4. `00_PM_MEMORY/PM_PENDING_UPDATES.md`（待处理变更）

### preflight_gates

1. Transcript 文件存在且可读（非空、非乱码）
2. `03_MEETINGS/meeting_index/PM_MEETING_INDEX.md` 可写

### allowed_outputs

- `03_MEETINGS/transcripts/` 目录下原始 transcript 归档
- `03_MEETINGS/meeting_index/PM_MEETING_INDEX.md`（追加新会议条目）
- `03_MEETINGS/meeting_minutes/PM_MEETING_MINUTES_YYYYMMDD.md`（Draft 会议纪要）
- `00_PM_MEMORY/PM_RAID_LOG.md`（追加 Action/Risk 条目，Draft 状态）
- `00_PM_MEMORY/PM_DOCUMENT_REGISTRY.md`（追加文档注册条目）
- `00_PM_MEMORY/PM_PENDING_UPDATES.md`（如识别到变更请求，追加 PU 草案）

### forbidden_outputs

- **禁止**将未确认 Decision 直接写入 `PM_DECISION_LOG.md` 或任何 Approved 文件
- **禁止**跳过 Pending Updates 流程直接修改已批准 Scope Baseline
- **禁止**为不可读/乱码 transcript 生成虚构会议纪要
- **禁止**将 transcript 中模糊/争议内容定性为正式 Decision

### state_transitions

- Transcript 归档状态：`archived`
- 会议纪要状态：`Draft`
- Action 条目状态：`Draft`
- Decision（未确认）：进入 `PM_PENDING_UPDATES.md`（Proposed）
- Decision（已确认且有审批）：进入 `PM_DECISION_LOG.md`（Approved）

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| Transcript 为空或不可读 | L1：Error：transcript 不可读，记录 `source_fingerprint: unreadable` 并退出 |
| 无法识别任何 Action/Decision | L2：Gap：会议内容未提取到 Action 或 Decision，记录为空白会议纪要 |
| 会议纪要写入失败 | L2：Gap：无法写入会议纪要，检查目录权限 |

### quality_checks

1. 会议纪要必须包含：会议标题、时间、地点、与会人员、议程、讨论要点、Action 列表、Decision 列表
2. Action 条目必须包含：`action_id`、`title`、`owner`、`due_date`、`status`、`next_step`、`related_meeting`
3. Decision 条目必须包含：`decision_id`、`title`、`context`、`outcome`、`owner`、`status`、`related_meeting`
4. 未确认 Decision 不得出现在 `approved_outputs` 中；必须以 `Proposed` 状态进入 `PM_PENDING_UPDATES.md`
5. Meeting Index 条目必须包含：`meeting_id`、`date`、`title`、`participants`、`file_path`

---

## WF-P0-03: TODO — 每日 To-do 生成与滚动

### 工作流概述

TODO 生成今日 To-do 并执行跨日滚动规则。To-do 条目必须有完整字段，跨日滚动时必须保留来源、状态和 carry-over 关系。

### entry_triggers

- 生成 To-do / todo / 今日 To-do / update todo / To-do 更新 / 日程 / daily task / 今天要做什么

### required_reads

1. `04_TODO/` 目录（当前 To-do 文件）
2. `00_PM_MEMORY/PM_RAID_LOG.md`（Open Action 条目）
3. `00_PM_MEMORY/PM_APPROVAL_STATUS.md`（待审批 PU）
4. `00_PM_MEMORY/PM_CURRENT_STATUS.md`（当前阶段和活跃工作包）

### preflight_gates

1. `04_TODO/` 目录可写（若不存在则创建）
2. 当前日期可定位

### allowed_outputs

- `04_TODO/PM_TODO_YYYYMMDD.md`（今日 To-do 文档，Draft）
- `00_PM_MEMORY/PM_RAID_LOG.md`（新增 To-do 同步的 Action 条目）

### forbidden_outputs

- **禁止**跨日自动归档 To-do 而不保留来源（carry_over_from 必须存在）
- **禁止**跳过 Active Context 直接将 To-do 写入 Approved 状态
- **禁止**编造不存在的 Action 或 Risk 作为 To-do 来源
- **禁止**在 To-do 中写入未经审批的 Scope 变更

### state_transitions

- 今日 To-do 状态：`Draft`
- 滚动 To-do（未完成）：状态保持 `Open`，carry_over_from 指向原条目
- 已完成 To-do：状态变更为 `Done`，不保留 carry_over_from

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| `04_TODO/` 目录不可写 | L2：Error：无法写入 To-do，检查目录权限 |
| 昨日 To-do 不存在且无其他来源 | L1：Gap：无可用 To-do 数据，从 RAID 和 Active Context 生成 |
| To-do 字段缺失（无 next_step） | L1：Gap：To-do 条目缺少 next_step，提示用户补全 |

### quality_checks

1. To-do 条目必须包含全部 10 个字段：`todo_id`、`title`、`source`、`owner`、`due_date`、`status`、`next_step`、`carry_over_from`、`related_action`、`updated_at`
2. 跨日滚动时，`carry_over_from` 必须指向原 `todo_id` 或原 Action 条目
3. `status` 只能为：`Open` / `In Progress` / `Done` / `Parked`
4. 每个 To-do 必须有 `owner`（不得为空）
5. 来源必须可追踪：`source` 只能为 `01_PM_DOCUMENTS/PM_RAID_LOG.md`、`03_MEETINGS/meeting_minutes/*.md`、`00_PM_MEMORY/PM_APPROVAL_STATUS.md`、用户直接创建之一

---

## WF-P0-04: REPORT_DAILY — 日报

### 工作流概述

REPORT_DAILY 生成当日工作日报，默认 Markdown + HTML 格式。HTML PPT 仅在用户明确要求时生成，不作为 P0 强制项。

### entry_triggers

- 日报 / daily report / 今日报告 / 今天报告 / daily summary

### required_reads

1. `04_TODO/PM_TODO_YYYYMMDD.md`（今日 To-do）
2. `00_PM_MEMORY/PM_RAID_LOG.md`（当日 Action/Risk 状态）
3. `03_MEETINGS/meeting_minutes/`（今日会议纪要，若有）
4. `00_PM_MEMORY/PM_PENDING_UPDATES.md`（当日 PU 状态）
5. `00_PM_MEMORY/PM_CURRENT_STATUS.md`（当日项目状态）

### preflight_gates

1. 当日有至少 1 项正式记录（To-do / Action / Meeting Minutes / PU）
2. 来源窗口可定位（具体日期）

### allowed_outputs

- `05_REPORTS/daily/PM_DAILY_REPORT_YYYYMMDD.md`（Draft Markdown 日报）
- `05_REPORTS/daily/PM_DAILY_REPORT_YYYYMMDD.html`（Draft HTML 日报）
- `00_PM_MEMORY/PM_GAP_ANALYSIS.md`（如有识别到 Gap）

### forbidden_outputs

- **禁止**编造不存在的 Action、Risk、Decision 或会议
- **禁止**修改历史日报内容
- **禁止**将 Draft 日报状态写为 Approved
- **禁止**在日报中写入未经审批的变更
- **禁止**自动生成 HTML PPT（仅在用户明确要求时）

### state_transitions

- 日报输出状态：`Draft`
- 日报经 Project Owner 审批后状态变更为 `Approved`

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| 当日无任何来源数据 | L2：Gap：无可用数据生成日报，输出空白模板并标注来源窗口 |
| 来源数据过期（超过 7 天） | L2：Gap：数据超过 7 天，标注数据过期警告 |
| 日报写入失败 | L2：Error：无法写入日报，检查目录权限 |

### quality_checks

1. 日报必须标注来源窗口：具体日期（如 `2026-06-23`）
2. 日报必须包含：日期、已完成工作、进行中工作、遇到的问题、明日计划、Gap（如有）
3. 所有事实性陈述必须有对应文件来源（To-do / RAID / Meeting Minutes / PU）
4. 禁止编造状态、进度、风险或 Action

---

## WF-P0-05: REPORT_PERIODIC — 周报、月报

### 工作流概述

REPORT_PERIODIC 生成周报和月报，默认 Markdown + HTML + HTML PPT 格式。

### entry_triggers

- 周报 / weekly report / 本周报告 / 本周总结 / weekly summary
- 月报 / monthly report / 本月报告 / 本月总结 / monthly summary

### required_reads

1. `05_REPORTS/daily/`（期间内所有日报）
2. `00_PM_MEMORY/PM_RAID_LOG.md`（期间内 Action/Risk 趋势）
3. `02_AGILE/PM_SPRINT_BACKLOG.md`（若存在 Sprint 数据）
4. `00_PM_MEMORY/PM_PENDING_UPDATES.md`（期间内 PU 状态）
5. `00_PM_MEMORY/PM_MILESTONES.md`（里程碑状态，若存在）

### preflight_gates

1. 期间内有至少 1 份日报或 3 个 Action
2. 报告窗口可定位（起止日期）

### allowed_outputs

- `05_REPORTS/weekly/PM_WEEKLY_REPORT_YYYY-WNN.md`（Draft Markdown 周报）
- `05_REPORTS/weekly/PM_WEEKLY_REPORT_YYYY-WNN.html`（Draft HTML 周报）
- `05_REPORTS/weekly/PM_WEEKLY_REPORT_YYYY-WNN_PPT.html`（HTML PPT 版）
- `05_REPORTS/monthly/PM_MONTHLY_REPORT_YYYY-MM.md`（Draft Markdown 月报）
- `05_REPORTS/monthly/PM_MONTHLY_REPORT_YYYY-MM.html`（Draft HTML 月报）
- `05_REPORTS/monthly/PM_MONTHLY_REPORT_YYYY-MM_PPT.html`（HTML PPT 版）
- `00_PM_MEMORY/PM_GAP_ANALYSIS.md`（如有识别到 Gap）

### forbidden_outputs

- **禁止**编造 Sprint 数据、Velocity 或 Burndown 数字
- **禁止**修改期间内历史日报内容
- **禁止**跳过 HTML PPT 生成周报/月报（周报/月报默认必须支持 HTML PPT）
- **禁止**将未经审批的变更写入报告正文

### state_transitions

- 报告输出状态：`Draft`
- 经 Project Owner 审批后状态变更为 `Approved`

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| 期间内无任何来源数据 | L2：Gap：无可用数据生成周报，输出空白模板并标注来源窗口 |
| HTML PPT 生成失败 | L1：Warning：HTML PPT 生成失败，Markdown + HTML 仍可交付 |
| 里程碑数据缺失 | L2：Gap：里程碑状态缺失，报告标注数据不可用 |

### quality_checks

1. 报告必须标注来源窗口：
   - 周报：起止日期（如 `2026-06-16 ~ 2026-06-22`）
   - 月报：月份或起止日期（如 `2026-06` 或 `2026-06-01 ~ 2026-06-30`）
2. 所有数据必须有可追踪来源；无来源的内容必须标注为 `Gap` 或 `待确认`
3. 禁止编造状态、进度、风险、Sprint 或 Backlog 数据

---

## WF-P0-06: REPORT_STEERING — Steering Committee / 管理层汇报

### 工作流概述

REPORT_STEERING 生成 Steering Committee 或管理层汇报，默认 Markdown + HTML + HTML PPT 格式。报告窗口和受众必须标注。管理层汇报在 Sponsor Approver 审批前不得写成 Approved。

### entry_triggers

- 管理层汇报 / steering report / executive report / 管理委员会 / board report / 汇报 / steering
- 季度汇报 / 半年汇报 / 年度汇报 / quarterly report / biannual report

### required_reads

1. `05_REPORTS/weekly/`（期间内所有周报）
2. `05_REPORTS/monthly/`（期间内所有月报）
3. `00_PM_MEMORY/PM_RAID_LOG.md`（Action/Risk 趋势）
4. `00_PM_MEMORY/PM_PENDING_UPDATES.md`（期间内 PU 状态）
5. `00_PM_MEMORY/PM_MILESTONES.md`（里程碑状态，若存在）
6. `00_PM_MEMORY/PM_CURRENT_STATUS.md`（RAG 和当前阶段）

### preflight_gates

1. 报告窗口可定位（起止日期）
2. 受众定位（管理层 / Sponsor Approver）

### allowed_outputs

- `05_REPORTS/steering/PM_STEERING_REPORT_YYYYMMDD.md`（Draft Markdown 管理层汇报）
- `05_REPORTS/steering/PM_STEERING_REPORT_YYYYMMDD.html`（Draft HTML 管理层汇报）
- `05_REPORTS/steering/PM_STEERING_REPORT_YYYYMMDD_PPT.html`（HTML PPT 版）
- `00_PM_MEMORY/PM_GAP_ANALYSIS.md`（如有识别到 Gap）

### forbidden_outputs

- **禁止**将管理层汇报状态写为 Approved（须经 Sponsor Approver 审批）
- **禁止**编造 KPI、RAG、里程碑、风险、Action、Decision、Sprint 或 Backlog 数据
- **禁止**使用聊天记忆作为数据来源
- **禁止**修改历史周报/月报内容
- **禁止**跳过 HTML PPT 生成（管理层汇报默认必须支持 HTML PPT）

### state_transitions

- 报告输出状态：`Draft`
- 经 Sponsor Approver 审批后状态变更为 `Approved`

### failure_escalation

| 失败场景 | 升级路径 |
|---|---|
| 无周报/月报来源数据 | L2：Gap：无可用数据生成管理层汇报，输出空白模板并标注来源窗口 |
| 来源数据仅来自聊天记忆 | L2：Gap：来源为用户口述，必须标注 `Gap：来源为用户口述` |
| HTML PPT 生成失败 | L1：Warning：HTML PPT 生成失败，Markdown + HTML 仍可交付 |
| 无法定位受众 | L1：Error：受众定位失败，请指定汇报对象 |

### quality_checks

1. 报告必须标注来源窗口（报告周期）和受众（如 `Q2 2026 / 管理层`）
2. 所有数据必须有可追踪文件来源；无来源或仅聊天记忆的内容必须标注 `Gap：no-source` 或 `Gap：来源为用户口述`
3. 禁止编造 KPI、RAG、里程碑状态、风险、Action、Decision、Sprint 或 Backlog 数据
4. 无来源、来源冲突、仅聊天记忆时必须 fail-closed（Gap 标注），不得跳过


---

## 附录：报告事实来源与禁止编造规则

所有报告（日报、周报、月报、管理层汇报）必须遵守以下事实来源规则：

### 允许的事实来源

| 来源类型 | 状态要求 | 说明 |
|---|---|---|
| `PM_RAID_LOG.md` Action 条目 | `Open` / `Done` | 来源可追踪 |
| `03_MEETINGS/meeting_minutes/YYYY-MM-DD_HHMM_MEETING_MINUTES_<topic>.md` | `Draft` / `Approved` | 含会议纪要和 Decision |
| `PM_PENDING_UPDATES.md` | 任意状态 | 含 PU 条目 |
| `PM_SPRINT_BACKLOG.md` | `Draft` / `Approved` | 含 Sprint 数据 |
| `04_TODO/PM_TODO_*.md` | 任意状态 | To-do 条目 |
| `PM_APPROVAL_STATUS.md` | 任意状态 | 审批状态 |
| 用户直接提供的事实 | 明确标注 | 必须标注为「用户提供」 |

### 禁止编造的内容

以下内容在任何报告中**严格禁止编造**：

- 不存在的 Action 或已完成 Action 的虚假描述
- 不存在的 Decision 或未经审批的 Decision
- 不存在的会议或会议内容
- Sprint 名称、Velocity、Burndown 等敏捷数据（无 `PM_SPRINT_BACKLOG.md` 时）
- Scope Baseline 变更内容（无对应 Approved PU 时）
- 任何 `Draft` / `Open` / `In Progress` / `Parked` 状态（无对应文件时）
- Owner、due_date、next_step（无对应条目时）

### Fail-Closed 规则

当报告无法找到有效来源时：

1. 输出 `Gap: no-source-for-[具体内容]` 并标注内容
2. 不得用「暂无数据」或「未记录」代替实际数据
3. 不得用聊天记忆或推断作为来源
4. 用户明确要求时可跳过，但必须标注为 `Gap：来源为用户口述`

---

## 附录：会议治理与会议建议字段规范

结构化会议建议（BRIEFING 输出或 MEETING_ADVISORY 工作流）必须包含以下 7 个字段：

| 字段 | 说明 | 约束 |
|---|---|---|
| `background` | 会议背景与必要性 | 不得为空 |
| `participants` | 建议参会人员（含角色） | 不得为空 |
| `objective` | 会议目标（1~3 项） | 不得为空 |
| `agenda` | 议程（时间分配+讨论主题） | 不得为空 |
| `materials` | 会前准备材料 | 可为空 |
| `outputs` | 预期输出 | 不得为空 |
| `done_criteria` | 完成标准 | 不得为空 |

---

## 附录：To-do 字段规范

To-do 条目（TODO 工作流输出）必须包含以下 10 个字段：

| 字段 | 说明 | 类型 | 约束 |
|---|---|---|---|
| `todo_id` | 唯一标识符 | `TODO-YY-###` | 不得重复 |
| `title` | 任务标题 | 文本 | 不得为空 |
| `source` | 来源追踪 | 文本 | 只能为规定来源之一 |
| `owner` | 责任人 | 文本 | 不得为空 |
| `due_date` | 截止日期 | `YYYY-MM-DD` | 可为空（标注为 TBD） |
| `status` | 状态 | 枚举 | 只能为 `Open`/`In Progress`/`Done`/`Parked` |
| `next_step` | 下一步动作 | 文本 | 不得为空 |
| `carry_over_from` | 跨日来源 | `TODO-YY-###` | 跨日滚动时必填；当日新建可为空 |
| `related_action` | 关联 Action | `N-YY-###` | 可为空 |
| `updated_at` | 更新时间戳 | `YYYY-MM-DDTHH:MM:SS` | 自动填充 |
