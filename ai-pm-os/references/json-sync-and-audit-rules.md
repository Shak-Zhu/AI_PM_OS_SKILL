# JSON Sync and Audit Rules

本文档定义 `07_DATA/*.json` 的 Markdown→JSON 主动同步规则与一致性审计契约。
JSON 是 Markdown 的可视化同步层，Markdown 是权威源。
删除或破坏任一规则视为破坏数据层完整性。

---

## 1. Authority Direction

| Direction | Rule |
|---|---|
| **Markdown → JSON** | All structured data authority source is Markdown files (`00_PM_MEMORY/`, `01_PM_DOCUMENTS/`, `02_AGILE/`, `03_MEETINGS/`, `04_TODO/`, `05_REPORTS/` etc.); JSON is proactively synced by Skill after file writes |
| **JSON → Markdown Forbidden** | JSON shall not automatically reverse-overwrite Markdown. JSON is a visualization sync layer only and must not actively write back to Markdown source files |
| **Conflict Resolution** | When Markdown and JSON values differ, Markdown takes precedence; output `Conflict: sync-conflict` |

### 1.1 P0 Prohibitions (禁止)

- **禁止 JSON → Markdown 自动覆盖**：JSON 内容不得主动修改 Markdown 文件。
- **禁止后台监听/Watchdog**：P0 不启动文件系统 watcher、daemon 或定时任务。
- **禁止编造**：无法确认的字段保持 `null`；空数组 `[]` 允许；不得写入无来源的事实。

---

## 2. P0 Sync Triggers

| # | Trigger Scenario | Description |
|---|---|---|
| T-01 | After Skill formal file update | Agent proactively syncs changes to corresponding JSON after executing APPLY/INTAKE or other workflows |
| T-02 | User requests refresh/sync | User invokes `refresh JSON` or `sync Dashboard data` |
| T-03 | Approved PU applied | After PU status changes to `Applied`, sync related JSON (e.g. `approvals.json`, `changes.json`) |
| T-04 | Manual audit trigger | Running `node scripts/audit-data-consistency.js` performs consistency audit |

### 2.1 Prohibited Background Triggers

- Do not start `fs.watch`, `chokidar`, `nodemon`, or any filesystem listener.
- Do not start scheduled tasks (cron, setInterval).
- Do not start background daemon processes.

---

## 3. Sync Scope and Source Map

`sync-data.js` covers at least 15 JSON files:

| # | JSON File | Primary Markdown Source |
|---|---|---|
| 1 | `07_DATA/project_state.json` | `00_PM_MEMORY/PM_CURRENT_STATUS.md` |
| 2 | `07_DATA/dashboard_state.json` | Auto-generated |
| 3 | `07_DATA/requirements.json` | `01_PM_DOCUMENTS/PM_REQUIREMENTS_REGISTER.md` |
| 4 | `07_DATA/scope.json` | `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md` |
| 5 | `07_DATA/approvals.json` | `00_PM_MEMORY/PM_PENDING_UPDATES.md` |
| 6 | `07_DATA/documents.json` | `01_PM_DOCUMENTS/` |
| 7 | `07_DATA/raid.json` | `01_PM_DOCUMENTS/` |
| 8 | `07_DATA/changes.json` | `01_PM_DOCUMENTS/PM_CHANGE_LOG.md` |
| 9 | `07_DATA/decisions.json` | `03_MEETINGS/meeting_minutes/*.md` |
| 10 | `07_DATA/actions.json` | `03_MEETINGS/meeting_minutes/*.md` |
| 11 | `07_DATA/todo.json` | `04_TODO/` |
| 12 | `07_DATA/backlog.json` | `02_AGILE/PM_PRODUCT_BACKLOG.md` |
| 13 | `07_DATA/sprints.json` | `02_AGILE/PM_SPRINT_BACKLOG.md` |
| 14 | `07_DATA/burndown.json` | `02_AGILE/PM_BURNDOWN_DATA.md` |
| 15 | `07_DATA/velocity.json` | `02_AGILE/PM_VELOCITY_LOG.md` |

---

## 4. Sync Behavior Contract

### 4.1 Idempotency

`sync-data.js` must be idempotent: running it twice consecutively produces no additional diff on the second run.

### 4.2 Deterministic Output

Synced JSON must satisfy:
- Stable key order (sorted by field name or fixed order).
- 2-space indentation.
- Trailing newline.

### 4.3 Gap and Conflict Handling

| Scenario | Handling |
|---|---|
| Markdown field cannot be parsed | Output Gap; write field as `null` |
| Missing `owner` | Output Gap; write field as `null` |
| Missing `due_date` | Output Gap; write field as `null` |
| Missing `status` | Output Gap; write field as `null` |
| Missing `source` | Output Gap; write field as `null` |
| Markdown/JSON value mismatch | Output `Conflict: sync-conflict`; Markdown takes precedence |

### 4.4 Unapproved PU Prohibition

When a Pending Update status is `Proposed`, it must not be written to `Approved` or `Applied` JSON state. Must wait for Project Owner approval before syncing.

---

## 5. Schema Validation Relationship

After syncing, `scripts/sync-data.js` must call or equivalently execute `scripts/validate-data.js`.
Only JSON that passes schema checks may be written to disk.
Schema check failure triggers fail-closed (exit non-0).

---

## 6. Audit Script Contract

`scripts/audit-data-consistency.js` must satisfy:

1. **No file modification**: reads files and outputs audit results only.
2. **stdout summary fields**: must include `checked_files`, `critical_count`, `major_count`, `minor_count`, `result`.
3. **Exit codes**: exit non-0 on Critical or Major issues; exit 0 when clean.

---

## 7. Fail-Closed Rules

`sync-data.js` must exit non-0 when:
- Required Markdown source file does not exist.
- Target JSON directory is not writable.
- `scripts/validate-data.js` validation fails.
- Schema file does not exist.

`audit-data-consistency.js` must exit non-0 when:
- Critical or Major audit issue found.
- Any JSON file fails schema validation.

---

## 8. P0 Scope Statement

- **P0 does not require database**: all data stored in Markdown and JSON files.
- **P0 does not require API**: Skill reads filesystem directly.
- **P0 does not require background sync**: sync triggered by AI Agent on each session.
- **P0 does not require Watchdog**: no background listeners or scheduled tasks.
- **P0 does not require auto commit/push**: Git operations executed manually by user.
