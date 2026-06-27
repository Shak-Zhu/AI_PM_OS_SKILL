# 敏捷报告规则（Agile Reporting Rules）

本文档定义 AGILE 工作流中 Sprint 报告、Burndown、Velocity、Blocked / Carry-over 和 Scope 冲突检查的专业输出规则。
本文档是 `agile-data-model-rules.md` 和 `agile-delivery-rules.md` 的报告层补充，使日报、周报、月报和管理层报告能够可靠体现 Sprint 与 Backlog 状态。
本文档不实现 JSON schema、同步脚本、Dashboard 或网页图表。

---

## §1. 敏捷报告输入源契约

敏捷报告的数据必须来自以下 Markdown 权威源文件：

| 敏捷源文件 | 报告用途 |
|---|---|
| `02_AGILE/PM_PRODUCT_BACKLOG.md` | Backlog 状态、优先级、故事点汇总 |
| `02_AGILE/PM_SPRINT_BACKLOG.md` | Sprint 目标、committed items、容量 |
| `02_AGILE/PM_USER_STORIES.md` | Story 状态、DoR/DoD、Story Point |
| `02_AGILE/PM_ACCEPTANCE_CRITERIA.md` | Story 完成度、验收通过率 |
| `02_AGILE/PM_DOR_DOD.md` | DoR/DoD 通过状态 |
| `02_AGILE/PM_SPRINT_PLAN.md` | Sprint Planning 承诺、容量分配 |
| `02_AGILE/PM_SPRINT_REVIEW.md` | Sprint 完成情况、未完成项 |
| `02_AGILE/PM_SPRINT_RETROSPECTIVE.md` | Sprint 改进项、团队情绪 |
| `02_AGILE/PM_DAILY_STANDUP_LOG.md` | WIP、Blocked 项及其 aging |
| `02_AGILE/PM_BURNDOWN_DATA.md` | Burndown 每日数据点 |
| `02_AGILE/PM_VELOCITY_LOG.md` | 历史 Velocity 数据 |

不得从聊天记忆、推测或外部系统补充报告数据。

---

## §2. 敏捷报告 JSON 读取契约

敏捷报告可读取以下 JSON 可视化文件获取结构化数据：

| JSON 目标文件 | 读取用途 |
|---|---|
| `07_DATA/backlog.json` | Backlog 条目、Story 状态、DoR/DoD 状态 |
| `07_DATA/sprints.json` | Sprint 记录、active sprint、已完成/未完成 Story |
| `07_DATA/burndown.json` | Burndown 每日数据、scope added/removed |
| `07_DATA/velocity.json` | 历史 Velocity、SP 完成数、carry-over |
| `07_DATA/reports.json` | 报告索引、历史报告记录 |

读取 JSON 时，若字段不存在或数据为空，必须输出 `Gap: [field]-missing`，不得编造数据。

---

## §3. 8 类 P0 敏捷报告指标

每类敏捷报告（日报、周报、月报、管理层报告）必须覆盖以下 8 类指标中适用的部分：

### 指标 1：Sprint Status

**定义**：当前 Sprint 的基本状态。

**必须读取**：`02_AGILE/PM_SPRINT_BACKLOG.md` 或 `07_DATA/sprints.json`（active_sprint）

**字段**：`sprint_id`、`sprint_goal`、`start_date`、`end_date`、`status`

**指标计算**：`Active` = 当前日期在 start_date 和 end_date 之间；`Review` = 当前日期 >= end_date 且 status = Review

### 指标 2：Sprint Goal Health

**定义**：Sprint 目标是否仍然可达。

**必须读取**：Sprint Plan + Sprint Review + Burndown

**评估标准**：
- Green（目标可达）：>= 70% Story 完成 且 Burndown 曲线未严重偏离理想线
- Amber（风险）：50%~69% Story 完成 或 Burndown 偏离 > 20%
- Red（目标不可达）：< 50% Story 完成 或 blocked_points > 30% 容量

### 指标 3：Backlog Readiness

**定义**：Product Backlog 中 Ready 状态条目的占比和质量。

**必须读取**：`02_AGILE/PM_PRODUCT_BACKLOG.md` 或 `07_DATA/backlog.json`

**评估标准**：
- Ready 条目占比 = Ready 条目数 / (Draft + Proposed + Ready) 总数
- 若 Ready 占比 < 30%，报告 `Gap: backlog-low-readiness`
- 每条 Ready 条目必须有关联的 requirement_id 或 PO 确认

### 指标 4：Planned vs Completed Story Points

**定义**：Sprint 计划 SP 与实际完成 SP 的对比。

**必须读取**：Sprint Plan（committed_stories SP 总和）+ Sprint Review（delivered_stories SP 总和）

**计算**：`completed_ratio = delivered_SP / committed_SP * 100%`

**报告格式**：`Planned: [X] SP | Completed: [Y] SP | Ratio: [Z]%`

### 指标 5：Burndown — Remaining Points

**定义**：Sprint Burndown 曲线。

**必须读取**：`02_AGILE/PM_BURNDOWN_DATA.md` 或 `07_DATA/burndown.json`

**Burndown 契约 9 个字段**（`agile-data-model-rules.md` ADM-11 + WP-011 scope_in item 8）：

| 字段名 | 类型 | 说明 |
|---|---|---|
| `sprint_id` | `SPRINT-YYYY-NN` | 关联 Sprint |
| `date` | `YYYY-MM-DD` | 数据日期 |
| `planned_remaining_points` | 整数 | 理想剩余 Story Point |
| `actual_remaining_points` | 整数 | 实际剩余 Story Point |
| `completed_points` | 整数 | 当日完成 Story Point |
| `scope_added_points` | 整数 | 当日新增 Scope（SP） |
| `scope_removed_points` | 整数 | 当日移除 Scope（SP） |
| `blocked_points` | 整数 | 被阻塞 Story 的 SP（不计入完成） |
| `source` | 文本 | 数据来源（Burndown Data / Velocity Log） |

**报告规则**：`actual_remaining_points` > `planned_remaining_points` 且差距 > 20% → `Amber: burndown-behind`；差距 > 40% → `Red: burndown-critical`

### 指标 6：Velocity — Actual vs Planned

**定义**：Velocity 表现与计划对比。

**必须读取**：`02_AGILE/PM_VELOCITY_LOG.md` 或 `07_DATA/velocity.json`

**Velocity 契约 8 个字段**（`agile-data-model-rules.md` ADM-11 + WP-011 scope_in item 9）：

| 字段名 | 类型 | 说明 |
|---|---|---|
| `sprint_id` | `SPRINT-YYYY-NN` | 关联 Sprint |
| `planned_points` | 整数 | Sprint 计划 Velocity |
| `completed_points` | 整数 | Sprint 完成 Velocity |
| `accepted_points` | 整数 | PO 验收通过的 SP |
| `carry_over_points` | 整数 | Carry-over 的 SP |
| `velocity_variance` | 整数 | `completed_points - planned_points` |
| `variance_reason` | 枚举 | `Scope Added` / `Blocked Items` / `Estimation Gap` / `External Dependency` / `Team Change` / `Other` |
| `source` | 文本 | 数据来源（Velocity Log / Sprint Review） |

**报告规则**：`velocity_variance` < 0 且 |variance| > 20% → `Amber: velocity-below-plan`；|variance| > 40% → `Red: velocity-critical`

### 指标 7：Blocked Items Aging

**定义**：长期 Blocked Story 的风险。

**必须读取**：`02_AGILE/PM_DAILY_STANDUP_LOG.md` 或 `07_DATA/burndown.json`（blocked_points）

**报告规则**：
- `Open` 超过 1 工作日 → `Amber: blocked-aging`
- `Open` 超过 2 工作日 → `Red: blocked-critical` + 升级建议
- Blocked Story 的 SP 不计入 Velocity

### 指标 8：Carry-over Items and Reason Codes

**定义**：跨 Sprint Carry-over 的 Story 及原因。

**必须读取**：`02_AGILE/PM_SPRINT_BACKLOG.md`（Carry-over）或 `07_DATA/backlog.json`

**Carry-over 契约**（`agile-data-model-rules.md` ADM-11）：

| 字段名 | 类型 | 说明 |
|---|---|---|
| `co_id` | 唯一标识 |
| `story_id` | Carry-over Story |
| `source_sprint` | 原 Sprint |
| `target_sprint` | 目标 Sprint |
| `carry_reason` | 枚举：External Dependency / Estimation Gap / Requirement Change / Other |
| `po_confirmed` | PO 重新确认（布尔） |
| `dor_reassessed` | DoR 重新评估（布尔） |
| `status` | Pending / Confirmed / Cancelled |

**报告规则**：未 `po_confirmed` 的 Carry-over → `Gap: carry-over-unconfirmed`；无 `carry_reason` → `Gap: carry-over-reason-missing`

---

## §4. 日报敏捷内容规则

日报（REPORT_DAILY）中涉及敏捷内容时，必须包含：

### 4.1 当前 Sprint 状态

1. 当前 Sprint ID 和目标
2. Sprint 开始日期 / 计划结束日期 / 剩余工作日
3. Sprint 进度：`[completed_SP] / [committed_SP] SP ([percentage]%)`
4. Sprint Goal Health 评估（Green / Amber / Red）

### 4.2 今日 Sprint 相关 Action

1. 今日完成的 Story 或子任务（附 SP）
2. 今日遇到的 Blocked 项（附 `blk_id` 和 blocking_reason）
3. 今日产生的 Carry-over 或未完成项
4. 明日 Sprint 相关 Action

### 4.3 Blocked Story Aging（若有）

- 列出所有 `status = Open` 的 Blocked Story
- 标注 blocked_date 和 aging（工作日）
- 超过 2 工作日 → 标注 `Escalation: blocked-critical`

### 4.4 Carry-over 风险（若有）

- 列出本 Sprint 未完成且将 Carry-over 的 Story
- 确认 `po_confirmed` 和 `carry_reason`
- 未确认 → 标注 `Gap: carry-over-unconfirmed`

### 4.5 缺失数据处理

若上述数据缺失，必须输出 `Gap: [data-source]-no-data`，不得将"无数据"写成"趋势正常"或"无风险"。

---

## §5. 周报/月报敏捷内容规则

周报（REPORT_WEEKLY）和月报（REPORT_MONTHLY）中涉及敏捷内容时，必须包含：

### 5.1 Sprint 目标完成情况

1. Sprint 目标摘要（sprint_goal）
2. 完成 Story 数量 / committed Story 数量
3. Sprint Goal Health 评估（Green / Amber / Red）
4. 若 Sprint 已关闭：Sprint Review 关键结论

### 5.2 Backlog 变化

1. Backlog 条目变化：新增 / 已完成 / 已移除（本周/本月）
2. Ready 条目占比趋势
3. 标注任何 Backlog → Scope 冲突（见 §7）

### 5.3 Burndown 趋势摘要

1. Sprint Burndown 曲线摘要（可用文字描述：领先/落后理想线多少）
2. `scope_added_points` 和 `scope_removed_points` 趋势
3. 若实际剩余 >> 计划剩余 → `Amber: burndown-behind`

### 5.4 Velocity 趋势摘要

1. 本 Sprint Velocity：planned vs completed vs accepted
2. 历史 Velocity 对比（最近 3 Sprint 平均）
3. 若 `velocity_variance` < -20% → `Amber: velocity-below-plan`

### 5.5 Scope 冲突和未批准 Story 统计

1. 报告期内发现的 Scope 冲突数量
2. 处于 Draft/Proposed 状态且已进入 committed Sprint 的 Story（禁止状态）数量
3. 每个冲突输出 `Conflict: [type]`，建议进入 `PM_GAP_ANALYSIS.md`

---

## §6. 管理层报告敏捷内容规则

管理层报告（REPORT_STEERING）中涉及敏捷内容时，必须包含：

### 6.1 RAG（红黄绿）指标摘要

| 指标 | Green | Amber | Red |
|---|---|---|---|
| Sprint Goal Health | >= 70% 完成 | 50%~69% | < 50% |
| Velocity vs Plan | variance >= -10% | -10% ~ -30% | < -30% |
| Burndown | 实际 <= 计划 +10% | +10%~+30% | > +30% |
| Blocked Aging | 无 Blocked 或 < 1d | 1~2d | > 2d |

### 6.2 Sprint Health

- 当前 Sprint 进展摘要（1~2 句话）
- 关键风险（Blocked 项、Carry-over 项、Scope 冲突）
- 若有任何 Amber/Red 指标 → 附升级建议

### 6.3 Scope Conflict Count

- 本周期发现的 Scope 冲突总数
- 与上一周期对比（增加/减少/持平）
- 列出需要 Sponsor Approver 关注或决策的冲突

### 6.4 Blocked / Carry-over Summary

- 当前 Blocked Story 总数（附 aging 分布）
- 当前 Carry-over 项总数（附未 PO 确认的数量）
- 若存在未确认 Carry-over → 请求 Sponsor Approver 确认

### 6.5 Sponsor Approver 升级事项

- 需要 Sponsor Approver 关注的决策或升级事项
- 每个事项附 RAG 影响分析
- 每个事项附建议的决策选项

---

## §7. Scope 冲突检查规则

### 7.1 冲突识别

当 Backlog 或 Sprint 中的条目满足以下任一条件时，视为 Scope 冲突：

1. Story 或 Backlog item 无关联的 `requirement_id` 或 `approved PU` 标记，且 `status` = `Committed`
2. Backlog 条目与 `PM_SCOPE_BASELINE.md` 中的 Approved Scope 不一致
3. Story 的 Backlog 父条目 `status` = `Draft` / `Proposed` 且进入 committed Sprint
4. Story 满足 DoR 但无 PO 签字确认（`product_owner_approval` = false）

### 7.2 冲突处理

检测到 Scope 冲突时，报告必须：

1. 输出 `Conflict: [type]`，类型包括：
   - `Conflict: unapproved-story-committed` — 未批准 Story 进入 committed Sprint
   - `Conflict: backlog-scope-mismatch` — Backlog 条目与 Approved Scope 不符
   - `Conflict: sprint-scope-change` — Sprint 期间新增 Scope 未经 PU 流程
2. 输出 `Gap: scope-conflict-[id]`，进入 `PM_GAP_ANALYSIS.md`
3. 建议生成 Pending Update（PU）以正式处理冲突
4. **禁止**：在检测到冲突后自动将 Story 从 committed Sprint 移除（必须通过 PU 流程）

### 7.3 未批准 Story 禁止 committed

这是 `agile-data-model-rules.md` ADM-01/ADM-03 的强制报告规则：

- 报告必须检查 committed Sprint 中的每个 Story
- 若发现 `status` = `Draft` 或 `Proposed` 的 Story → `Conflict: unapproved-story-committed`
- 若发现无 `requirement_id` 且无 PO 确认的 Story → `Conflict: unapproved-backlog-committed`

---

## §8. 报告 Fail-Closed 规则

### 8.1 缺失数据处理

当报告生成时，指定的敏捷数据源不可用或为空，必须：

1. 输出 `Gap: [data-source]-no-data`
2. **禁止**：将"无数据"描述为"趋势正常"、"无风险"或"状态良好"
3. **禁止**：基于假设或历史平均值估算当前数据
4. **禁止**：输出 `accepted`、`complete`、`done`、`finished` 等暗示任务完成的状态

### 8.2 数据不一致处理

当 Markdown 源文件和 JSON 可视化文件数据不一致时：

1. 以 Markdown 权威源为准
2. 输出 `Conflict: markdown-json-mismatch`
3. 不得自动修正 JSON 以匹配 Markdown（遵循 `agile-data-model-rules.md` 的 Markdown 权威方向）

### 8.3 禁止编造的内容

报告敏捷指标时，以下内容**禁止出现**：

- `趋势正常` / `无明显风险` / `一切顺利` — 在数据缺失时
- `Velocity 符合预期` — 在没有 velocity 数据时
- `Sprint 目标可达` — 在未读取 Burndown 数据时
- `无 Scope 冲突` — 在未执行 §7 Scope 冲突检查时
- `团队状态良好` — 在未读取 Retrospective 时

---

## §9. 与相关规则文档的引用关系

本文档与以下规则文档协同工作，不得与之冲突：

| 规则文档 | 引用关系 |
|---|---|
| `agile-delivery-rules.md` | 定义 DoR/DoD、Carry-over、WIP 等行为规则；本文档是报告层实现 |
| `agile-data-model-rules.md` | 定义 ADM-01~11 字段契约；本文档引用 Burndown（ADM-11）和 Velocity 字段 |
| `communication-and-reporting-rules.md` | 定义日报/周报/月报/管理层报告的通用框架；本文档补充敏捷专项内容 |
| `router.md` | AGILE 工作流路由；敏捷报告通过 REPORT_* 工作流输出 |

---

## 附录：敏捷报告状态机速查

### Sprint Status

```
Planned → Active → Review → Closed
    ↓         ↓         ↓
  Parked   Parked   Parked
```

### Story Status

```
Draft → Ready → Committed → In Progress → Done
  ↓         ↓                          ↓
Parked   Parked                  Carry-over → Ready
```

### Report Gap States

| 缺失数据 | 正确输出 | 禁止输出 |
|---|---|---|
| 无 Sprint 数据 | `Gap: sprint-no-data` | `趋势正常` / `无风险` |
| 无 Burndown 数据 | `Gap: burndown-no-data` | `Burndown 正常` |
| 无 Velocity 数据 | `Gap: velocity-no-data` | `Velocity 符合预期` |
| 无 Scope 冲突检查 | `Gap: scope-conflict-unchecked` | `无 Scope 冲突` |
| 无 Retrospective | `Gap: retro-no-data` | `团队状态良好` |
