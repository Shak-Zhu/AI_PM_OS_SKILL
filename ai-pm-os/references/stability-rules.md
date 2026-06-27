# Stability Rules — 稳定执行与混乱处理

`ai-pm-os` 必须在重复执行、冲突输入、中断恢复、脏工作树、不可读材料
等异常下保持稳定。本节定义规则；删除或弱化视为破坏内核。

## 1. 幂等执行

- **同输入同状态重复执行**不创建重复 ID、Action、Decision、PU、To-do。
- ID 必须经 `references/router.md` 的工作流统一生成：先扫 ID 池，再以
  "最大编号 + 1" 形式生成。
- 重复检测命中：保留旧记录，更新 `last_seen_at`；不新增副本。
- 同一 transcript 二次处理：必须返回 "already processed"，并引用首次
  处理的 Input ID。

## 2. 重复材料 / 冲突材料

- 同一原始文件 / 上传 / transcript 出现多次：以最新一份为准，旧版
  标记为 `superseded`，原 Input 记录引用关系不变。
- 两份材料对同一事实给出冲突字段：转入 `Conflict: <type>`，写入
  `PM_GAP_ANALYSIS.md`；**不**直接覆盖。
- 冲突类型至少包括：
  - 事实冲突（日期 / 负责人 / 状态字段不同）
  - 范围冲突（Scope / Sprint 边界不同）
  - 决策冲突（与 Decision Log 矛盾）
  - 进度冲突（与 Milestone / Schedule 不同）

## 3. 中断恢复

- 任何中断点恢复必须能输出至少 5 个项目状态字段：
  1. 当前阶段（`PM_CURRENT_STATUS.md`）
  2. Scope Baseline 状态与版本
  3. 活跃 WBS / 活动 WP 编号
  4. 待审批 Pending Updates 数量
  5. 当前 Sprint 编号与剩余 Point
- 依据这 5 字段匹配 `references/router.md` §1 的工作流并继续。
- 不允许"猜测上一个动作"——必须从文件恢复。

## 4. 脏 Git 工作树

- 脏工作树但非冲突：继续执行 Skill，但必须记录 `Risk: dirty-worktree`
  并在对话中提示用户先清理。
- 脏工作树且与即将写入的文件冲突：停止写入，转入 `Conflict: worktree`。
- **不得**自动 `git add` / `git commit` / `git push`（已写死的禁止行为）。

## 4b. 批准 PU 的原子应用

批准 PU 的应用是原子操作。**整个 PU 要么全部应用，要么全部不应用**。

### preflight 检查

在应用任何已批准 PU 之前，Skill 必须对 PU 中的**每一个目标文件**执行 preflight：

1. 目标文件是否与脏工作树冲突？
2. 目标文件是否与已批准 Baseline 冲突？
3. 目标文件是否与其他已批准 PU 冲突？

### 原子决策

| preflight 结果 | Skill 行为 |
|---|---|
| 全部通过 | 应用全部目标文件；完成后写 Git commit |
| 任一目标冲突 | **整个** PU 不应用；写 `Conflict: pu-atomic-conflict`；写新 PU 编号（从原 PU 拆分出可应用的部分） |
| 全部失败 | 整个 PU 不应用；输出 `Escalation: pu-cannot-apply` |

### 拆分执行

当一个 PU 包含多个目标文件且部分有冲突时：

1. **不得**对无冲突目标继续应用（禁止静默部分应用——见 Forbid）。
2. 写新的独立 PU（如 `PU-SPLIT-###`），只包含无冲突的可应用目标。
3. 新 PU 编号全新生成（不是原 PU 编号）。
4. 原 PU 状态保持 `Approved`（不变），新 PU 状态为 `Proposed`，需重新审批。

### 不变量（语义不变量）

- **S-INV-01**：同一 PU 的 Apply 结果只有两种：`全部应用`或`全部不应用`。
- **S-INV-02**：部分应用等同于静默部分应用（禁止）。
- **S-INV-03**：拆分出的新 PU 必须经独立审批才能应用。

### 禁止行为

- **禁止同一批准 PU 的静默部分应用**：Skill 不得在用户未察觉的情况下对部分目标文件应用 PU 而对其他目标跳过。
- **禁止在不通知的情况下拆分 PU**：任何拆分必须显式告知用户并请求新 PU 的审批。
- **禁止在 preflight 失败后继续写入**：一旦 preflight 检测到冲突，必须停止写入，不做部分写入。

### SC-STB-04 修正说明

`scenarios/scenarios.md` 中的 `SC-STB-04`（脏工作树）已被修正：

- 原版错误地允许"对未冲突部分正常应用"（静默部分应用）。
- 修正版：整个 PU 不应用；若可拆分，生成新 PU 并请求审批。

## 5. 未批变更

- 检测到任何绕过审批的变更尝试：
  1. 标记 `Risk: scope-creep-firewall-breach`；
  2. 写入 `PM_GAP_ANALYSIS.md`；
  3. 拒绝执行该变更。
- 任何被 Skill 拒绝的变更必须在对话中显式说明被拒原因、引用对应治理
  铁律（`AGENTS.md` 治理铁律第 N 条 + framework-matrix 的"不适用"列）。

## 6. 不可读输入

- 文件存在但内容无法解析（编码错误、二进制误传、空文件等）：
  - 记录 Input Log，状态 `received-but-unreadable`；
  - 拒绝基于此文件生成任何事实 / Decision / Action；
  - 写入 `PM_GAP_ANALYSIS.md`，请求用户提供可读副本。
- 不可读输入**不得**触发"系统猜测并继续"——必须停下升级。

## 7. Markdown / JSON 冲突

- 任一 JSON 字段与对应 Markdown 不一致时：以 Markdown 为权威源，刷新
  对应 JSON。
- 但若 Markdown 文件**本身**包含内部矛盾（如同时声明 Approved 和 Draft
  的同一文件）：进入 `Conflict: markdown-internal`，暂停自动修复。
- 不得反向用 JSON 覆盖 Markdown 权威源。

## 8. 错误 ID / 命名 / 字段

- 检测到不符合 `_AI_GLOBAL_MEMORY/AI_NAMING_CONVENTIONS.md` 的 ID / 字段：
  记录 `Gap: naming-violation` 并提示修复；**不**静默改名。
- 修复方向：保留可读 ID 作为别名，新建规范 ID 并在 ID 池中建立
  `aliases` 映射。

## 9. 跨 Agent 一致性

- Cursor 与 Codex 必须在相同 shell + 输入 + 状态机下产生结构一致的
  正式制品（不是字节完全一致，是字段集 / 顺序 / 引用一致）。
- 跨 Agent 差异检测：每月自动跑一次 `scripts/validate-skill.js` + 关键
  场景回归；启用 AI Coder 委派时，差异登记到 `${GOVERNANCE_ROOT}/pm-ai-reviews/`；
  未启用时登记到 `00_PM_MEMORY/PM_GAP_ANALYSIS.md`。

## 验收场景覆盖要求

`scenarios/scenarios.md` 至少须覆盖以下 9 类异常：

1. 同一初始化连续 3 次（幂等）
2. 重复材料 / 重复 transcript（去重 + superseded）
3. 冲突材料（4 类冲突）
4. 中断恢复（5 字段恢复 + 路由）
5. 脏工作树（3 子类）
6. 未批变更（覆盖 Approved Baseline 拒绝 / Sprint-Scope 冲突拒绝）
7. 不可读输入（received-but-unreadable + Gap）
8. Markdown/JSON 冲突（Markdown 权威）
9. Memory / Recovery（Memory Boot、上下文压缩、缺失 Required 文件、损坏 Active Context、过期冲突、写入中断、部分失败、审批等待）

任何未覆盖视为稳定性不足。

## 10. Critical Output Contract 失败关闭（REQ-035 / WP-017）

关键输出在发送前必须命中契约并完成 8 步 Pre-send Compliance Gate（见 `runtime-compliance-contracts.md` §4）。本节为稳定性规则的运行时延伸，删除或弱化视为破坏内核。

### 10.1 双输出事务

| 渠道 | 要求 |
|---|---|
| 文件落盘（`required_file_write`） | 必须成功写入；行数 ≥ 预期最小值 |
| 聊天交付（`required_chat_delivery`） | 必须为 `full-body-single-codeblock`；含完整正文 |

任一渠道失败 = 交付失败。文件落盘成功但聊天全文缺失 = 交付失败。聊天全文存在但权威文件未落盘 = 交付失败。

### 10.2 错误成功状态禁止

不得在缺字段、缺渠道或授权不明时输出以下任一成功状态：

- `issued`
- `accepted`
- `complete` / `done` / `finished`
- `pending-approval-ready`
- `human-pending`

任一状态与 Gate FAIL 同时出现时，立即写入 `00_PM_MEMORY/PM_GAP_ANALYSIS.md` 编号 `GAP-COC-###`，状态为 `forbidden-success-state`；必须以 `[Delivery Gate] FAIL: <reason>` 替代。

### 10.3 短指针授权边界

| 表达 | 是否 path-only 授权 |
|---|---|
| `one-click-copy` | 否；`one-click-copy = 完整正文单代码块` |
| `path-only` 显式声明 | 是；Human Owner 当前消息必须含"只给路径"或"短指针"等明确表达 |
| `简洁` / `赶快` / `一键复制` | 否；三种非授权表达 |
| `尽快` / `快速` / `简短点` | 否；催促性表达不构成授权 |

### 10.4 上下文压缩后的契约重读

上下文压缩后必须重新读取 `runtime-compliance-contracts.md` 与对应契约的 `required_reads`；不得依赖压缩摘要声称已满足契约。门禁无法判断是否满足 = 失败关闭。

### 10.5 失败升级路径

| 失败类型 | Escalation |
|---|---|
| 字段缺失 | `Escalation: contract-field-missing` → 写入 Gap |
| 渠道失败 | `Escalation: dual-output-failed` → 不得输出成功状态 |
| 授权不明 | `Escalation: abbreviation-grant-unclear` → 走 L2 Pending Update |
| 禁止项触发 | `Escalation: forbidden-shortcut` → 停止发送并请求 L1 澄清 |
| 错误成功状态 | `Escalation: forbidden-success-state` → 清除状态声明并修复 |

### 10.6 静态校验

- 验证器 `SI-14` 机器检查 6 类契约、10 字段、8 步门禁、关键语义、错误成功状态。
- 删除或弱化任一字段 → 退出非 0。
- 8 步门禁步骤命名不唯一或缺任一 → 退出非 0。
- 三种非授权表达（`简洁` / `赶快` / `一键复制`）任一不在文档中 → 退出非 0。
- 双输出失败关闭语义不在文档中 → 退出非 0。
- 错误成功状态列表（`issued` / `accepted` / `complete` / `done` / `finished`）任一不在文档中 → 退出非 0。
