# Memory and Recovery — 六层 Memory 权威层级与跨会话恢复协议

本文档定义 `ai-pm-os` 的六层信息权威层级、Memory Boot 顺序、
Active Context 数据契约、冲突优先级、跨会话恢复协议与机器可验证
语义不变量。删除或弱化本文档视为破坏内核。

---

## 1. 六层信息源权威层级

### 1.1 层级定义

| 层级 | 名称 | 用途 | 读写权限 | 落盘位置 | 优先级 |
|---|---|---|---|---|---|
| **L1** | **Approved Baseline** | 正式项目基线；经 Project Owner 批准 | 只读；不得覆盖 | `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md`、`PM_REQUIREMENTS_REGISTER.md`、`PM_WBS_PLAN.md` 等 | **最高** |
| **L2** | **Formal Markdown Hot Memory** | 当前项目状态快照；经 Skill 正式写入 | Skill 读写；不得直接覆盖 L1 | `00_PM_MEMORY/PM_CURRENT_STATUS.md`、`PM_APPROVAL_STATUS.md`、`PM_DOCUMENT_REGISTRY.md` 等 | **次高** |
| **L3** | **Approved Pending Update 记录** | 已批准但尚未应用的变更 | Skill 读取；执行后转为 L1/L2 | `00_PM_MEMORY/PM_PENDING_UPDATES.md` | 中 |
| **L4** | **Active Context** | 当前会话运行上下文；非持久化状态 | Skill 读写；会话结束清空；不得覆盖 L1/L2/L3 | `00_PM_MEMORY/PM_ACTIVE_CONTEXT.md` | 低 |
| **L5** | **Pending / Gap** | 待确认事项、缺口追踪 | Skill 读写；批准后升入 L1/L2 | `00_PM_MEMORY/PM_PENDING_UPDATES.md`、`PM_GAP_ANALYSIS.md` | 低 |
| **L6** | **Git Evidence** | 历史状态证据；不可直接写入 | 只读 Git 历史 | `.git/` | 参考 |

### 1.2 冲突优先级

```
Approved Baseline (L1) > Formal Markdown Hot Memory (L2) >
Approved Pending Update 记录 (L3) > Active Context (L4) >
Pending/Gap (L5) > Git Evidence (L6) > 对话记忆/模型推断
```

**核心禁止**：Active Context（L4）不得覆盖 Approved Baseline（L1）或 Formal
Markdown Hot Memory（L2）。Active Context 的所有写入在 L1/L2 面前均为临时
会话状态，不得成为正式决策依据。

### 1.3 禁止覆盖规则

- **禁止 Active Context 覆盖 Approved Baseline**：Skill 不得将 Active Context
  中的未批准值写入 `01_PM_DOCUMENTS/` 下任何文件；任何正式变更必须先进入
  `PM_PENDING_UPDATES.md` 并获批。
- **禁止对话记忆替代项目文件**：Skill 不得依赖聊天窗口残留记忆恢复项目
  状态；所有状态恢复必须来自 `00_PM_MEMORY/` 和 `01_PM_DOCUMENTS/` 的
  正式文件。
- **禁止用 Active Context 自动批准**：Active Context 不得含 `Approved` 状态
  字段；批准必须来自 `PM_PENDING_UPDATES.md` 的显式批准记录。

---

## 2. Memory Boot 清单与读取顺序

### 2.1 最小必要 Memory Boot（Required；合计 9 个：Global Rules 层 3 个 + PM Memory 层 6 个）

每次启动或恢复时，Skill 必须按以下**严格顺序**读取：

**Global Rules 层（先于一切）**：

1. `_AI_GLOBAL_MEMORY/AI_SKILL_OPERATING_RULES.md` — Skill 执行循环与全局规则
2. `_AI_GLOBAL_MEMORY/AI_USER_PREFERENCES.md` — 用户偏好与语言设置
3. `_AI_GLOBAL_MEMORY/AI_NAMING_CONVENTIONS.md` — 命名规范与 ID 生成规则

**Project Memory 层**：

4. `00_PM_MEMORY/PM_MEMORY_INDEX.md` — 项目 Memory 索引与文档清单
5. `00_PM_MEMORY/PM_CURRENT_STATUS.md` — Hot Memory 状态快照
6. `00_PM_MEMORY/PM_APPROVAL_STATUS.md` — 审批状态追踪
7. `00_PM_MEMORY/PM_DOCUMENT_REGISTRY.md` — 文档注册表
8. `00_PM_MEMORY/PM_INPUT_LOG.md` — 输入材料日志
9. `00_PM_MEMORY/PM_ACTIVE_CONTEXT.md` — Active Context（会话状态）

**Conditional 文件（按需读取）**：

- `PM_PENDING_UPDATES.md` — 存在 Pending Update 时读取
- `PM_GAP_ANALYSIS.md` — 存在未关闭 Gap 时读取
- `PM_RAID_LOG.md` — 存在 RAID 条目时读取
- `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md` — 需要范围基线时读取

### 2.2 读取规则

- **不得默认全文读取全部历史文件**：Skill 只读取本次执行所需的 Required
  和 Conditional 文件。
- **缺失 Required 文件处理**：任一 Required 文件缺失时，Skill 必须停止执行，
  输出 `Escalation: memory-boot-failure`，在 `PM_GAP_ANALYSIS.md` 写入
  `GAP-MEM-###`，**不得**猜测状态并继续正式写入。
- **Conditional 文件缺失**：可继续，但必须在恢复输出中标记为 Unknown。
- **损坏文件处理**：文件存在但内容无法解析时，标记为 `corrupted`，从 L1/L2
  重建 Active Context。

### 2.3 与 AGENTS.md、SKILL.md、全局规则的顺序一致性

本节定义的读取顺序（`REQUIRED_MEMORY_BOOT_FILES`）与以下文件保持一致：

- `AGENTS.md` §启动顺序：Global Rules（3 文件）→ PM Memory（6 文件），顺序与 §2.1 完全一致
- `ai-pm-os/SKILL.md` §3 执行循环：Memory Boot → Intent Routing
- `_AI_GLOBAL_MEMORY/AI_SKILL_OPERATING_RULES.md` §1 强制执行循环

**数量口径**：Global Rules 层 = 3 文件；PM Memory 层 = 6 文件；合计 9 个 Required 文件。

---

## 3. 恢复输出数据契约（5 字段 + 来源）

### 3.1 必须输出的 5 个状态字段

任何中断点恢复时，Skill **必须**输出以下 5 个状态字段，
且**每个字段必须指向来源文件**：

| # | 字段名 | 内容 | 来源文件 |
|---|---|---|---|
| 1 | **当前阶段** | 项目当前阶段（如 `ACTIVE`、`INITIALIZE_PROJECT`） | `00_PM_MEMORY/PM_CURRENT_STATUS.md` → `## 状态快照 > 当前阶段` |
| 2 | **Scope 状态与版本** | Scope Baseline 状态（Draft/Approved）+ 版本号 | `01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md` → 头部状态/版本字段 |
| 3 | **活动 WP/Sprint** | 当前活跃工作包编号 + Sprint 编号（如有） | `00_PM_MEMORY/PM_CURRENT_STATUS.md` → `## 状态快照 > 正式工作包/当前 Sprint` |
| 4 | **阻塞/待审批** | 待审批 Pending Update 数量 + 活跃 Blocked 条目数 | `00_PM_MEMORY/PM_PENDING_UPDATES.md` + `00_PM_MEMORY/PM_GAP_ANALYSIS.md` |
| 5 | **下一安全步骤** | 基于 L1/L2/L3 推断的最安全下一步工作流 | 综合 PM_CURRENT_STATUS.md + router.md §1 |

### 3.2 来源标注规则

- 每个恢复字段必须包含 `source: <文件路径>` 标注。
- 缺来源时必须标注 `source: Unknown`，不得猜测。
- 所有字段值必须来自正式项目文件（L1/L2），不得依赖对话记忆。

### 3.3 恢复格式示例

```
[Memory Recovery]
  1. 当前阶段: ACTIVE | source: 00_PM_MEMORY/PM_CURRENT_STATUS.md
  2. Scope 状态: Approved vX.Y | source: 01_PM_DOCUMENTS/PM_SCOPE_BASELINE.md
  3. 活动 WP: WP-### | Sprint: Sprint N | source: 00_PM_MEMORY/PM_CURRENT_STATUS.md
  4. 待审批 PU: 2 | Blocked: 1 | source: 00_PM_MEMORY/PM_PENDING_UPDATES.md
  5. 下一安全步骤: DASHBOARD_SYNC | source: 综合 router.md §1 + PM_CURRENT_STATUS.md
```

---

## 4. Active Context 数据契约

### 4.1 PM_ACTIVE_CONTEXT.md 规定字段

`00_PM_MEMORY/PM_ACTIVE_CONTEXT.md` 必须包含以下 **10 个规定字段**：

| # | 字段 | 用途 | 约束 |
|---|---|---|---|
| 1 | `current_intent` | 当前用户意图 | 仅作会话跟踪，不得作为正式决策依据 |
| 2 | `active_workflow` | 当前活跃工作流 | 来自 router.md §1 |
| 3 | `last_completed_step` | 上一步完成节点 | 来自 Skill 执行记录 |
| 4 | `next_safe_step` | 预判下一安全步骤 | 来自 router.md + PM_CURRENT_STATUS.md |
| 5 | `pending_writes` | 待写入的正式文件清单 | 会话级追踪，会话结束清空 |
| 6 | `pending_approvals` | 等待批准中的 PU 编号 | 来自 PM_PENDING_UPDATES.md |
| 7 | `dirty_worktree` | Git 工作树状态 | `clean` 或 `dirty`，来自 `git status` |
| 8 | `last_error` | 上次执行的错误信息 | 无错误时为 `null` |
| 9 | `source_files` | 本次会话已读取的文件清单 | 记录来源，不得替代正式文件 |
| 10 | `updated_at` | 最后更新时间戳 | ISO 8601 格式 |

**禁止写入本项目真实事实**：Active Context 模板仅含占位符；实际运行时
由 Skill 填充当前会话状态，但**不得**写入真实项目名称、WP 编号、日期、
路径等本开发项目的事实。

### 4.2 生命周期

```
创建/刷新 → Checkpoint（正式写入前）→ 写入/更新 → 完成/清空
```

1. **开始任务时创建/刷新**：启动新工作流时，创建或刷新 Active Context。
2. **正式写入前 checkpoint**：将 pending_writes 和 dirty_worktree 状态固化。
3. **写入后更新**：Skill 成功写入正式文件后，同步更新 `pending_writes`。
4. **完成后清空**：工作流正常结束时，清空 pending_writes、last_error、
   pending_approvals（已处理项）；保留 current_intent 供下一步参考。
5. **过期/损坏时重建**：Active Context 损坏或过期超过 1 小时，从 L1/L2
   正式文件重建，不得从对话记忆补全。

---

## 5. 中断类型与恢复决策

### 5.1 六类中断恢复

| # | 中断类型 | preflight 检查 | 允许动作 | 禁止动作 | 下一安全步骤 | 证据 |
|---|---|---|---|---|---|---|
| 1 | **写入前中断** | 检查 pending_writes 是否已写入 | 重读 Active Context，恢复 pending_writes | 不得重新猜测 pending_writes | 从 pending_writes 第一项继续 | `PM_ACTIVE_CONTEXT.md > pending_writes` |
| 2 | **写入中部分失败** | 检查已写入部分 vs 目标文件 | 记录已写入文件名；标记冲突 | 不得继续写入；不得覆盖已写入文件 | 输出冲突报告；等待用户确认是否回滚 | `PM_RAID_LOG.md` + `PM_GAP_ANALYSIS.md` |
| 3 | **写入后未同步** | 检查 JSON vs Markdown 一致性 | 以 Markdown 为权威源，同步 JSON | 不得反向覆盖 Markdown | 执行 DASHBOARD_SYNC | `07_DATA/*.json` vs `00_PM_MEMORY/*.md` |
| 4 | **审批等待中断** | 检查 pending_approvals 状态 | 等待用户批准；不自动批准 | 不得用 Active Context 自动批准 | 维持当前工作流；等待 PM_APPROVAL_STATUS.md 更新 | `PM_PENDING_UPDATES.md > pending_approvals` |
| 5 | **脏工作树中断** | 检查 git status | 记录 dirty 文件列表；拒绝写入冲突文件 | 不得自动 git stash/commit/push | 输出 Risk: dirty-worktree；建议用户清理 | `git status --short` |
| 6 | **上下文压缩/新会话** | 读取 PM_CURRENT_STATUS.md + Memory Boot | 重建 Active Context；从 L1/L2 恢复 5 字段 | 不得依赖对话残留记忆 | 按 5 字段选择正确下一工作流 | `PM_CURRENT_STATUS.md` + 6 层信息源 |

### 5.2 幂等与副作用边界

- **preflight 先于决策**：任何恢复前必须先检查 Active Context、Git 状态、
  Pending Updates。
- **resume / restart / escalate 三选一**：
  - `resume`：pending_writes 存在且目标文件未冲突 → 从断点继续。
  - `restart`：pending_writes 损坏或无法重建 → 从头开始该工作流。
  - `escalate`：L1/L2 状态无法恢复 → 停止，写入 `PM_GAP_ANALYSIS.md`。
- **禁止重复 ID**：恢复时必须先扫描 ID 池，不得重复生成。
- **禁止重复应用 PU**：恢复时检查 PU 应用记录，不重复应用。
- **禁止自动 commit/push**：恢复后必须等待用户显式 commit。

---

## 6. 语义不变量（SI-09 ~ SI-13，机器可验证）

以下 5 条语义不变量由 `scripts/validate-skill.js` 自动检查：

| # | 不变量 | 验证规则 |
|---|---|---|
| **SI-09** | Memory Boot 顺序 | `memory-and-recovery.md` 存在；包含 `REQUIRED_MEMORY_BOOT_FILES` 定义的 9 个文件（含 3 Global + 6 PM Memory 口径）；AGENTS.md 逐项按序匹配；`AGENTS.md`、`SKILL.md`、全局规则与 canonical 清单一致 |
| **SI-10** | 恢复 5 字段来源 | `memory-and-recovery.md` §3 明确定义 5 个恢复字段；每个字段包含 `source:` 标注；缺来源时标注 `Unknown` |
| **SI-11** | Active Context 不覆盖 Baseline | `memory-and-recovery.md` §1.3 包含显式禁止 Active Context 覆盖 L1/L2 的规则；`PM_ACTIVE_CONTEXT.md` 模板不含 `Approved` 状态字段 |
| **SI-12** | 部分失败恢复规则 | `memory-and-recovery.md` §5.1 定义写入中部分失败的 preflight、禁止动作和下一安全步骤；包含 `PM_GAP_ANALYSIS.md` 作为恢复证据 |
| **SI-13** | 缺失 Required 文件 fail-safe | `memory-and-recovery.md` §2.2 定义 Required 文件缺失时 Skill 停止、输出 `Escalation: memory-boot-failure`、写入 Gap，不得猜测继续 |

---

## 7. 与场景的对应

本文件定义的规则在 `scenarios/scenarios.md` 中有对应场景：

| 场景 ID | 覆盖的中断/恢复场景 |
|---|---|
| SC-STB-03 | 中断恢复（5 字段恢复） |
| SC-STB-04 | 脏工作树中断 |
| SC-STB-05 | 不可读输入 |
| SC-STB-06 | 写入后未同步（Markdown/JSON 冲突） |
| SC-MEM-01 | 新会话 Memory Boot |
| SC-MEM-02 | 上下文压缩后恢复 |
| SC-MEM-03 | 缺 Required Memory 文件 |
| SC-MEM-04 | 损坏 Active Context 重建 |
| SC-MEM-05 | 过期上下文冲突 |
| SC-MEM-06 | 写入前中断 |
| SC-MEM-07 | 写入中部分失败 |
| SC-MEM-08 | 审批等待恢复 |

---

## 8. 与验证脚本的对应

`scripts/validate-skill.js` 对本文档执行：

1. 文件存在性检查（memory-and-recovery.md 必须存在）。
2. 六层信息源完整性检查（§1）。
3. Memory Boot 清单与顺序检查（§2）。
4. 5 字段来源标注检查（§3）。
5. Active Context 生命周期检查（§4）。
6. 六类中断恢复定义检查（§5）。
7. 语义不变量 SI-09~SI-13 检查（§6）。
8. 前置门禁与审批状态机引用（WP-007：`command-and-approval-rules.md` §2~§4）
