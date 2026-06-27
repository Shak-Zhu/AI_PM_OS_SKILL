# Conflict and Chaos Rules — 冲突、缺失、命名混乱与脏工作树治理

本文档定义当输入材料矛盾、关键信息缺失、ID/命名混乱、Git 工作树脏
或 Markdown/JSON 出现治理冲突时，`ai-pm-os` 必须遵循的识别、升级和
恢复规则。本文档与 `stability-rules.md`（现有冲突/脏工作树/不可读输
入基础）、`execution-integrity.md`（执行状态机）和 `fact-layers.md`
（事实层级权威）共同构成完整的混乱处理层。删除或弱化视为破坏内核。

---

## 1. 四类冲突分类与处理

### 1.1 冲突分类定义

  # | 冲突类型 | 识别信号 | 输出对象 | 失败升级 |
 ---|---|---|---|---|
| **C-01** | **同一对象状态冲突** | 同一 ID（如 REQ-###、ACT-###）在两份材料中出现不同状态（Draft vs Approved） | `PM_GAP_ANALYSIS.md` → `GAP-CFL-###` | `Escalation: state-conflict` |
| **C-02** | **范围 / 需求冲突** | Backlog 条目（BL-###）关联 REQ-### 但 REQ-### 不在 Approved Scope Baseline；或同一 REQ 有两个矛盾描述 | `PM_GAP_ANALYSIS.md` → `GAP-CFL-###` + `PM_PENDING_UPDATES.md` → `PU-CHG-###` | `Escalation: scope-conflict` |
| **C-03** | **审批状态冲突** | 同一 PU 在 `PM_PENDING_UPDATES.md` 中状态为 `Approved`，但 Human Owner 声称"没有批准过" | `PM_GAP_ANALYSIS.md` → `GAP-CFL-###` + `PM_RAID_LOG.md` → `R-YYYY-###` | `Escalation: approval-conflict` |
| **C-04** | **Markdown / JSON 事实冲突** | 同一字段在 Markdown（权威源）和 JSON（同步层）中值不一致；或 Markdown 存在但 JSON 较新 | 写入 `PM_GAP_ANALYSIS.md` → `GAP-SYN-###`；以 Markdown 为准同步 JSON | `Escalation: sync-conflict` |

### 1.2 冲突处理通用规则

**识别信号**：任何冲突必须同时满足（1）同一对象两处描述不一致；（2）两处均有可识别 ID 或路径。

**允许动作**：
- 进入对应 Gap（如 `GAP-CFL-###`）
- 写入 Pending Update（如 `PU-CHG-###`）
- 写入 RAID 条目（如 `R-YYYY-###`）
- 输出 `Conflict: <type>` 和 `Escalation: <type>`
- 请求 Human Owner 裁定

**禁止动作**：
- 不得自动合并为单一事实（两方均保留，注明冲突）
- 不得静默选择其中一方继续执行
- 不得用 JSON 反向覆盖 Markdown
- 不得将冲突条目写入 Approved Baseline
- 不得输出 `issued` / `accepted` / `complete` / `done`

**输出对象**：写入 `PM_GAP_ANALYSIS.md`，Gap 编号格式 `GAP-CFL-###`。

**失败升级路径**：
- C-01/C-03：升级到 `Escalation: state-conflict` 或 `Escalation: approval-conflict`
- C-02：进入 `Conflict: scope-conflict`，请求 Scope 变更 PU
- C-04：进入 `Conflict: sync-conflict`，以 Markdown 为准同步 JSON

### 1.3 状态机集成

冲突场景不得进入 `reported` 成功终态。必须进入以下阻断状态之一：

- `preflight_blocked`：preflight 检测到冲突后
- `conflict_detected`：冲突分类完成后
- `recovery_required`：冲突需要 Human Owner 介入时

---

## 2. 缺失信息处理规则

### 2.1 六类缺失定义

  # | 缺失类型 | 识别信号 | 允许动作 | 禁止动作 | 输出对象 |
 ---|---|---|---|---|---|
| **M-01** | **缺 Owner** | Action/Decision 条目无 `owner` 字段或字段为空 | 写入 `PM_GAP_ANALYSIS.md` → `GAP-OWN-###` | 不得自动分配 owner；不得将无 owner 条目写成 Approved | `PM_GAP_ANALYSIS.md` |
| **M-02** | **缺 Due Date** | 任意 Action / Milestone 无 `due_date` 或值不符合 ISO 8601 | 写入 `PM_GAP_ANALYSIS.md` → `GAP-DUE-###` | 不得猜测日期；不得将无日期条目写入 Approved | `PM_GAP_ANALYSIS.md` |
| **M-03** | **缺来源** | 任意 L3 推断无 `source:` 标注或来源为"对话记忆"/"模型推断" | 标注 `source: Unknown`；写入 Gap | 不得将无来源推断写成 L1 Approved | `PM_GAP_ANALYSIS.md` |
| **M-04** | **缺审批** | PU 状态为 `Proposed`，Skill 检测到用户以"直接写入"绕过审批 | 输出 `Escalation: approval-required`；写入 `PM_GAP_ANALYSIS.md` | 不得绕过 PU 审批流程；不得写入 Approved Baseline | `PM_GAP_ANALYSIS.md` + `PM_RAID_LOG.md` |
| **M-05** | **缺验收标准** | Story 条目（US-###）无 Acceptance Criteria 列表 | 写入 `PM_GAP_ANALYSIS.md` → `GAP-DOR-###`（DoR 未满足） | 不得将无 AC 条目标记为 committed 进入 Sprint | `PM_GAP_ANALYSIS.md` |
| **M-06** | **缺文件或不可读输入** | 文件不存在；或文件存在但内容无法解析（编码错误、空文件、二进制） | 记录 Input Log 状态 `received-but-unreadable`；写入 `PM_GAP_ANALYSIS.md` | 不得基于不可读输入生成任何事实/Decision/Action | `PM_INPUT_LOG.md`（状态：`received-but-unreadable`）+ `PM_GAP_ANALYSIS.md` |

### 2.2 缺失处理通用规则

**不得编造**：任何 M-01~M-05 缺失，Skill 不得猜测缺失值并写入正式文件。

**Gap 优先**：缺失条目写入 `PM_GAP_ANALYSIS.md`，Gap 编号格式 `GAP-<TYPE>-###`。

**来源标注**：无法核实时必须标注 `source: Unknown`，不得留空。

**升级路径**：M-01~M-05 持续未关闭时，不得将对应条目写入 Approved Baseline；M-06 立即写入 `received-but-unreadable`，请求用户提供可读副本。

---

## 3. 混乱命名治理

### 3.1 五类命名违规定义

  # | 违规类型 | 识别信号 | 允许动作 | 禁止动作 | 输出对象 |
 ---|---|---|---|---|---|
| **N-01** | **非法 ID 前缀** | ID 不符合 `AI_NAMING_CONVENTIONS.md` 规范前缀（如 `REQ-`/`ACT-`/`PU-` 等） | 记录 `Gap: naming-violation`；提示修复建议 | 不得静默改写 Approved Baseline ID；不得用别名覆盖原 ID | `PM_GAP_ANALYSIS.md` |
| **N-02** | **重复 ID** | 同一 ID 在两个不同位置出现（含 `01_PM_DOCUMENTS/`、`00_PM_MEMORY/`、`07_DATA/`） | 进入 `Conflict: duplicate-id` | 不得自动删除或合并重复 ID 条目 | `PM_GAP_ANALYSIS.md` → `GAP-NAM-###` |
| **N-03** | **同对象多 ID** | 同一对象（如同一个需求）被分配了两个不同 ID | 进入 `Conflict: multi-id-for-same-object`；列出两个 ID 供 Human Owner 裁定 | 不得自动合并两个 ID 为一个 | `PM_GAP_ANALYSIS.md` |
| **N-04** | **日期 / 文件名不符合规范** | 文件名含非 ISO 8601 日期格式；或路径包含 Windows/macOS/Linux 特有字符 | 提示规范化建议；写入 Gap | 不得静默改写文件名；不得在跨平台不安全路径上写入 | `PM_GAP_ANALYSIS.md` |
| **N-05** | **路径写死或跨平台不安全** | 硬编码绝对路径（如 `<WINDOWS_ABSOLUTE_PATH_EXAMPLE>`、`<UNIX_ABSOLUTE_PATH_EXAMPLE>`）；或路径含平台特有字符 | 提示用相对路径替代；写入 Gap | 不得在跨平台不安全路径上执行写入 | `PM_GAP_ANALYSIS.md` |

### 3.2 重复 ID 强制升级

检测到重复 ID（N-02）时，Skill 必须：
1. 进入 `Conflict: duplicate-id`
2. 写入 `PM_GAP_ANALYSIS.md` → `GAP-NAM-###`
3. 列出两个冲突位置（文件路径 + 行号）
4. 拒绝基于任一条目继续执行正式工作流
5. 不得静默删除任一条目

### 3.3 命名治理与 Approved Baseline

禁止通过命名治理静默改写 Approved Baseline。任何 ID 更名必须通过 PU 流程。

---

## 4. 脏工作树治理

### 4.1 脏工作树分类

  # | 类型 | 识别信号 | 允许动作 | 禁止动作 | 状态 |
 ---|---|---|---|---|---|
| **D-01** | **工作树脏但无冲突** | `git status --short` 显示 `M`/`??`/`!!` 但不涉及目标文件 | 只读分析；记录 `Risk: dirty-worktree` | 不得自动 `git stash/reset/clean/checkout` | 继续只读 |
| **D-02** | **工作树脏且冲突** | 目标文件在 `git status --short` 中为 `UU`/`AA`/`DD` 冲突标记 | 停止写入；进入 `Conflict: worktree` | 不得继续写入；不得自动解决冲突 | `preflight_blocked` |
| **D-03** | **未跟踪文件存在** | `git status --short` 显示 `??` 文件在 Skill 目标目录内 | 提示用户审查；继续只读 | 不得自动 `git add`；不得自动删除未跟踪文件 | 继续只读 |
| **D-04** | **目标文件已删除** | 目标文件在文件系统中不存在（被用户删除） | 进入 `Escalation: target-deleted` | 不得自动创建被删除的文件 | `preflight_blocked` |
| **D-05** | **无 Git 仓库** | 当前目录不是 Git 仓库（无 `.git/`） | 仅允许只读模式；写入前必须建立 Git 仓库 | 不得在无 Git 仓库时执行写入正式文件 | `preflight_blocked`（写入时） |

### 4.2 脏工作树 Preflight 协议

在执行任何写入前，Skill 必须执行 preflight：

1. 执行 `git status --short`（仅在 Git 仓库存在时）
2. 检查目标文件是否在 `M`/`UU`/`AA`/`DD`/`D` 列表中
3. 若涉及目标文件：停止写入，进入 `preflight_blocked`
4. 若不涉及目标文件：记录 `Risk: dirty-worktree`，继续只读

### 4.3 禁止自动 Git 操作

以下操作在任何情况下均不得由 Skill 自动执行：

- `git stash` / `git stash pop`
- `git reset`（含 `--soft`/`--hard`/`--mixed`）
- `git clean`
- `git checkout`（覆盖工作树）
- `git commit`
- `git push`

违反上述任一禁止动作视为**严重安全违规**。

### 4.4 状态机集成

脏工作树写入阻断必须进入 `preflight_blocked` 状态，不得进入 `reported` 成功终态。

---

## 5. Markdown / JSON 冲突策略

### 5.1 权威方向

- **Markdown 是权威源**（`01_PM_DOCUMENTS/`、`00_PM_MEMORY/` 下所有 `.md` 文件）
- **JSON 是同步可视化层**（`07_DATA/*.json`），无独立权威地位

### 5.2 三种场景处理

  场景 | Skill 行为 | 禁止动作 |
 ---|---|---|
| JSON 较旧，Markdown 已更新 | 以 Markdown 为准，同步更新 JSON | 不得反向用 JSON 覆盖 Markdown |
| JSON 较新，Markdown 存在 | 以 Markdown 为准，忽略 JSON 的较新时间戳；将 JSON 同步为 Markdown 的值 | 不得用 JSON 的较新值覆盖 Markdown；不得将 Markdown 降级 |
| JSON 存在，Markdown 缺失 | 进入 `Conflict: json-without-markdown`；写入 `PM_GAP_ANALYSIS.md` → `GAP-SYN-###` | 不得自动从 JSON 重建 Markdown；不得将 JSON 值升为 Markdown 事实 |

### 5.3 冲突升级

JSON 较新但 Markdown 缺失时：
1. 进入 `Conflict: json-without-markdown`
2. 写入 `PM_GAP_ANALYSIS.md` → `GAP-SYN-###`
3. 请求 Human Owner 提供 Markdown 源文件
4. 在提供前不得将 JSON 值作为正式事实

### 5.4 与 Approved Baseline 的关系

JSON 不得覆盖 Approved Baseline 中任何 Markdown 值。即使 JSON 较新，也必须以 Approved Markdown 为准，同步层仅用于仪表板可视化。

---

## 6. 与 WP-005 执行状态机的集成

### 6.1 阻断状态

所有冲突/缺失/命名混乱/脏工作树场景必须进入以下明确阻断状态之一：

  状态 | 触发条件 | 允许的下一转移 |
 ---|---|---|
| `preflight_blocked` | preflight 检测到冲突或目标缺失 | `conflict_detected` / `recovery_required` |
| `conflict_detected` | 冲突分类完成，Human Owner 尚未裁定 | `escalated` / `resolved` |
| `recovery_required` | 冲突需要 Human Owner 介入 | `resolved` / `escalated` |

**禁止进入**：以上三种状态均**不得**转移到 `reported` 成功终态。

### 6.2 已定义的阻断状态

`execution-integrity.md` 中已定义的阻断状态：
- `pending_review`
- `preflight_failed`
- `writes_started`
- `partial_failure`
- `recovery_required`
- `conflict_detected`

本规则文档新增：
- `preflight_blocked`：preflight 阶段阻断（脏工作树/目标缺失）
- `conflict_detected`：冲突分类完成（扩充）
- `naming_violation`：命名违规（新增）

完整 Gate 结果状态定义（6 种）见 `command-and-approval-rules.md` §2：gate_passed、gate_failed、approval_required、blocked_by_conflict、blocked_by_dirty_worktree、unrouted_intent。

---

## 7. 验收场景覆盖要求

本文件定义的规则在 `scenarios/scenarios.md` 中有对应场景：

  场景 ID | 覆盖的规则 |
 ---|---|
| SC-STB-01 | C-01 同一对象状态冲突（重复 transcript） |
| SC-STB-02 | C-02 范围/需求冲突（REQ 矛盾描述） |
| SC-STB-04 | D-01/D-02 脏工作树 + 原子 PU 应用 |
| SC-STB-05 | M-06 缺文件/不可读输入 |
| SC-STB-06 | C-04 Markdown/JSON 事实冲突 |
| SC-STB-07 | C-01 同一对象状态冲突（重复初始化） |
| SC-EI-09 | C-01 事实冲突（六字段冲突重复） |
| WP-006 新增场景 61-70 | C-01~C-04、M-01~M-06、N-01~N-05、D-01~D-05 全面覆盖 |

---

## 8. 语义不变量（SI-21 ~ SI-26）

以下 6 条语义不变量由 `scripts/validate-skill.js` 自动检查：

  # | 不变量 | 验证规则 |
 ---|---|---|
| **SI-21** | 四类冲突分类完整性 | `conflict-and-chaos-rules.md` §1 定义恰好 4 类冲突（C-01~C-04）；每类含识别信号/允许动作/禁止动作/输出对象/升级路径；删除任一类后验证器退出非 0 |
| **SI-22** | 六类缺失信息覆盖 | §2 定义恰好 6 类缺失（M-01~M-06）；每类含识别信号/允许动作/禁止动作；缺 Owner/Due Date/来源/审批/验收标准/文件不得升级为 Approved |
| **SI-23** | 命名治理覆盖 | §3 定义 5 类命名违规（N-01~N-05）；重复 ID 触发 Conflict 或 Issue；禁止静默改写 Approved Baseline |
| **SI-24** | 脏工作树禁止动作 | §4 明确禁止自动 `stash/reset/clean/checkout/commit/push`；脏工作树写入阻断进入 `preflight_blocked` |
| **SI-25** | Markdown 权威方向 | §5 明确 Markdown 优先；JSON 仅作同步层；JSON 较新但 Markdown 缺失时进入 Gap/Conflict；禁止用 JSON 覆盖 Approved Baseline |
| **SI-26** | 场景数量 | `scenarios/scenarios.md` 恰好包含 80 个场景（60 原 + 10 WP-006 新增 + 10 WP-007 新增）；标题编号 `## 1` 到 `## 80` 连续无重复无缺失 |
