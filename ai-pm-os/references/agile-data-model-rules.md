# 敏捷数据模型规则（Agile Data Model Rules）

本文档定义 11 类敏捷文档/对象的数据模型契约，包含字段规范、状态枚举、审批规则、质量检查和禁止状态。
本文档是 `agile-delivery-rules.md` 的数据模型补充，不弱化其中的任何门禁规则。
删除或弱化任一字段视为破坏内核。

---

## 前置说明：DoR / DoD / Acceptance Criteria 分离

本文档的 DoR、DoD、Acceptance Criteria 三个对象**不得互换**，这是 `agile-delivery-rules.md` §5 的数据模型补充：

| 维度 | DoR | DoD | Acceptance Criteria |
|---|---|---|---|
| 触发时机 | Story 进入 Sprint Planning 承诺前 | Story 达到交付完成时 | Story 开发过程中逐步满足 |
| 目的 | 判断 Story 是否"可承诺" | 判断 Story 是否"已完成" | 判断 Story 是否"符合用户需求" |
| 典型批准人 | PO + Team | PO + Team | PO（或授权 Test）|

DoR 与 DoD 不得混为同一字段；DoR 不得替代 Acceptance Criteria。
详见 `agile-delivery-rules.md` §5。

---

## 前置说明：敏捷对象契约的 9 个标准字段

每个敏捷对象必须包含以下 9 个标准字段：

| 字段名 | 说明 | 约束 |
|---|---|---|
| `object_id` | 唯一标识符，格式由各对象定义 | 不得重复 |
| `markdown_source` | Markdown 权威源文件路径 | 宿主项目提供 |
| `json_target` | JSON 可视化同步目标路径 | 宿主项目提供 |
| `required_fields` | 最小必填字段列表 | 不得删减 |
| `status_values` | 允许的状态枚举值 | 不得超出定义范围 |
| `owner_role` | 负责角色 | 不得为空 |
| `approval_rule` | 审批规则 | 不得跳过 |
| `quality_checks` | 质量检查项 | 不得弱化 |
| `forbidden_states` | 禁止的状态或转换 | 不得绕过 |

---

## ADM-01: Product Backlog

### object_id

格式：`BL-YYYY-###`（如 `BL-2026-001`）

### markdown_source

`02_AGILE/PM_PRODUCT_BACKLOG.md`

### json_target

`07_DATA/backlog.json`

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `backlog_id` | `BL-YYYY-###` | 唯一标识 |
| `title` | 文本 | 条目标题 |
| `description` | 文本 | 需求描述 |
| `requirement_id` | `REQ-###` | 关联需求编号 |
| `priority` | 枚举 | `P0` / `P1` / `P2` / `P3` |
| `status` | 枚举 | `Draft` / `Proposed` / `Ready` / `Committed` / `Done` / `Parked` |
| `owner` | 文本 | 负责人 |
| `source` | 文本 | 来源（REQ/用户/团队） |
| `created_at` | ISO8601 | 创建时间 |
| `updated_at` | ISO8601 | 更新时间 |

### status_values

`Draft` | `Proposed` | `Ready` | `Committed` | `Done` | `Parked`

### owner_role

`ROLE-PRODUCT-OWNER` — Product Owner 维护优先级排序

### approval_rule

- `Draft` → `Proposed`：条目创建者提交
- `Proposed` → `Ready`：Product Owner 确认
- `Ready` → `Committed`：Sprint Planning PO 批准
- `Done`：Sprint Review PO 验收
- **禁止**：`Draft` / `Proposed` 条目直接进入 committed Sprint Backlog

### quality_checks

1. 每个条目必须有 `backlog_id`、`title`、`priority`
2. `requirement_id` 存在时必须关联已批准 REQ
3. `status` 为 `Ready` / `Committed` 时，`priority` 不得为空
4. 条目按 `priority` 降序排序（P0 在前）

### forbidden_states

- `Draft` → `Committed`：跳过 PO 审批
- `Proposed` → `Committed`：跳过 PO 确认
- 无关联 `requirement_id` 且无 PO 确认的条目 → `Committed`

---

## ADM-02: Sprint Backlog

### object_id

格式：`SPRINT-YYYY-NN`（如 `SPRINT-2026-01`）

### markdown_source

`02_AGILE/PM_SPRINT_BACKLOG.md`

### json_target

`07_DATA/sprints.json`

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `sprint_id` | `SPRINT-YYYY-NN` | 唯一标识 |
| `sprint_goal` | 文本 | Sprint 目标摘要 |
| `start_date` | `YYYY-MM-DD` | Sprint 开始日期 |
| `end_date` | `YYYY-MM-DD` | Sprint 结束日期 |
| `committed_items` | 数组 | 承诺的 Story ID 列表 |
| `capacity` | 整数 | 团队容量（Story Point） |
| `velocity_planned` | 整数 | 计划 Velocity |
| `status` | 枚举 | `Planned` / `Active` / `Review` / `Closed` / `Parked` |
| `product_owner_approval` | 布尔 | PO 是否签字 |
| `agile_owner_approval` | 布尔 | Agile Owner 是否签字 |

### status_values

`Planned` | `Active` | `Review` | `Closed` | `Parked`

### owner_role

`ROLE-PRODUCT-OWNER`（目标）+ `ROLE-AGILE-OWNER`（执行确认）

### approval_rule

- `Planned` → `Active`：Sprint Planning 完成 + PO 签字 + Agile Owner 签字
- `Active` → `Review`：Sprint 结束日期到达
- `Review` → `Closed`：Sprint Review 完成
- **禁止**：committed items 中的 Story 有任意一个 `status` 为 `Draft` / `Proposed` 时启动 Sprint

### quality_checks

1. `start_date` 必须 <= `end_date`
2. `committed_items` 中每个 Story 必须满足 DoR
3. `capacity` >= `velocity_planned`（计划 Velocity 不得超出容量）
4. `sprint_goal` 不得为空
5. Sprint 周期不得超过 4 周

### forbidden_states

- 未 PO 签字 → `Active`
- committed items 含 `Draft` / `Proposed` Story → `Active`
- `Active` 期间向 committed items 新增 Story（Scope Change）

---

## ADM-03: User Story

### object_id

格式：`US-YY-###`（如 `US-26-001`）

### markdown_source

`02_AGILE/PM_USER_STORIES.md`

### json_target

`07_DATA/backlog.json`（Story 条目作为 Backlog 子项）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `story_id` | `US-YY-###` | 唯一标识 |
| `as_a` | 文本 | 用户角色 |
| `i_want` | 文本 | 期望功能 |
| `so_that` | 文本 | 业务价值 |
| `acceptance_criteria` | 数组 | 验收标准列表 |
| `story_point` | 整数 | 故事点（Fibonacci 序列） |
| `priority` | 枚举 | `P0` / `P1` / `P2` / `P3` |
| `owner` | 文本 | 开发/测试 Owner |
| `sprint_id` | `SPRINT-YYYY-NN` | Sprint 归属（committed 时必填） |
| `status` | 枚举 | `Draft` / `Ready` / `Committed` / `In Progress` / `Blocked` / `Done` / `Carry-over` |
| `dor_status` | 枚举 | `Passed` / `Not Passed` / `Pending` |
| `dod_status` | 枚举 | `Passed` / `Not Passed` / `Pending` |

### status_values

`Draft` | `Ready` | `Committed` | `In Progress` | `Blocked` | `Done` | `Carry-over`

### owner_role

`ROLE-PRODUCT-OWNER`（优先级）+ `ROLE-TECH-OWNER`（技术实现）

### approval_rule

- `Draft` → `Ready`：AC 已写 + SP 已估 + Owner 已分配
- `Ready` → `Committed`：DoR 全部通过 + PO 签字
- `Done`：DoD 全部通过 + PO 验收

### quality_checks

1. `as_a` / `i_want` / `so_that` 三段式结构完整
2. `acceptance_criteria` 不得为空（至少 1 条）
3. `story_point` 必须是 Fibonacci 序列值（1, 2, 3, 5, 8, 13, 21）
4. `status` = `Committed` 时，`dor_status` 必须是 `Passed`
5. `status` = `Done` 时，`dod_status` 必须是 `Passed`

### forbidden_states

- 无 AC → `Committed`
- 无 SP → `Committed`
- `Dor_status` = `Not Passed` → `Committed`
- `Draft` → `Committed`（跳过 DoR Gate）
- `Draft` → `Done`（跳过 DoD Gate）
- `Carry-over` Story 不经 PO 重新确认 → 下一 Sprint committed

---

## ADM-04: Acceptance Criteria

### object_id

格式：`AC-US-YY-###`（如 `AC-US-26-001`）

### markdown_source

`02_AGILE/PM_ACCEPTANCE_CRITERIA.md`

### json_target

`07_DATA/backlog.json`（作为 Story 子项）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `ac_id` | `AC-US-YY-###` | 唯一标识 |
| `story_id` | `US-YY-###` | 关联 Story |
| `criteria` | 文本 | 验收标准描述 |
| `sprint_id` | `SPRINT-YYYY-NN` | Sprint 归属 |
| `status` | 枚举 | `Draft` / `Approved` / `Met` / `Failed` |
| `owner` | 文本 | 负责验收人 |
| `created_at` | ISO8601 | 创建时间 |

### status_values

`Draft` | `Approved` | `Met` | `Failed`

### owner_role

`ROLE-PRODUCT-OWNER`（定义）+ `ROLE-UAT-OWNER`（验收）

### approval_rule

- `Draft` → `Approved`：PO 审批
- `Approved` → `Met`：UAT Owner 确认通过
- `Approved` → `Failed`：测试失败

### quality_checks

1. 每条 AC 必须是客观可验证的（通过/失败可判断）
2. AC 不得与 DoR 检查项混淆
3. AC 不得与 DoD 检查项混淆
4. 一个 Story 至少 1 条 AC

### forbidden_states

- 无关联 Story → 独立存在
- AC 不得替代 DoR 或 DoD

---

## ADM-05: Story Point

### object_id

格式：`SP-US-YY-###`（如 `SP-US-26-001`）

### markdown_source

`02_AGILE/PM_USER_STORIES.md`（作为 Story 子字段）

### json_target

`07_DATA/backlog.json`（作为 Story 子字段）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `sp_id` | `SP-US-YY-###` | 唯一标识 |
| `story_id` | `US-YY-###` | 关联 Story |
| `point_value` | 整数 | 故事点值 |
| `estimation_method` | 枚举 | `Planning Poker` / `T-Shirt Sizing` / `Large Uncertain Card` |
| `estimator` | 文本 | 估算人 |
| `created_at` | ISO8601 | 估算时间 |

### status_values

无独立状态；作为 Story 的子字段存在

### owner_role

`ROLE-TECH-OWNER`（团队估算）+ `ROLE-PRODUCT-OWNER`（确认）

### approval_rule

Story 进入 `Committed` 前必须完成估算；估算方法必须记录

### quality_checks

1. `point_value` 必须是 Fibonacci 序列：1, 2, 3, 5, 8, 13, 21
2. `point_value` = 0 仅在 Story 为 Quick Win 且 PO 明确确认时允许
3. 估算必须由团队（而非单方）完成

### forbidden_states

- 无估算 → `Committed`
- `point_value` 不在 Fibonacci 序列 → Sprint Planning
- 估算值 = 21（超大 Story）→ 未经 PO 同意进入 Sprint

---

## ADM-06: DoR（Definition of Ready）

### object_id

格式：`DOR-US-YY-###`（如 `DOR-US-26-001`）

### markdown_source

`02_AGILE/PM_DOR_DOD.md`

### json_target

`07_DATA/backlog.json`（作为 Story 子字段 `dor_status`）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `dor_id` | `DOR-US-YY-###` | 唯一标识 |
| `story_id` | `US-YY-###` | 关联 Story |
| `checklist` | 数组 | DoR 检查项列表 |
| `po_signoff` | 布尔 | PO 签字确认 |
| `signoff_date` | `YYYY-MM-DD` | 签字日期 |
| `status` | 枚举 | `Not Passed` / `Passed` / `Pending` |

### status_values

`Not Passed` | `Passed` | `Pending`

### owner_role

`ROLE-PRODUCT-OWNER`（确认）+ `ROLE-TECH-OWNER`（自检）

### approval_rule

`status` = `Passed` 的唯一条件：`checklist` 全部完成 + PO 签字

### quality_checks

1. `checklist` 至少 4 条（对应 `agile-delivery-rules.md` §5.2）
2. 检查项包括：需求澄清、AC 已写、SP 已估、Owner 已分配
3. `status` = `Passed` 前不得将 Story 标记为 committed

### checklist

- 需求已澄清（As a / I want / So that 完整）
- Acceptance Criteria 已写且每条可客观判断
- Story Point 已完成估算（Fibonacci 序列）
- Owner 已分配（开发 + 测试）

### forbidden_states

- `checklist` 未全部完成 → `Passed`
- 无 PO 签字 → `Passed`
- DoR 检查结果写入 DoD 字段（混淆两个概念）

---

## ADM-07: DoD（Definition of Done）

### object_id

格式：`DOD-US-YY-###`（如 `DOD-US-26-001`）

### markdown_source

`02_AGILE/PM_DOR_DOD.md`

### json_target

`07_DATA/backlog.json`（作为 Story 子字段 `dod_status`）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `dod_id` | `DOD-US-YY-###` | 唯一标识 |
| `story_id` | `US-YY-###` | 关联 Story |
| `checklist` | 数组 | DoD 检查项列表 |
| `po_signoff` | 布尔 | PO 签字确认 |
| `signoff_date` | `YYYY-MM-DD` | 签字日期 |
| `status` | 枚举 | `Not Passed` / `Passed` / `Pending` |

### status_values

`Not Passed` | `Passed` | `Pending`

### owner_role

`ROLE-PRODUCT-OWNER`（验收）+ `ROLE-TECH-OWNER`（自检）

### approval_rule

`status` = `Passed` 的唯一条件：`checklist` 全部完成 + PO 签字

### quality_checks

1. `checklist` 至少 4 条（对应 `agile-delivery-rules.md` §5.3）
2. 检查项包括：AC 满足、测试通过、Code Review 通过、文档更新
3. `status` = `Passed` 前不得将 Story 标记为 `Done`

### checklist

- 所有 Acceptance Criteria 已满足并通过验收
- 单元测试覆盖率 >= 80%（或项目规定的阈值）
- Code Review 已通过
- 集成测试 / E2E 测试全部通过

### forbidden_states

- `checklist` 未全部完成 → `Passed`
- 无 PO 签字 → `Passed`
- DoD 检查项写入 DoR 字段（混淆两个概念）
- AC 满足但 DoD 未完成 → `Done`

---

## ADM-08: Sprint Plan

### object_id

格式：`PLAN-SPRINT-YYYY-NN`（如 `PLAN-SPRINT-2026-01`）

### markdown_source

`02_AGILE/PM_SPRINT_PLAN.md`

### json_target

`07_DATA/sprints.json`（作为 Sprint 子文档）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `plan_id` | `PLAN-SPRINT-YYYY-NN` | 唯一标识 |
| `sprint_id` | `SPRINT-YYYY-NN` | 关联 Sprint |
| `sprint_goal` | 文本 | Sprint 目标 |
| `committed_stories` | 数组 | 承诺的 Story 列表（含 SP） |
| `capacity_total` | 整数 | 总容量 |
| `capacity_used` | 整数 | 已承诺容量 |
| `capacity_buffer` | 整数 | 缓冲容量 |
| `po_approval` | 布尔 | PO 是否批准 |
| `team_agreement` | 布尔 | 团队是否确认 |
| `planning_date` | `YYYY-MM-DD` | Planning 日期 |

### status_values

`Draft` | `Approved` | `Applied`

### owner_role

`ROLE-PRODUCT-OWNER`（目标）+ `ROLE-AGILE-OWNER`（执行）

### approval_rule

- `Draft` → `Approved`：PO 批准 + 团队确认
- `Approved` → `Applied`：Sprint 启动

### quality_checks

1. `capacity_used` + `capacity_buffer` <= `capacity_total`
2. `committed_stories` 中每个 Story 的 SP 总和 <= `capacity_total`
3. 每个 committed Story 的 `dor_status` = `Passed`
4. `sprint_goal` 不得为空

### forbidden_states

- `capacity_used` > `capacity_total`
- 未 PO 批准 → `Applied` / `Approved`
- 团队不同意 → `Approved`

---

## ADM-09: Sprint Review

### object_id

格式：`REVIEW-SPRINT-YYYY-NN`（如 `REVIEW-SPRINT-2026-01`）

### markdown_source

`02_AGILE/PM_SPRINT_REVIEW.md`

### json_target

`07_DATA/sprints.json`（Review 结果写入 Sprint 记录）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `review_id` | `REVIEW-SPRINT-YYYY-NN` | 唯一标识 |
| `sprint_id` | `SPRINT-YYYY-NN` | 关联 Sprint |
| `sprint_goal` | 文本 | Sprint 目标回顾 |
| `delivered_stories` | 数组 | 交付的 Story 列表 |
| `undelivered_stories` | 数组 | 未交付的 Story 列表 |
| `sprint_metrics` | 对象 | 实际 Velocity、SP 完成数 |
| `action_items` | 数组 | Review 产生的 Action Items |
| `po_feedback` | 文本 | PO 反馈 |
| `review_date` | `YYYY-MM-DD` | Review 日期 |

### status_values

`Draft` | `Approved`

### owner_role

`ROLE-PRODUCT-OWNER`（主持）+ `ROLE-AGILE-OWNER`（记录）

### approval_rule

- `Draft` → `Approved`：PO 确认 Review 完成

### quality_checks

1. `delivered_stories` 中每个 Story 的 `dod_status` = `Passed`
2. `undelivered_stories` 中的 Story 必须携带 `Carry-over` 原因
3. `action_items` 不得为空（至少记录下一 Sprint 调整项）
4. `sprint_metrics` 必须记录实际 Velocity

### forbidden_states

- `undelivered_stories` 不携带 Carry-over 原因 → 下一 Sprint
- `delivered_stories` 含 `dod_status` = `Not Passed` → Review

---

## ADM-10: Sprint Retrospective

### object_id

格式：`RETRO-SPRINT-YYYY-NN`（如 `RETRO-SPRINT-2026-01`）

### markdown_source

`02_AGILE/PM_SPRINT_RETROSPECTIVE.md`

### json_target

`07_DATA/velocity.json`（团队效率数据）

### required_fields

| 字段名 | 类型 | 说明 |
|---|---|---|
| `retro_id` | `RETRO-SPRINT-YYYY-NN` | 唯一标识 |
| `sprint_id` | `SPRINT-YYYY-NN` | 关联 Sprint |
| `what_went_well` | 数组 | 做得好的事项 |
| `what_to_improve` | 数组 | 待改进事项 |
| `action_items` | 数组 | 下一步 Action |
| `team_sentiment` | 枚举 | `Positive` / `Neutral` / `Negative` |
| `retro_date` | `YYYY-MM-DD` | Retrospective 日期 |

### status_values

`Draft` | `Approved`

### owner_role

`ROLE-AGILE-OWNER`（主持）+ 全体团队

### approval_rule

- `Draft` → `Approved`：团队确认

### quality_checks

1. `what_went_well` + `what_to_improve` 不得同时为空
2. `action_items` 至少 1 条，且有 Owner 和 due_date
3. `action_items` 必须影响下一 Sprint 的改进

### forbidden_states

- 无 `action_items` → 下一 Sprint Planning（无改进记录）
- Retrospective 无 Agile Owner 主持 → 正式记录

---

## ADM-11: Kanban / WIP / Blocked / Carry-over

### object_id

格式前缀：`WIP-` / `BLK-` / `CO-`

### markdown_source

`02_AGILE/PM_DAILY_STANDUP_LOG.md`（WIP/Blocked）+ `02_AGILE/PM_SPRINT_BACKLOG.md`（Carry-over）+ `02_AGILE/PM_BURNDOWN_DATA.md`（Burndown 数据）+ `02_AGILE/PM_VELOCITY_LOG.md`（Velocity 数据）

### json_target

`07_DATA/burndown.json`（Burndown 数据）+ `07_DATA/velocity.json`（Velocity 数据）

### required_fields（Kanban WIP）

| 字段名 | 类型 | 说明 |
|---|---|---|
| `wip_id` | `WIP-YYYY-NN` | 唯一标识 |
| `board_column` | 文本 | 看板列名 |
| `wip_limit` | 整数 | WIP 上限 |
| `current_count` | 整数 | 当前在制数量 |
| `last_updated` | ISO8601 | 更新时间 |

### required_fields（Blocked）

| 字段名 | 类型 | 说明 |
|---|---|---|
| `blk_id` | `BLK-YYYY-NN` | 唯一标识 |
| `story_id` | `US-YY-###` | 被阻塞的 Story |
| `blocked_date` | `YYYY-MM-DD` | 阻塞开始日期 |
| `blocker_reason` | 文本 | 阻塞原因 |
| `owner` | 文本 | 负责解除阻塞的人 |
| `status` | 枚举 | `Open` / `Resolved` |

### required_fields（Carry-over）

| 字段名 | 类型 | 说明 |
|---|---|---|
| `co_id` | `CO-YYYY-NN` | 唯一标识 |
| `story_id` | `US-YY-###` | Carry-over Story |
| `source_sprint` | `SPRINT-YYYY-NN` | 原 Sprint |
| `target_sprint` | `SPRINT-YYYY-NN` | 目标 Sprint |
| `carry_reason` | 枚举 | `External Dependency` / `Estimation Gap` / `Requirement Change` / `Other` |
| `po_confirmed` | 布尔 | PO 是否重新确认 |
| `dor_reassessed` | 布尔 | DoR 是否重新确认 |
| `status` | 枚举 | `Pending` / `Confirmed` / `Cancelled` |

### status_values

- WIP：`Active`
- Blocked：`Open` | `Resolved`
- Carry-over：`Pending` | `Confirmed` | `Cancelled`

### owner_role

- WIP：`ROLE-AGILE-OWNER`（看板治理）
- Blocked：`ROLE-TECH-OWNER`（解除阻塞）
- Carry-over：`ROLE-PRODUCT-OWNER`（价值确认）

### approval_rule

- WIP：`current_count` < `wip_limit` 时才能拉入新 Story
- Blocked：`blocked_date` 超过 1 工作日 → 升级建议
- Carry-over：`po_confirmed` = true + `dor_reassessed` = true → `Confirmed`

### quality_checks

1. WIP：`current_count` > `wip_limit` 时必须输出 `Escalation: wip-exceeded`
2. Blocked：状态为 `Open` 超过 2 工作日 → 升级建议
3. Blocked Story 的 SP 不计入 Velocity
4. Carry-over：`carry_reason` 不得为空
5. Carry-over：必须记录 `Carry-over Reason`（`agile-delivery-rules.md` §8）

### forbidden_states

- WIP：`current_count` >= `wip_limit` 时拉入新 Story
- Blocked：不记录 `blocker_reason` → `Resolved`
- Blocked：长期 Blocked（> 3 工作日）不升级
- Carry-over：静默滚动（无 PO 确认）→ 下一 Sprint
- Carry-over：不重新评估 DoR → 下一 Sprint committed

---

## 附录：敏捷 JSON 目标文件契约

本文档涉及的 4 个 JSON 目标文件必须满足以下契约：

### backlog.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `backlog_items` | 数组 | Product Backlog 条目列表 |
| `last_updated` | ISO8601 | 最后更新时间 |
| `version` | 字符串 | 数据版本 |

### sprints.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `sprints` | 数组 | Sprint 记录列表 |
| `active_sprint` | 对象 | 当前活跃 Sprint |
| `last_updated` | ISO8601 | 最后更新时间 |
| `version` | 字符串 | 数据版本 |

### burndown.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `sprint_id` | 字符串 | 关联 Sprint |
| `daily_points` | 数组 | 每日剩余 Story Point |
| `ideal_line` | 数组 | 理想燃烧线 |
| `last_updated` | ISO8601 | 最后更新时间 |
| `version` | 字符串 | 数据版本 |

### velocity.json

| 字段 | 类型 | 说明 |
|---|---|---|
| `sprint_history` | 数组 | 历史 Sprint Velocity |
| `average_velocity` | 整数 | 平均 Velocity |
| `last_updated` | ISO8601 | 最后更新时间 |
| `version` | 字符串 | 数据版本 |

---

## 附录：Scope Baseline 一致性规则（数据模型约束）

本文档的所有敏捷对象与 `agile-delivery-rules.md` §6 保持一致：

1. **Backlog → Approved Scope**：Backlog 中 `status` 为 `Draft` / `Proposed` 的条目不得进入 committed Sprint Backlog
2. **未批准 Story 禁止 committed**：若 Story 的 Backlog 条目无关联 `requirement_id` 且无 PO 确认，不得进入 committed Sprint
3. **Scope 冲突 → Gap**：当 Backlog/Sprint 中的条目与 Approved Scope Baseline 冲突时，输出 `Conflict: backlog-scope` / `Conflict: sprint-scope`，进入 `PM_GAP_ANALYSIS.md`，**禁止自动修正**
4. **Carry-over → PO 确认**：未完成 Story 跨 Sprint 必须 PO 确认 + DoR 重新评估

---

## 附录：状态枚举与禁止转换速查

### Backlog 状态转换

```
Draft → Proposed → Ready → Committed → Done
  ↓         ↓         ↓         ↓
Parked   Parked   Parked   Parked
```

**禁止**：`Draft` / `Proposed` → `Committed`

### Sprint 状态转换

```
Planned → Active → Review → Closed
    ↓                   ↓
 Parked             Parked
```

**禁止**：未 PO 签字 → `Active`

### Story 状态转换

```
Draft → Ready → Committed → In Progress → Done
   ↓         ↓                        ↓
Parked   Parked                  Carry-over → Ready
```

**禁止**：`Draft` → `Committed`（无 DoR）
**禁止**：`Draft` → `Done`（无 DoD）
**禁止**：Carry-over → 下一 Sprint committed（无 PO 确认）

---

## 附录：敏捷数据模型与 agile-delivery-rules.md 的引用关系

本文档的数据模型与 `agile-delivery-rules.md` 的门禁规则对应：

| agile-delivery-rules.md 规则 | 对应数据模型字段 |
|---|---|
| §5.2 DoR 最低 4 条检查项 | ADM-06 `checklist` >= 4 |
| §5.3 DoD 最低 4 条检查项 | ADM-07 `checklist` >= 4 |
| §6.3 未批准 Story 禁止 committed | ADM-01 `status` 约束 + ADM-03 `dor_status` |
| §7 Story 质量缺口（AC/SP/Owner）| ADM-03 `acceptance_criteria` 非空 + `story_point` 非空 |
| §8 Carry-over 禁止静默滚动 | ADM-11 Carry-over `po_confirmed` + `dor_reassessed` |
| §3.4 Kanban WIP 超限禁止拉入 | ADM-11 WIP `current_count` < `wip_limit` |
| §3.4 Blocked Aging 升级 | ADM-11 Blocked `status` = `Open` 超过 2 工作日 |
