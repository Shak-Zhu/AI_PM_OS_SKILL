# Framework Matrix — 7 类专业框架适用边界

本文件定义 PMP/PMBOK、PRINCE2、APM、PMO、Scrum、Kanban、Hybrid 七类专业
框架在 `ai-pm-os` 内的适用 / 不适用 / 组合 / 输出规则。任一输出必须显式
引用本表的框架组合；删除或弱化本节视为破坏内核（验证脚本
`scripts/validate-skill.js` 必查）。

## 1. PMP / PMBOK

| 字段 | 内容 |
|---|---|
| 适用 | 范围、进度、成本、质量、资源、沟通、风险、采购、干系人、整合管理；需求 / 估算 / 治理报告；RAID；变更控制；正式文档结构化 |
| 不适用 | 短周期迭代细节、燃尽图 Story Point、Daily Standup 节奏、Velocity |
| 组合 | 几乎所有工作流的基础层；与 PMO 组合提供治理外壳；与 Hybrid 组合提供 Scrum 层的 PMBOK 治理 |
| 输出 | 知识领域对应的正式 Markdown 文件（Scope Baseline、RAID、Change Log、Decision Log、Estimation Log、Communication Plan、Stakeholder Register、RACI、Schedule Baseline） |
| 必备引用 | 文件名、条目 ID、审批状态、Owner、Due Date |

## 2. PRINCE2

| 字段 | 内容 |
|---|---|
| 适用 | 七原则（持续业务验证、经验汲取、明确定义角色与责任、按阶段管理、例外管理、聚焦产品、匹配项目环境）；七主题（Business Case、Organization、Quality、Plans、Risk、Change、Progress）；七过程；阶段边界控制；例外管理（tolerance breach） |
| 不适用 | 个人 Productivity 类需求、纯敏捷每日仪式、市场研究型活动 |
| 组合 | 与 PMO 组合提供董事会级治理；与 PMP 组合提供知识领域细节；与 Scrum 组合提供 Scrum 项目的高层阶段治理 |
| 输出 | Business Case 章节、阶段 Gate、Exception Report、Stage Boundary Update、Highlight Report、Project Board 角色定义 |
| 必备引用 | 七原则标签、当前阶段、Next Stage Plan、Exception 类型 |

## 3. APM

| 字段 | 内容 |
|---|---|
| 适用 | 上下文治理、Stakeholder Engagement、Knowledge & Information Management、Strategy、Benefits Realisation、Scope Management、Schedule Management、Risk Management；持续 PM Audit；成熟度评估；专业判断 vs 程序合规的张力 |
| 不适用 | 实时仪表盘、燃尽图、Velocity 趋势、自动通知 |
| 组合 | 与 PMO 组合提供 PM Audit 与 Takeover 评估；与 PMP 组合提供"判断"层（不只是程序） |
| 输出 | PM Audit 报告、Takeover Assessment、Benefits Map、Stakeholder Engagement Plan 评估 |
| 必备引用 | 上下文类型、成熟度等级、Audit Finding ID、Action 建议 |

## 4. PMO

| 字段 | 内容 |
|---|---|
| 适用 | 治理门禁、审批流、Pending Updates 机制、Scope Creep Firewall、状态聚合、跨项目协调（与本表其他框架的正交层） |
| 不适用 | 任何绕过审批的临时修改、临时变更基线、删除 RAID 或 Decision 历史 |
| 组合 | 与所有其他框架组合（PMO 是治理外壳，框架是工作流内核）；与 PRINCE2 组合提供 Project Board；与 PMP 组合提供整合管理 |
| 输出 | 审批中心记录、Pending Updates、Change Log、Decision Log、Governance Summary、Project Health 评估 |
| 必备引用 | 审批编号、Pending Update 编号、Scope 状态、Change 编号、Decision 编号 |

## 5. Scrum

| 字段 | 内容 |
|---|---|
| 适用 | Product Backlog、Sprint Backlog、User Stories、Acceptance Criteria、DoR / DoD、Sprint Planning、Daily Standup、Sprint Review、Sprint Retrospective、Story Point、Velocity、Burndown |
| 不适用 | 跨 Sprint 长期范围、Stage Gate 治理、Change Control Board、Business Case、Board 级别 Highlight Report |
| 组合 | 与 Hybrid 组合提供上层 PM 治理；与 PMBOK 组合提供迭代内范围、进度、风险、质量细节 |
| 输出 | Product Backlog、Sprint Backlog、User Story、DoR / DoD、Sprint Plan / Review / Retro、Burndown / Velocity 数据 |
| 必备引用 | Sprint 编号、Story ID、Story Point、Status、Owner、Blocked、AC 引用 |

## 6. Kanban

| 字段 | 内容 |
|---|---|
| 适用 | 持续流、看板列、可视化 WIP 限制、Lead Time / Cycle Time、流动效率、显式策略、反馈循环 |
| 不适用 | 固定 Sprint、Sprint Goal 强对齐、Velocity 预测、Story Point 强制估算、Planning Poker |
| 组合 | 与 PMO 组合提供项目层 WIP 与审批；与 PMBOK 组合提供 Risk 与 Change 的持续流 |
| 输出 | Kanban Board、Column Policy、WIP Limit 表、Lead/Cycle Time 数据、流动效率 |
| 必备引用 | 列名、Item ID、Enter Time、Exit Time、Lead Time、Cycle Time、Class of Service |

## 7. Hybrid

| 字段 | 内容 |
|---|---|
| 适用 | 上层 PMO / PMP / PRINCE2 治理（范围、风险、决策、变更、阶段）；下层敏捷交付（Sprint / Backlog / Story / Velocity）；统一 Gate、阶段交付、迭代节奏 |
| 不适用 | 纯敏捷或纯预测的极简场景（直接用 Scrum 或 PMBOK 即可，不必叠加 Hybrid） |
| 组合 | 与所有其他框架正交组合；Hybrid 是"框架编排器"而非平行层 |
| 输出 | 阶段 / Sprint 映射表、Scope ↔ Backlog 一致性报告、Risk → Sprint 影响、Change 评估、阶段 Gate 决策 |
| 必备引用 | 当前阶段、Sprint 编号、Scope Baseline 状态、Change 编号、Gate 状态 |

## 8. 框架组合的强制约束

- **不得**单用某框架名替代判断：例如"按 PMP 处理"不是有效输出。
- **不得**跳过治理层（PMO）直接进入交付层（Scrum / Kanban）。
- **不得**在 Scope Baseline 未批准时进入 Sprint（Hybrid 边界）。
- **必须**对每个产品输出标注 1 个主框架 + 0..n 辅助框架。
- **必须**对每次失败 / 升级显式引用对应框架的"不适用"或"例外管理"规则。

## 9. Agile Delivery 框架

| 字段 | 内容 |
|---|
| 适用 | Sprint / Backlog / Story / DoR / DoD / Acceptance Criteria / Story Point / WIP / Blocked / Carry-over 维护；敏捷框架自动选择；Scope Baseline 一致性；敏捷语义不变量 |
| 不适用 | 自动 Velocity 预测、资源负载优化、完整 Jira/Linear 工作流引擎 |
| 组合 | 与所有框架组合；与 Hybrid 组合提供上/下层治理；与 PMO 组合提供审批与 WIP 限制 |
| 输出 | Sprint Backlog、DoR/DoD 一致性报告、Scope 冲突 Gap、WIP/Blocked 状态、Carry-over 报告 |
| 必备引用 | Story ID、DoR/DoD 状态、Scope Baseline 版本、Sprint 编号、WIP 限制值 |

敏捷专业行为规则（Scrum / Kanban / Hybrid 的门禁、DoR/DoD 分离、Scope 一致性、Story 质量缺口、WIP、Carry-over）见 `references/agile-delivery-rules.md`。

## 10. 与场景的对应

`scenarios/scenarios.md` 的所有 Given / When / Then 必须能映射回本表的某
一行的"输出"与"必备引用"。任何场景若找不到映射即视为无效场景。
