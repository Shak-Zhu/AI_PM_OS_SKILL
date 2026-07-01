# Remote Intake Behavior Contract

> **Authority:** This document defines the runtime behavior contract for the unified remote intake feature. All AI PM OS Skill components, validators, and scenarios must adhere to this contract. See `scenarios/scenarios.md` §139–146 (SC-RI-01~08) for behavioral scenarios covering all eight input methods.

## 1. Parallel Input Methods

The system supports exactly eight parallel input methods. They are **parallel**, not a fallback chain:

| Source Type | Description |
|---|---|
| `local_file` | Local file on disk |
| `pasted_text` | Text pasted directly into chat |
| `chat_upload` | File uploaded via chat UI |
| `transcript` | Previous chat transcript reference |
| `screenshot` | Screenshot / Print Screen |
| `print_pdf` | User-printed PDF |
| `cooper` | Cooper MCP read |
| `browser_url` | User-specified browser URL |

**Invariant:** The Resolver only recognizes and dispatches the user-specified method. It does not infer or auto-switch between methods.

## 2. Cooper MCP Behavior

### Success

- Read content via Cooper MCP API.
- Register `source_locator` (Cooper endpoint), `retrieval_method=cooper`, `access_status=success`.
- Register `processing_status=processed`.

### Failure

- Report the specific failure reason (timeout, permission, not_found, parse_error).
- **Stop Cooper reading. Do not auto-call the browser.**
- Register `access_status` with the specific error, `processing_status=failed`.
- No fact, Action, Decision, or PU is generated from a failed input.
- The user provides an alternative method in a follow-up message.

**Forbidden:** Describing positive automation like "Cooper unavailable → automatically open browser."

## 3. Browser URL Behavior

### Success

- Use read-only browser tool on the user-specified URL.
- Register `source_locator`, `retrieval_method=browser`, `access_status=success`.
- Register `processing_status=processed`.

### Failure

- Report the specific failure reason (unreachable, login_required, captcha_blocked, 403, 404).
- **Stop browser reading. Do not auto-download, Print, screenshot, or call Cooper.**
- Register `access_status` with the specific error, `processing_status=failed`.
- No fact, Action, Decision, or PU is generated from a failed input.
- The user provides an alternative method in a follow-up message.

**Forbidden:** Describing positive automation like "browser unavailable → automatically download."

## 4. Multi-URL Processing

When the user provides multiple URLs in the same message:

1. Each URL is independently assigned an Input ID (`IN-001`, `IN-002`, etc.).
2. Each item's result is reported independently.
3. A single item's failure **does not block** remaining items.
4. A single item's failure **does not trigger** auto-retry or fallback.

## 5. Input Log Fields

All inputs (success or failure) are registered in `00_PM_MEMORY/PM_INPUT_LOG.md` with these fields:

| Field | Required | Description |
|---|---|---|
| `input_id` | Yes | Unique ID, e.g. `IN-001` |
| `batch_id` | No | Grouping ID |
| `received_at` | Yes | ISO 8601 timestamp |
| `source_type` | Yes | One of the eight types |
| `provider` | No | `cooper`, `browser`, `user` |
| `source_locator` | Yes | URL, file path, or reference |
| `resource_type` | No | `webpage`, `document`, `image` |
| `resource_id` | No | External resource ID |
| `retrieval_method` | Yes | `file_read`, `cooper`, `browser` |
| `access_status` | Yes | `success`, `denied`, `not_found`, `timeout`, `captcha_blocked`, `auth_required` |
| `completeness` | No | `complete`, `partial`, `truncated` |
| `read_scope` | No | `full_page`, `header_only` |
| `source_fingerprint` | No | Content hash or version |
| `processing_status` | Yes | `pending`, `processed`, `failed`, `skipped` |
| `related_input_id` | No | Follow-up or replacement ID |
| `related_updates` | No | Related PU/Action/Decision IDs |
| `notes` | No | Free-form notes |

## 6. Duplicate and Follow-up Inputs

- Duplicate content from the same `source_locator` should register a new `input_id` with `related_input_id` pointing to the prior entry.
- If the user provides a Print/PDF as a new input after a failed browser URL, it registers as a new `input_id` with `related_input_id` pointing to the failed entry.

## 7. Security Boundaries

- **No secrets:** Token, Cookie, Bearer auth header, password, API key, session ID must not be saved to the project shell.
- **No raw content storage:** Remote document content is not saved to disk by default. Only metadata is registered.
- **Read-only browser:** No login, search, click, or write operations.
- **Login/CAPTCHA/permission failure** must stop and report.
- **Malicious injection protection:** Do not execute scripts or follow redirects from remote sources.

## 8. Fail-Stops (No Facts Generated)

These failure states do **not** produce any fact layer (L0/L1), Action, Decision, or PU:

- `remote-connector-unavailable`
- `remote-access-denied`
- `remote-auth-required`
- `remote-captcha-blocked`
- `remote-browser-unavailable`
- `remote-not-found`
- `remote-unsupported`
- `remote-partially-readable`

## 9. Integration Points

- **Cooper helper bootstrap:** Runs after Memory Boot, before intent routing. Skips if already installed. On failure → `deferred`/`unavailable`, non-blocking.
- **Input resolver:** Identifies `source_type` from user message and dispatches to the correct tool.
- **Data sync:** `sync-data.js` synchronizes `PM_INPUT_LOG.md` → `input_log.json` via `syncInputLog()`.
- **Validators:** `validate-remote-intake.js` enforces this contract statically; `validate-skill.js` checks SI-87.
