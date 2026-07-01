# Cooper Helper Bootstrap — Installation & Retry State Machine

## Overview

The `cooper-mcp-helper` is an optional component that enables Cooper MCP integration. It bootstraps itself once per user, storing state in the user's home directory rather than the project shell.

## State Machine

```
[Start]
    │
    ▼
detectInstallation() ──found──► [installed] ──skip──► exit 0
    │ (file not found)
    ▼
readState() ──deferred──► [deferred] ──skip──► exit 0 (no retry)
    │
    ▼
readState() ──unavailable──► [unavailable] ──skip──► exit 0 (no retry)
    │
    ▼
Attempt install (fixed commands only)
    │
    ├── exit 0 + file found ──► [installed] + restart_required
    │
    └── exit ≠ 0 ──► retry next command
           │
           └── all fail ──► [unavailable]
```

## States

| State | Meaning | Behavior |
|---|---|---|
| `installed` | Helper SKILL.md found | Permanent skip, no retry |
| `deferred` | Previous install attempt deferred | Normal startup skips; `--retry` allowed |
| `unavailable` | All install commands failed | Normal startup skips; `--retry` allowed |

## Installation Commands (Fixed Only)

```
d-skills add cooper-mcp-helper
npx --yes --registry=http://npm.intra.xiaojukeji.com d-skills@latest add cooper-mcp-helper
```

No other commands are permitted. Subprocess uses array form, no user input concatenation.

## User-Level State File

Path: `~/.ai-pm-os/integrations/cooper-mcp-helper.json`

Allowed fields: `schema_version`, `status`, `detected_path`, `install_method`, `last_attempt_at`, `last_error_code`, `restart_required`, `next_action`

Forbidden: Token, Cookie, password, auth header, session data.

## Trigger Conditions

- **Memory Boot after**: Check runs after memory boot, before normal intent routing.
- **Only with explicit trigger**: `--bootstrap` flag or first-session check.
- **Explicit retry**: Only when user explicitly says "重试 Cooper 安装".
- **No auto-retry**: After `deferred` or `unavailable`, normal startup does not retry.

## Post-Install Actions

After `installed + restart_required`:

1. Prompt user to restart Cursor/Codex.
2. After restart, follow the official helper documentation for configuration and login (if required).
3. Configuration details (MCP server URL, credentials) depend on the helper's actual interface —
   follow the official helper documentation rather than generated commands.

No `cooper-mcp-helper --verify-read` command is used unless explicitly documented by the official helper.

## Non-Blocking Contract

Bootstrap failure is **non-blocking**. The main Skill workflow continues regardless of Cooper helper state.
