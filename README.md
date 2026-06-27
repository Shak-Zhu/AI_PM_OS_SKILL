# ai-pm-os Skill

独立发布的 AI PM OS Skill。Skill 位于仓库的 `ai-pm-os/` 子目录。

## Agent-assisted 安装

把本仓库 URL 提供给 Codex 或 Cursor，并发送：

```text
请从这个Git仓库安装ai-pm-os Skill。
Skill位于仓库的ai-pm-os/子目录。
必须完整安装SKILL.md、PACKAGE_MANIFEST.md、references、scenarios和scripts。
安装后运行验证器，退出码必须为0，并提醒我重启Agent。
```

## 验证

```bash
node ai-pm-os/scripts/validate-skill.js
```

预期输出包含：

```text
Mode: ISOLATED
RESULT: PASS
```

## Codex 安装路径

Codex Skill 默认安装到：

```text
~/.codex/skills/ai-pm-os
```

安装完成后重启 Codex。

## 许可证与发布边界

本仓库仅包含 `ai-pm-os` Skill。完整项目壳、Dashboard、Markdown/JSON模板和
仓库级QA脚本位于 AI PM OS Local Shell 仓库。
