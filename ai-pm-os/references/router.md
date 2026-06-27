# Intent Router — 统一请求路由

`ai-pm-os` 在识别用户意图时，必须按本表选择工作流；不识别时进入
`Gap：unrouted intent` 而不自行猜测。

## 0. 路由架构概述

路由执行分三层（详见 `references/command-and-approval-rules.md` §1）：

| 层 | 名称 | 输入 | 输出 |
|---|---|---|---|
| Layer 1 | Intent Classification | 用户原始消息 | 候选工作流 ID 集合 |
| Layer 2 | Workflow Selection | Layer 1 候选 + Active Context | 精确 workflow_id + required_reads + preflight_gates |
| Layer 3 | Gate Evaluation | Layer 2 输出 + required_reads | Gate 结果状态（gate_passed / gate_failed / approval_required / blocked_by_conflict / blocked_by_dirty_worktree / unrouted_intent）|

Gate 结果状态定义见 `command-and-approval-rules.md` §2。
12 个 P0 工作流完整对象定义见 `command-and-approval-rules.md` §3。
审批状态机与角色矩阵见 `command-and-approval-rules.md` §4~§5。
INIT/INTAKE/APPLY/TAKEOVER/AUDIT 五个 P0 工作流的具体行为契约与 P0/P1 边界见 `references/project-workflow-rules.md`。
BRIEFING/MEETING/TODO/REPORT_DAILY/REPORT_PERIODIC/REPORT_STEERING 六个 P0 专业工作流的具体行为契约与质量检查见 `references/communication-and-reporting-rules.md`。

## 1. 路由表

| 意图关键词（中文 / 英文） | 工作流 | 主框架 | 必读 |
|---|---|---|---|
| 初始化 / initialize / 启动项目 | INIT | Hybrid + PMO | Memory Boot + memory-and-recovery.md + Scope Baseline + Project Brief |
| 处理新材料 / process material / intake | INTAKE | PMP/PMBOK | Input Log + Active Context + RAID |
| 处理 transcript / meeting transcript / 会议纪要 | MEETING | PMP/PMBOK + PMO | Meeting Index + RAID + Decisions + Pending Updates |
| 今日 briefing / what should I do | BRIEFING | PMO + PMP/PMBOK | Current Status + To-do + RAID + Approvals |
| 生成 To-do / todo / 今日 To-do | TODO | PMP/PMBOK | Yesterday TODO + RAID + Actions + Approvals |
| 应用 PU / apply pending update / 批准 | APPLY | PMO + PMP/PMBOK | Pending Updates + Approved Baseline + Git checkpoint |
| 日报 / daily report | REPORT_DAILY | PMO + PMP/PMBOK | To-do + Actions + Meeting Minutes + RAID |
| 周报 / weekly report | REPORT_WEEKLY | PMO + PMP/PMBOK + APM | Dailies + Actions + RAID Trends + Sprint |
| 月报 / monthly report | REPORT_MONTHLY | PMO + PMP/PMBOK + APM | Weeklies + Milestones + Estimation Variance |
| 刷新 dashboard / refresh dashboard | DASHBOARD_SYNC | Hybrid | JSON Schemas + Markdown/JSON Diff |
| 接管 / takeover / 接手 | TAKEOVER | PMO + APM | Memory Index + RAID + Decisions + Backlog |
| 审计 / audit | AUDIT | PMO + APM | Scope + Change + RAID + Sprint/Scope Conflict |
| 估算 / estimation / 工期 | ESTIMATION | PMP/PMBOK + APM | Estimation Log + Schedule Baseline + Backlog |
| 缺口 / gap / 缺什么 | GAP | PMO + APM | Gap Analysis + Document Registry + Backlog |
| 会议建议 / meeting advisory / 建议开会 | MEETING_ADVISORY | PMO + PRINCE2 | Current Status + RAID + Decisions + Pending Approvals |
| 敏捷治理 / agile / scrum / kanban / sprint / backlog / DoR / DoD / WIP | AGILE | Scrum / Kanban / Hybrid（自动选择）| Backlog + Sprint + agile-delivery-rules.md |

## 2. 前置门（pre-flight gates）

| 工作流 | 强制前置 |
|---|---|
| REPORT_DAILY / REPORT_WEEKLY | 期间内有已批准 Action / Decision / Meeting Minutes |
| INIT | Scope Baseline 不存在或为 Draft；Active WBS 标记"无工作包" |
| INTAKE / MEETING | Input Log / Meeting Index 文件存在且可写 |
| APPLY | 至少 1 条 Proposed PU；Git 工作树允许创建 checkpoint（dirty 但非冲突） |
| TODO | 当前日期 / 昨日 To-do 可定位 |
| BRIEFING | Current Status 存在 |
| REPORT_* | 期间内有已批准 Action / Decision / Meeting Minutes |
| DASHBOARD_SYNC | JSON Schema 完整 |
| TAKEOVER / AUDIT | Memory Index + Document Registry 可读 |
| ESTIMATION | 至少 1 条已批准 Requirement / Story / Work Item |
| GAP | Memory Boot 已完成 |
| MEETING_ADVISORY | Current Status + RAID + Approvals 可读 |
| AGILE | 有活跃项目上下文；Backlog / Sprint 文件或敏捷治理请求 |

任一前置未通过，路由必须返回 `Escalation: gate-failed` 并列出缺失项。

## 3. 多意图拆分

当一条消息包含多个意图时（如"先 briefing，再生成今日 To-do"），按以下
规则处理：

1. 按 §1 路由表识别全部意图。
2. 按"读取-写、只读、跨基线"分组并排序。
3. 每个子意图独立执行独立验证；前一个子意图失败时停止后续。
4. 输出汇总：列出每个子意图的状态、所选框架组合与落盘文件。

## 4. 框架自动选择规则（Skill 责任）

框架选择是 Skill 的职责，不是用户的职责。Skill 根据以下四维自动选择主/辅框架：

- **意图维度**：从用户意图推断主框架（见 §4.1 决策表）。
- **项目模式维度**：预测型 / 敏捷 / Kanban / Hybrid 决定框架叠加方式。
- **治理层级维度**：Stage Gate / Exception / Board → PRINCE2；Daily → PMP；Sprint → Scrum/Kanban；治理聚合 → PMO。
- **输出目标维度**：产出正式文件 → PMBOK/PRINCE2；产出 Backlog/Sprint → Scrum/Kanban；产出治理报告 → PMO；混合 → Hybrid。

### §4.1 框架决策表

| 意图 | 默认主框架 | 附加辅助框架条件 | 输出目标 |
|---|---|---|---|
| 初始化 | Hybrid（PMO 外壳） | 有 Stage → +PRINCE2；有 Sprint → +Scrum | Project Brief、Scope Baseline |
| 处理材料（无指定框架） | **自动选择 PMP/PMBOK** | 感知到敏捷环境 → +Scrum；感知到多阶段 → +PRINCE2 | Pending Update、Gap |
| 处理 transcript（无指定框架） | **自动选择 PMP/PMBOK + PMO** | Sprint 在跑 → +Scrum；多阶段 → +PRINCE2 | 会议纪要、Action、Decision、PU |
| Briefing | PMO + PMP/PMBOK | Sprint 在跑 → +Scrum | Briefing 文件 |
| 生成 To-do | PMP/PMBOK | Sprint 在跑 → +Scrum | To-do 文件 |
| 应用 PU | PMO + PMP/PMBOK | — | 正式文件 + JSON |
| 日/周/月报 | PMO + PMP/PMBOK + APM | Sprint 在跑 → +Scrum | 报告文件 |
| 接管评估 | PMO + APM | — | Takeover Assessment |
| PM Audit | PMO + APM | — | Audit Report |
| 估算建议 | PMP/PMBOK + APM | Sprint 在跑 → +Scrum | Estimation Log |
| 缺口识别 | PMO + APM | — | Gap Analysis |
| 刷新 Dashboard | DASHBOARD_SYNC | Hybrid | — | JSON sync |
| 估算 / 工期（无指定框架） | **自动选择 PMP/PMBOK** | Sprint 在跑 → +Scrum；多阶段 → +PRINCE2 | Estimation Log |
| 缺口 / 缺什么（无指定框架） | **自动选择 PMO + APM** | — | Gap Analysis |

### §4.2 何时才请求用户澄清（实质歧义而非方法论选择）

Skill **不得**因为用户没说"用 PMBOK 还是 PRINCE2"而停下来让用户选方法论。
Skill **只有**在以下实质歧义时才请求业务澄清：

1. **意图冲突**：同一消息表达了矛盾需求（例如"既要把这个放 Sprint 又要放 Stage Gate Review"），Skill 无法从上下文中判断优先级。
2. **业务关键上下文缺失**：缺少 owner、due_date、scope impact 等会直接影响正式制品准确性的字段，且无法从现有项目文件中推断。
3. **变更影响范围不明**：同一材料同时涉及 Scope Baseline + Sprint Backlog，Skill 无法判断用户意图优先更新哪个。
4. **角色权限不明**：建议的更新涉及超出 Skill 当前授权的审批层级，但无法从上下文中判断升到哪级。

以下情况**不是**实质歧义，Skill 必须自行判断并继续：

- 用户没说用哪个框架（Skill 按 §4.1 自动选）。
- 用户说"按最佳实践"（Skill 选最合适框架并在输出中说明理由）。
- 用户只说了意图没说要哪个输出格式（Skill 按项目模式和治理层级选）。

### §4.3 框架选择的输出要求

每次执行在输出开头必须显式声明：

```
[Framework] 主框架: <框架名> | 辅助框架: <框架列表>
[Reasoning] 选择依据: <意图>+<项目模式>+<治理层级>+<输出目标>
```

## 5. 不识别行为

- 关键字不在 §1：进入 `Gap：unrouted intent`，输出三选项：
  1. 由用户重新表述；
  2. 由用户从 §1 列表中指定；
  3. 由 PM AI 在新工作包中评估是否纳入。
- 关键字部分匹配（>= 2 个候选）：按依赖最深的优先，并显式列出被排除
  的候选。
- **§4 不适用**：`SC-EDGE-01` 必须修正为此处定义的行为。

## 6. 跨 Agent 一致性

- Cursor 与 Codex 必须在相同关键字 / 上下文下选择相同工作流。
- §1 / §2 / §3 / §4 是权威路由；任何 Agent 私有覆盖必须在变更日志中
  显式声明，且不得影响 `scripts/validate-skill.js` 的语义校验。

## 7. 与场景的对应

`scenarios/scenarios.md` 中所有"输入意图"必须能匹配本表第 1 列。

## 8. Critical Output Contract 路由（REQ-035 / WP-017）

当意图属于"关键输出"（即签发 Coder WP / Rework Package / PM-QC Report / Change-Approval / Pending Update 批准 / Human Acceptance）时，路由除匹配本表 §1 工作流外，还必须命中 `references/runtime-compliance-contracts.md` 中的对应契约。

### §8.1 关键输出意图 → 契约映射

| 意图关键词 | 工作流 | 契约 ID |
|---|---|---|
| 签发 / 下发 / 派发 工作包 | INIT / APPLY | COC-CWP-001 |
| 返工 / reissue / rework / R1 | APPLY | COC-RWP-002 |
| QC / 验收 / 评审 / 抽检 | AUDIT | COC-PQR-003 |
| 变更 / 改 Scope / 改 Baseline | APPLY | COC-CAR-004 |
| 批准 / apply PU | APPLY | COC-PUA-005 |
| Human 验收 / Human 签收 | AUDIT | COC-HAR-006 |

### §8.2 强制 Pre-send Compliance Gate

命中上述任一契约时，必须在发送前完成 8 步门禁（见 `runtime-compliance-contracts.md` §4）。门禁结果必须以 `[Delivery Gate] PASS` 或 `[Delivery Gate] FAIL: <reason>` 出现在制品证据区。

### §8.3 双输出失败关闭

文件落盘 + 聊天全文任一失败即视为交付失败；不得在缺字段 / 缺渠道 / 授权不明时输出 `issued` / `accepted` / `complete` / `done` / `finished` 等成功状态。

### §8.4 短指针授权边界

`one-click-copy` = `完整正文单代码块`；`path-only` 仅在 Human Owner 当前消息显式要求短指针时允许。`简洁` / `赶快` / `一键复制` 均不构成 path-only 授权。

### §8.5 双字段返回约束（COC 集成，WP-007 / REQ-035）

命中 COC 时，Layer 2 必须同时返回：
- `workflow_id`（工作流标识符）
- `contract_id`（契约标识符，如 `COC-CWP-001`、`COC-PUA-005`）

缺少任一字段时，Layer 3 必须在 Pre-send Compliance Gate 返回 `Escalation: coc-missing-workflow-or-contract`。
此约束由 `command-and-approval-rules.md` §7 强制定义。
