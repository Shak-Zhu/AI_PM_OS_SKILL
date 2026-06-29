# Fact Layers — 事实层级

`ai-pm-os` 区分以下事实层级；任何输出必须显式标注事实来源层级，
不得将低层级冒充为高层级。删除或弱化本节视为破坏内核。

## 1. 层级定义

| 层级 | 名称 | 来源 | 是否可写 | 落盘位置 |
|---|---|---|---|---|
| L0 | 用户输入事实 | 当前对话、聊天上传、本地文件、transcript | 是（可作为输入证据） | `PM_INPUT_LOG.md` |
| L1 | 已批准基线 | 状态为 `Approved` 或 `Approved Baseline` 的正式文件 | 否（只读） | `01_PM_DOCUMENTS/PM_*.md` 等 |
| L2 | 待确认信息 | 用户表述但未签字、来自低可信来源、缺乏 owner / due date | 是（先落 Gap） | `00_PM_MEMORY/PM_PENDING_UPDATES.md` |
| L3 | 推断 | 由 L0 + L1 推导出的判断（无独立证据） | 是（但必须标注 `Inferred:` 前缀） | 同 L2 或 Gap Analysis |
| L4 | 建议 | 基于 L3 推断的处置建议 | 是（必须经人类批准才能升为 L1/L2） | Pending Updates |
| L5 | Gap | 缺失、冲突、未覆盖、不可信证据 | 是（追踪闭环） | `00_PM_MEMORY/PM_GAP_ANALYSIS.md` |
| L6 | Risk | 尚未发生但可能影响项目 | 是（走 RAID） | `01_PM_DOCUMENTS/PM_RAID_LOG.md` |
| L7 | Issue | 已经发生且需要处理的问题 | 是（走 RAID） | `01_PM_DOCUMENTS/PM_RAID_LOG.md` |
| L8 | Decision | 已确认决策（经 Project Owner / Sponsor） | 否（只追加，不修改） | `01_PM_DOCUMENTS/PM_DECISION_LOG.md` |

## 2. 转换规则

```
L0 (用户输入) ─┐
               ├─→ L1 (已批准) [需要 Approved 流程]
L3 (推断)  ────┤
L4 (建议)  ────┤
               └─→ L2 (待确认) [需要 Pending Update 流程]

L0 + L1 ──→ L3 (推断) [必须有推理路径]
L3 ──→ L4 (建议) [必须显示推理链]
L2 ──(批准)──→ L1 (已批准)
L0/L3 ──(无法核实)──→ L5 (Gap)
L0/L3 ──(尚未发生)──→ L6 (Risk)
L0/L3 ──(已经发生)──→ L7 (Issue)
L4 + 批准 ──→ L8 (Decision)
```

## 3. 禁止冒充

- **不得**把 L3 推断当作 L1 已批准基线写入 Decision Log。
- **不得**把 L0 用户输入当作 L1 已批准事实写入 Approved Baseline。
- **不得**把 L2 待确认事项直接升级为 L8 Decision。
- **不得**把 L6 Risk 改写为 L7 Issue 除非有充分证据表明风险已实现。
- **不得**把 L5 Gap 静默"修掉"，必须显式说明证据已收齐或可关闭。

## 4. 输出标注

任何正式文件 / JSON 输出必须包含 `Fact-Layer:` 字段，列出本次新增 / 修改
的事实所处层级。例如：

```yaml
PU-###:
  fact_layer: L4
  source: L0 (chat upload YYYY-MM-DD_HHMM) + L1 (PM_SCOPE_BASELINE.md vX.Y)
  confidence: medium
  requires_human_approval: true
```

## 5. 决策路径标注

Decision Log 每条记录必须包含决策路径：

- 直接由 L0 + L1 推导；
- 由 L3/L4 推断并经批准；
- 由会议 transcript 经 Pending Update 升级；
- 由 Change Request 经 Change Log 升级。

未在四类路径之内的决策视为异常决策，触发 `Gap：decision-path-illegal`。

## 6. 与场景的对应

`scenarios/scenarios.md` 中所有 `Then` 块必须显式列出所涉及事实的层级；
任何场景若混入冒充层级，视为无效。
