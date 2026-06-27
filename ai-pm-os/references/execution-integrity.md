# Execution Integrity — 幂等执行、重放、检查点与部分失败恢复

本文档定义 `ai-pm-os` 的执行身份模型、状态机、四类重入判定、幂等性规则、at-most-once Pending Update 应用语义、部分失败恢复协议和 Markdown/JSON 恢复方向。删除或弱化本文档视为破坏内核。

---

## 0. 执行身份模型

### 0.1 六字段结构

每次执行必须携带以下六字段作为执行唯一标识。同一操作判定必须基于这六字段的组合，任何两者的执行标识在六字段完全匹配时视为同一操作的重复到达。

| # | 字段名 | 用途 | 来源 | 比较规则 |
|---|---|---|---|---|
| **1** | `execution_id` | 本次执行的唯一流水号 | 按 ID 生成规则从 ID 池分配 | 必须唯一；重复到达使用同一 ID |
| **2** | `intent_type` | 操作意图类型 | 用户消息意图关键词路由 | 必须精确匹配（不等于自然语言相似度） |
| **3** | `source_fingerprint` | 输入材料的内容指纹 | 输入材料经 SHA-256 计算（不得仅用时间戳、随机数或 session ID） | 必须精确匹配 |
| **4** | `target_set` | 本次操作涉及的目标文件集合 | 执行前 preflight 确定 | 必须精确匹配（集合相等） |
| **5** | `approval_binding` | 批准绑定的不可变内容指纹 | 批准时记录PU的内容 SHA-256 | 内容变化时指纹不同 |
| **6** | `last_durable_checkpoint` | 最后可信检查点 | 成功写入后固化 | 用于恢复定位 |

**禁止**：
- 不得仅凭自然语言相似度（如"看起来是同一个请求"）认定重复。
- `target_set` 必须精确匹配；"foo 和 foo/" 视为同一目标（路径规范化后比较）。

### 0.2 同一操作判定规则

两执行 E1 和 E2 为同一操作，当且仅当：

```
E1.intent_type === E2.intent_type
AND E1.source_fingerprint === E2.source_fingerprint
AND E1.target_set === E2.target_set
AND E1.approval_binding === E2.approval_binding
```

---

## 1. 执行状态机

### 1.1 七状态定义

| 状态 | 含义 | 进入条件 | 允许转换 |
|---|---|---|---|
| `received` | 操作请求已接收 | 消息到达 | → `preflight_passed` |
| `preflight_passed` | 前置检查全部通过 | Required Files 存在、Baseline 正常、ACL 正常 | → `writes_started`；禁止 → `reported` |
| `writes_started` | 文件写入已开始 | 第一个文件写入操作发出 | → `writes_completed`；禁止 → `reported` |
| `writes_completed` | 所有目标文件写入完成 | 目标集合全部成功写入 | → `sync_completed` |
| `sync_completed` | JSON/Dashboard 同步完成 | Markdown 与 JSON 一致性校验通过 | → `reported` |
| `reported` | 执行结果已向用户报告 | 向用户输出正式报告 | **终态，禁止再跳转** |
| `recovery_required` | 需要从检查点恢复 | 写入中部分失败、写入后同步失败、中断恢复 | → `writes_started`（从检查点继续）或 → `reported`（以失败报告） |

### 1.2 禁止的转换

以下转换严格禁止：

- `writes_started` → `reported`（跳过了 `writes_completed` 和 `sync_completed`）
- `preflight_passed` → `reported`（跳过了所有写入和同步步骤）
- `received` → `reported`（跳过了 preflight 和写入）
- 任何非终态 → `reported` 再 → 任何其他状态（终态不可逆）

### 1.3 状态固化规则

- 每次状态转换必须更新 Active Context 的 `last_completed_step` 字段。
- `writes_started` 后，必须将 `pending_writes` 清单固化到 Active Context。
- `writes_completed` 后，必须将写入结果固化。
- `reported` 后，不得修改任何执行标识字段。

---

## 2. 四类重入判定

### 2.1 首次执行（First Execution）

**判定**：执行标识六字段全部为空或首次生成。

**动作**：
- 分配新的 `execution_id`
- 计算 `source_fingerprint`（SHA-256）
- 确定 `target_set`
- 正常执行 Pre-send Compliance Gate → 写入 → 同步

**证据**：`execution_id` 分配记录、首次 preflight 通过记录。

---

### 2.2 已成功操作的精确重放（Exact Replay）

**判定**：六字段全部精确匹配，且上一执行的最终状态为 `reported`。

**动作**：
- 返回既有结果的引用（`execution_id`、目标文件路径、报告时间）
- **不得**重复创建：PU、Action、Decision、报告、审批记录、JSON 条目
- 更新 `last_seen_at`，不创建新副本

**幂等性要求**：
- 同一 `execution_id` 不得生成两次
- 同一 `source_fingerprint` + `intent_type` 组合在上一 `reported` 后，不得生成第二份 PU
- 同一 `approval_binding` 的 PU 不得被应用两次
- 精确重放必须幂等：不得重复创建 PU、Action、Decision、报告、审批记录或 JSON 条目

**禁止**：不得通过"重复写入后去重"伪装幂等；重复判定必须在副作用发生前完成。

**证据**：`execution_id` 匹配记录、既有结果引用、`last_seen_at` 更新记录。

---

### 2.3 中断后恢复（Interrupted Resume）

**判定**：执行标识匹配，上一状态为 `writes_started`、`writes_completed` 或 `recovery_required`（非 `reported`）。

**动作**：
- 从 `last_durable_checkpoint` 恢复 `target_set` 已写/未写状态
- 识别 `pending_writes` 中未完成项
- 从未写目标继续执行（不重复写入已成功目标）
- 不重新分配 `execution_id`

**恢复协议**：
1. 读取 Active Context → 恢复 `pending_writes` 清单
2. 检查每个目标文件的存在性和内容哈希
3. 确定已写（内容匹配）和未写目标
4. 从 `pending_writes` 第一项继续

**证据**：检查点文件、已写目标列表、未写目标列表、`last_durable_checkpoint` 引用。

---

### 2.4 冲突重复（Conflicting Duplicate）

**判定**：六字段不完全匹配但意图相似，或 `approval_binding` 与历史记录冲突。

**动作**：
- 停止执行（不得自动合并）
- 输出 `Conflict: <type>`
- 写入 `PM_GAP_ANALYSIS.md`
- 请求 L1 澄清

**禁止**：
- 不得将相似输入自动合并为同一事实
- 不得静默选择其中之一继续执行
- 不得依赖自然语言相似度绕过冲突检测

**证据**：冲突类型、两份执行标识对比、冲突字段列表。

---

## 3. Pending Update at-most-once 应用语义

### 3.1 内容指纹绑定

每个 PU 的批准必须绑定到不可变内容指纹：

```
PU-<ID>:
  content_fingerprint: <SHA-256 of PU content at approval time>
  approved_at: <ISO 8601>
  approval_binding: <approval_binding from execution identity>
```

批准后，任何对 `content_fingerprint` 的修改都必须生成新的 PU（新的 `PU-<ID+1>`），旧 PU 状态保持 `Approved` 但不得再次应用。

### 3.2 at-most-once 规则

| 场景 | 正确行为 |
|---|---|
| 同一 `approval_binding` 的 PU 再次到达 | 拒绝应用；返回既有结果引用 |
| PU 内容修改后再次到达 | 生成新 PU 并重新审批 |
| PU 部分应用后中断 | 进入 `recovery_required`；从检查点继续或报告失败 |
| PU 批准后其他操作已修改了目标文件 | preflight 失败；不得静默部分应用 |

### 3.3 禁止静默部分应用

- **禁止**对部分目标文件应用 PU 而对其他目标跳过而不通知用户。
- preflight 失败任一目标 → 整个 PU 不应用。
- 若可拆分，生成新的独立 PU（编号不继承），原 PU 状态保持 `Approved`。

### 3.4 原子性不变量（SI-EI-01）

- **同一 PU 的 Apply 结果只有两种**：`全部应用` 或 `全部不应用`。
- 部分应用等同于静默部分应用（禁止）。
- 拆分出的新 PU 必须经独立审批才能应用。

---

## 4. 多文件写入与部分失败恢复

### 4.1 写入前协议

每次多文件写入操作前，必须执行以下步骤：

1. **确定 `target_set`**：列出所有目标文件
2. **执行 preflight**：检查每个目标文件是否可写、是否与脏工作树冲突、是否与 Approved Baseline 冲突
3. **固化检查点**：将 `target_set`、`preflight_result`、`last_durable_checkpoint` 写入 Active Context

### 4.2 写入中部分失败

当写入过程中部分目标失败（部分文件写入成功、部分失败）：

**立即进入** `recovery_required` 状态。

**必须记录以下五类证据**：

| # | 证据类型 | 内容 |
|---|---|---|
| **1** | `wrote_targets` | 已成功写入的目标文件列表（含文件路径、SHA-256） |
| **2** | `unwrote_targets` | 未写入/写入失败的目标文件列表（含失败原因） |
| **3** | `last_durable_checkpoint` | 最后可信检查点（成功写入的最后一个文件路径） |
| **4** | `next_safe_step` | 下一安全步骤（继续写入未写目标 / 回滚已写目标 / 请求用户确认） |
| **5** | `forbidden_actions` | 禁止动作（不得继续写入未写目标直至检查点确认；不得覆盖已写文件） |

### 4.3 禁止动作

部分失败时严格禁止：
- **禁止**继续写入未写目标（可能覆盖部分成功的状态）
- **禁止**报告 `complete` / `done` / `accepted`（整体未完成）
- **禁止**用未完成的写入结果作为最终报告
- **禁止**自动回滚已写文件（需用户确认）

### 4.4 恢复决策

从检查点恢复时，只能选择：

- **resume**：检查点之后继续写入（`pending_writes` 继续）
- **rollback**：用户确认后回滚已写文件（`recovery_required` → 显式回滚 → 报告失败）
- **escalate**：无法恢复（L1/L2 冲突）→ 写入 `PM_GAP_ANALYSIS.md` 并停止

---

## 5. Markdown 权威恢复方向

### 5.1 唯一合法恢复方向

当 Markdown 权威文件与 JSON/Dashboard 数据不一致时，修复方向只能是从 Markdown 向 JSON 修复：

```
Markdown（权威）→ JSON（同步层）
```

**禁止的反向操作**：

- 禁止用 JSON 反向覆盖 Markdown 权威源
- 禁止用 JSON 覆盖 Approved Baseline
- 禁止在 Markdown 与 JSON 冲突时，以"JSON 更新更及时"为由将 JSON 视为权威

### 5.2 恢复协议

1. 识别冲突字段（Markdown 中的值 vs JSON 中的值）
2. 以 Markdown 为权威源
3. 以 Markdown 值刷新对应 JSON 字段
4. 记录同步操作：`Sync: Markdown → JSON | field: <name> | from: <md_value> | at: <ISO 8601>`
5. 验证刷新后一致性

### 5.3 语义不变量（SI-EI-02）

- Markdown 成功而 JSON 同步失败时，恢复方向只能是 `Markdown → JSON`。
- 禁止 `JSON → Markdown` 方向。
- 禁止用 JSON 覆盖 Approved Baseline 中的任何值。

---

## 6. 可验证的后置条件

### 6.1 五类后置条件

每次执行（`reported` 之前）必须验证以下五类后置条件：

| # | 后置条件类型 | 验证内容 | 失败时动作 |
|---|---|---|---|
| **1** | 目标唯一性 | `target_set` 中无重复目标；每目标路径规范化后唯一 | 进入冲突检测 |
| **2** | 状态转换合法 | 当前状态 → 下一状态的转换在状态机允许列表中 | 禁止非法跳转 |
| **3** | 审批绑定一致 | `approval_binding` 与当前执行标识一致；未变更 | 生成新 PU |
| **4** | Markdown/JSON 关键字段一致 | 关键 ID/状态/版本/审批字段在 Markdown 与 JSON 中一致 | 执行 Markdown → JSON 修复 |
| **5** | 禁止重复副作用 | 执行标识六字段未在历史记录中产生过副作用 | 返回既有结果引用 |

### 6.2 后置条件未通过时的行为

- 任一后置条件未通过 → 不得进入 `reported` 状态。
- 必须输出具体的未通过项和原因。
- 若无法恢复，必须进入 `recovery_required` 并报告失败。

---

## 7. 与 Active Context 集成

### 7.1 执行中必须保存的恢复字段

执行过程中必须将以下字段写入 Active Context：

| # | 字段 | 用途 |
|---|---|---|
| 1 | `execution_id` | 恢复定位 |
| 2 | `current_state` | 当前状态机状态 |
| 3 | `target_set` | 目标文件集合 |
| 4 | `pending_writes` | 已写/未写目标状态 |
| 5 | `last_durable_checkpoint` | 最后可信检查点 |
| 6 | `preflight_result` | 前置检查结果 |
| 7 | `last_error` | 当前错误（如有） |

### 7.2 成功后清理

执行成功（`reported`）后：
- 清理 `pending_writes`（已无待处理项）
- 清理 `last_error`（置 null）
- 保留 `execution_id` 和 `target_set` 作为历史记录
- 保留结果证据（文件路径、SHA-256）供精确重放判定使用

### 7.3 过期/冲突上下文保护

- Active Context（L4）**不得**覆盖 L1（Approved Baseline）或 L2（Formal Markdown Hot Memory）中的任何事实。
- 过期上下文（L4 超过 1 小时未更新）必须从 L1/L2 重建，不得从对话记忆补全。
- 冲突上下文必须先解决冲突，再进入执行。

---

## 8. 语义不变量汇总

| ID | 名称 | 规则 |
|---|---|---|
| **SI-EI-01** | PU 原子应用 | 同一 PU 的 Apply 结果只有"全部应用"或"全部不应用"；部分应用禁止 |
| **SI-EI-02** | Markdown 权威方向 | Markdown 成功而 JSON 失败时，恢复方向只能是 `Markdown → JSON`；禁止 `JSON → Markdown` |
| **SI-EI-03** | 幂等重复判定 | 六字段全部精确匹配时为同一操作；禁止仅凭自然语言相似度判定 |
| **SI-EI-04** | 禁止静默部分应用 | 部分目标失败时必须进入 `recovery_required`；禁止报告整体成功 |
| **SI-EI-05** | 后置条件门控 | 五类后置条件必须全部通过才能进入 `reported` |

---

## 9. 与场景的对应

本文档定义的规则在 `scenarios/scenarios.md` 中有对应场景（编号 51~60）：

| 场景 ID | 覆盖的规则 |
|---|---|
| SC-EI-01 | 精确重放：六字段匹配时返回既有结果 |
| SC-EI-02 | 重复材料：source_fingerprint 相同但非同一次到达 |
| SC-EI-03 | 批准 PU 重放：approval_binding 相同，内容指纹未变 |
| SC-EI-04 | 内容变化后旧批准：指纹变化，新 PU 必须重新审批 |
| SC-EI-05 | 写入前失败：preflight 失败，状态停在 `preflight_passed` |
| SC-EI-06 | 单文件写入后失败：部分写入成功，进入 `recovery_required` |
| SC-EI-07 | Markdown 成功/JSON 失败：只能执行 `Markdown → JSON` 修复 |
| SC-EI-08 | 恢复再次中断：从新的检查点继续或回滚 |
| SC-EI-09 | 冲突重复：六字段不匹配但意图冲突，停止并升级 |
| SC-EI-10 | 成功后重复报告：六字段再次到达，返回既有结果引用 |

---

## 10. 与验证脚本的对应

`scripts/validate-skill.js` 对本文档执行：

1. 文件存在性检查（execution-integrity.md 必须存在）
2. 执行身份六字段定义完整性检查（§0）
3. 七状态状态机定义检查（§1）
4. 四类重入判定规则检查（§2）
5. at-least-once PU 应用语义检查（§3）
6. 部分失败五类证据完整性检查（§4）
7. Markdown → JSON 恢复方向检查（§5）
8. 五类后置条件门控检查（§6）
9. SI-EI-01~05 不变量检查（§8）
10. 前置门禁结果状态与状态机映射（WP-007：command-and-approval-rules.md §2~§8）
