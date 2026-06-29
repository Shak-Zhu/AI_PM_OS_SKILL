# JSON 数据契约规则（JSON Data Contract Rules）

本文档定义 `07_DATA/*.json` 的权威数据契约。
JSON 是 Markdown 的可视化同步层，不得反向覆盖 Markdown。
删除或破坏任一字段契约视为破坏数据层完整性。

---

## 1. 权威方向原则

| 方向 | 规则 |
|---|---|
| Markdown → JSON | 所有结构性数据（Action、Approval、Meeting 等）的权威源为 Markdown 文件（`02_AGILE/`、`03_MEETINGS/` 等）；JSON 是可视化同步层 |
| JSON → Markdown | 禁止：JSON 不得反向覆盖 Markdown 字段 |
| 空数据 | JSON 文件允许空数组 `[]` 或 `{ items: [] }`，但不得混合使用 |
| Schema | `07_DATA/schemas/*.schema.json` 定义每个 JSON 的结构契约 |

P0 不要求数据库、API 或后台同步。

---

## 2. 26 个 JSON 文件契约清单

| # | JSON 文件 | 顶层类型 | Schema 文件 | Source Markdown | ID 字段 | 状态字段 |
|---|---|---|---|---|---|---|
| 1 | `actions.json` | object | `actions.schema.json` | `03_MEETINGS/meeting_minutes/*.md` | `action_id` | `status` |
| 2 | `approvals.json` | object | `approvals.schema.json` | `01_PM_DOCUMENTS/PM_APPROVAL_STATUS.md` | `approval_id` | `status` |
| 3 | `backlog.json` | object | `backlog.schema.json` | `02_AGILE/PM_PRODUCT_BACKLOG.md` | `story_id` | `status` |
| 4 | `burndown.json` | object | `burndown.schema.json` | `02_AGILE/PM_BURNDOWN_DATA.md` | `sprint_id` | — |
| 5 | `changes.json` | object | `changes.schema.json` | `01_PM_DOCUMENTS/PM_CHANGE_LOG.md` | `change_id` | `status` |
| 6 | `daily_briefing.json` | object | `daily_briefing.schema.json` | `00_PM_MEMORY/PM_DAILY_BRIEFING.md` | `date` | — |
| 7 | `dashboard_state.json` | object | `dashboard_state.schema.json` | 自动生成 | — | `rag_status` |
| 8 | `decisions.json` | object | `decisions.schema.json` | `03_MEETINGS/meeting_minutes/*.md` | `decision_id` | — |
| 9 | `documents.json` | object | `documents.schema.json` | `01_PM_DOCUMENTS/` | `document_id` | `status` |
| 10 | `estimation.json` | object | `estimation.schema.json` | `02_AGILE/` | `story_id` | — |
| 11 | `gantt.json` | object | `gantt.schema.json` | `01_PM_DOCUMENTS/` | — | `status` |
| 12 | `input_log.json` | object | `input_log.schema.json` | `00_PM_MEMORY/PM_INPUT_LOG.md` | `input_id` | — |
| 13 | `meeting_actions.json` | object | `meeting_actions.schema.json` | `03_MEETINGS/meeting_minutes/*.md` | `action_id` | `status` |
| 14 | `meeting_decisions.json` | object | `meeting_decisions.schema.json` | `03_MEETINGS/meeting_minutes/*.md` | `decision_id` | — |
| 15 | `meetings.json` | object | `meetings.schema.json` | `03_MEETINGS/meeting_minutes/*.md` | `meeting_id` | `status` |
| 16 | `milestones.json` | object | `milestones.schema.json` | `01_PM_DOCUMENTS/` | `milestone_id` | `status` |
| 17 | `progress.json` | object | `progress.schema.json` | 自动生成 | — | — |
| 18 | `project_roles.json` | object | `project_roles.schema.json` | `00_PM_MEMORY/PM_ROLE_CONFIG.md` | `role_id` | — |
| 19 | `project_state.json` | object | `project_state.schema.json` | `00_PM_MEMORY/PM_CURRENT_STATUS.md` | — | `current_phase` |
| 20 | `raid.json` | object | `raid.schema.json` | `01_PM_DOCUMENTS/` | `item_id` | `type` |
| 21 | `reports.json` | object | `reports.schema.json` | `05_REPORTS/` | `report_id` | `status` |
| 22 | `requirements.json` | object | `requirements.schema.json` | `01_PM_DOCUMENTS/PM_REQUIREMENTS_REGISTER.md` | `req_id` | `status` |
| 23 | `scope.json` | object | `scope.schema.json` | `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md` | — | `scope_baseline` |
| 24 | `sprints.json` | object | `sprints.schema.json` | `02_AGILE/PM_SPRINT_BACKLOG.md` | `sprint_id` | `status` |
| 25 | `todo.json` | object | `todo.schema.json` | `04_TODO/` | `todo_id` | `status` |
| 26 | `velocity.json` | object | `velocity.schema.json` | `02_AGILE/PM_VELOCITY_LOG.md` | `sprint_id` | — |

---

## 3. 通用字段契约

每个 JSON 文件必须包含以下字段（除非上表标注"-"）：

| 字段 | 类型 | 约束 |
|---|---|---|
| `file` | string | 文件路径（相对路径） |
| `schema_target` | string | 对应 schema 文件路径 |
| `source_markdown` | string | 权威 Markdown 源目录 |
| `top_level_type` | string | 顶层类型（object 或 array） |
| `id_field` | string | 主 ID 字段名 |
| `status_field` | string | 状态字段名（可为 null） |
| `owner_role` | string | 负责角色 |
| `sync_rule` | string | 同步方向 |
| `forbidden_states` | array | 禁止的状态值 |

---

## 4. 状态字段枚举标准值

| 状态字段 | 允许值 |
|---|---|
| `status` | `draft` / `proposed` / `approved` / `rejected` / `active` / `completed` / `cancelled` |
| `rag_status` | `green` / `amber` / `red` |
| `current_phase` | `INITIALIZE_PROJECT` / `PLANNING` / `EXECUTING` / `MONITORING` / `CLOSING` / `COMPLETED` |
| `type` (RAID) | `risk` / `assumption` / `issue` / `dependency` |

---

## 5. P0 限制声明

- **P0 不要求数据库**：所有数据存储在 Markdown 和 JSON 文件中。
- **P0 不要求 API**：Skill 直接读取文件系统。
- **P0 不要求后台同步**：同步由 AI Agent 在每次会话触发。
- **P0 不要求 React/Dashboard**：数据由 Markdown 可视化同步层提供。

---

## 6. Schema 孤儿文件检查

`07_DATA/schemas/` 内的每个 schema 文件必须对应一个实际存在的 `07_DATA/*.json` 文件。
孤儿 schema（无对应 data file）视为验证失败。
孤儿 data file（无对应 schema）视为验证失败。
