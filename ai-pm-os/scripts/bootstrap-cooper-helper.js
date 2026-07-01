/**
 * ai-pm-os — Cooper MCP Helper Bootstrap
 *
 * One-time bootstrap script for cooper-mcp-helper installation.
 * This is NOT the Cooper MCP tool itself — it only manages the helper's
 * one-time installation state.
 *
 * Policy:
 * - User-level state: ~/.ai-pm-os/integrations/cooper-mcp-helper.json
 * - No project shell state (user home only)
 * - No auth tokens, passwords, cookies, or session data in state
 * - No auto-retry after deferred/unavailable
 * - Fixed install commands only
 * - Subprocess uses array form, no user input concatenation
 * - Offline test: injected runner + isolated temp home
 *
 * Usage:
 *   node ai-pm-os/scripts/bootstrap-cooper-helper.js              # bootstrap
 *   node ai-pm-os/scripts/bootstrap-cooper-helper.js --retry       # explicit retry
 *   node ai-pm-os/scripts/bootstrap-cooper-helper.js --dry-run    # state inspection
 *
 * Exit codes:
 *   0 = success (skip, deferred, unavailable, or simulated install)
 *   1 = invalid state file (fail-closed)
 */

'use strict';

var fs = require('fs');
var path = require('path');

// getRealHome() returns the OS home directory WITHOUT caching.
// This is critical for tests: os.homedir() is cached at module-load time,
// BEFORE process.env.AI_PM_OS_HOME is set. Using environment variables
// instead allows tests to redirect the home path.
function getRealHome() {
  return process.env.HOME || process.env.USERPROFILE || '';
}

// =============================================================================
// CONFIGURATION (resolved at runtime)
// =============================================================================

var VALID_STATUSES = ['installed', 'deferred', 'unavailable'];
var INSTALL_COMMANDS = [
  ['d-skills', 'add', 'cooper-mcp-helper'],
  ['npx', '--yes', '--registry=http://npm.intra.xiaojukeji.com', 'd-skills@latest', 'add', 'cooper-mcp-helper']
];

// These use getRealHome() which reads env at call time (not module-load time)
function getHome() { return process.env.AI_PM_OS_HOME || path.join(getRealHome(), '.ai-pm-os'); }
function getIntegrationsDir() { return path.join(getHome(), 'integrations'); }
function getStateFile() { return path.join(getIntegrationsDir(), 'cooper-mcp-helper.json'); }

// =============================================================================
// HELPERS
// =============================================================================

function log(msg)   { console.log('[cooper-bootstrap] ' + msg); }
function error(msg)  { console.error('[cooper-bootstrap] ERROR: ' + msg); }

/**
 * readState() — reads and parses the state file.
 * Returns:
 *   null         — file does not exist
 *   { parsed: true, data: <object> }  — valid JSON
 *   { parsed: false, error: 'CORRUPTED' } — file exists but not valid JSON
 */
function readState() {
  var fp = getStateFile();
  if (!fs.existsSync(fp)) return { parsed: false, data: null, reason: 'NOT_EXISTS' };
  try {
    return { parsed: true, data: JSON.parse(fs.readFileSync(fp, 'utf8')), reason: null };
  } catch (e) {
    return { parsed: false, data: null, reason: 'CORRUPTED' };
  }
}

// Strip secrets from stderr before saving to state or logging.
// QC-F-277: Never save raw stderr; QC-F-278: Strip internal URLs/usernames/tokens.
// Must not contain Token, Secret, password, auth fragments, API keys, Bearer tokens, internal URLs.
function stripSecrets(raw) {
  if (!raw) return null;
  var s = String(raw);
  // QC-F-278: Remove internal URLs (company registry, .local, .corp, .intra, .internal domains)
  s = s.replace(/https?:\/\/npm\.intra\.xiaojukeji\.com/gi, '***REDACTED_URL***');
  s = s.replace(/https?:\/\/[^\s]+\.(intra|corp|internal|local)[^\s]*/gi, '***REDACTED_URL***');
  s = s.replace(/https?:\/\/pkgs\.company\.[^\s]*/gi, '***REDACTED_URL***');
  // Remove common secret patterns: token=SECRET, password=SECRET, key=SECRET, etc.
  s = s.replace(/(token|Token|TOKEN|secret|Secret|SECRET|password|Password|PASSWORD|api[_-]?key|api[_-]?token|bearer|Bearer|BEARER|auth|Auth|AUTH|credential|Credential|CREDENTIAL|session|Session|SESSION|jwt|JWT)=[^\s,;'"]{1,60}/gi, '***REDACTED***');
  // Remove Bearer token patterns
  s = s.replace(/Bearer\s+[^\s]{10,100}/gi, 'Bearer ***REDACTED***');
  // Remove basic auth patterns
  s = s.replace(/[A-Za-z0-9._-]+:[A-Za-z0-9._-]{10,50}@[^\s]*/g, '***REDACTED***');
  // Remove API key patterns (long alphanumeric strings)
  s = s.replace(/[A-Za-z0-9]{32,}/g, function(m) {
    if (/^[A-Za-z0-9]{32,}$/.test(m)) return '***REDACTED***';
    return m;
  });
  // QC-F-278: Remove usernames (short word=alphanumeric patterns adjacent to registry/URL)
  s = s.replace(/(user|username|email)=[^\s,;'"]{1,50}/gi, '***REDACTED***');
  return s;
}

function writeState(state) {
  var dir = getIntegrationsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getStateFile(), JSON.stringify(state, null, 2) + '\n', 'utf8');
}

function ensureStateObject(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      schema_version: '1.0',
      status: 'unavailable',
      detected_path: null,
      install_method: null,
      last_attempt_at: null,
      last_error_code: 'INVALID_STATE_FILE',
      restart_required: false,
      next_action: null
    };
  }
  var hasValidStatus = false;
  for (var si = 0; si < VALID_STATUSES.length; si++) {
    if (raw.status === VALID_STATUSES[si]) { hasValidStatus = true; break; }
  }
  return {
    schema_version: String(raw.schema_version || '1.0'),
    status: hasValidStatus ? raw.status : 'unavailable',
    detected_path: raw.detected_path || null,
    install_method: raw.install_method || null,
    last_attempt_at: raw.last_attempt_at || null,
    last_error_code: raw.last_error_code || null,
    restart_required: Boolean(raw.restart_required),
    next_action: raw.next_action || null
  };
}

function detectInstallation() {
  var userHome = getHome();
  var codexHome = process.env.CODEX_HOME;

  // Detection order matters: most-specific first
  // 1. CODEX_HOME/skills/                    (explicit platform install)
  // 2. AI_PM_OS_HOME/skills/                 (user-level install via our tool)
  // 3. AI_PM_OS_HOME/.codex/skills/           (user-level Codex style)
  // 4. AI_PM_OS_HOME/.cursor/skills/         (user-level Cursor style)
  // 5. ~/.codex/skills/                     (real home)
  // 6. ~/.cursor/skills/                   (real home)
  var checkPaths = [];
  if (codexHome) {
    checkPaths.push(path.join(codexHome, 'skills', 'cooper-mcp-helper', 'SKILL.md'));
  }
  checkPaths.push(path.join(userHome, 'skills', 'cooper-mcp-helper', 'SKILL.md'));
  checkPaths.push(path.join(userHome, '.codex', 'skills', 'cooper-mcp-helper', 'SKILL.md'));
  checkPaths.push(path.join(userHome, '.cursor', 'skills', 'cooper-mcp-helper', 'SKILL.md'));
  checkPaths.push(path.join(getRealHome(), '.codex', 'skills', 'cooper-mcp-helper', 'SKILL.md'));
  checkPaths.push(path.join(getRealHome(), '.cursor', 'skills', 'cooper-mcp-helper', 'SKILL.md'));

  for (var dp = 0; dp < checkPaths.length; dp++) {
    var p = checkPaths[dp];
    if (p && fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// =============================================================================
// SUBPROCESS RUNNER (safe array form, no user input concatenation)
// =============================================================================

/**
 * Run an install command with optional mock runner.
 * @param {string[]} cmd - command as array
 * @param {function|null} runner - null = real exec, function(cmd) for mock
 * @returns {{ exitCode: number, stdout: string, stderr: string }}
 */
function runCommand(cmd, runner) {
  if (runner) {
    return runner(cmd);
  }
  // Real subprocess
  try {
    var spawnSync = require('child_process').spawnSync;
    var result = spawnSync(cmd[0], cmd.slice(1), {
      encoding: 'utf8',
      timeout: 60000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return {
      exitCode: result.status || 0,
      stdout: result.stdout || '',
      stderr: result.stderr || ''
    };
  } catch (e) {
    return { exitCode: 1, stdout: '', stderr: e.message };
  }
}

// =============================================================================
// BOOTSTRAP LOGIC
// =============================================================================

/**
 * Main bootstrap entry point.
 * @param {object} options
 * @param {boolean} options.retry - explicit retry flag
 * @param {boolean} options.dryRun - dry run / state inspection only
 * @param {function|null} options.runner - injected runner for testing
 */
function bootstrap(options) {
  options = options || {};
  var retry = Boolean(options.retry);
  var dryRun = Boolean(options.dryRun);
  var runner = options.runner || null;

  // Read state: get structured result (NOT_EXISTS / CORRUPTED / valid)
  var stateResult = readState();

  // QC-F-270: Distinguish corrupted state vs non-existent state
  // If corrupted BUT no install file exists → fail-closed, no runner
  if (stateResult.reason === 'CORRUPTED') {
    var installedPath = detectInstallation();
    if (!installedPath) {
      // Fail-closed: corrupted state with no install file → rebuild to unavailable, no runner
      log('State file corrupted — re-evaluating (no install file found)');
      var corruptedState = {
        schema_version: '1.0',
        status: 'unavailable',
        detected_path: null,
        install_method: null,
        last_attempt_at: new Date().toISOString(),
        last_error_code: 'STATE_FILE_CORRUPTED',
        restart_required: false,
        next_action: 'manual_review'
      };
      writeState(corruptedState);
      return { exitCode: 0, status: 'unavailable', reason: 'corrupted_state_no_install' };
    }
    // If install file exists, re-evaluate
    log('State file corrupted but install file detected — re-evaluating');
  }

  // Extract the raw state object (null if file doesn't exist)
  var state = stateResult.data;
  var isRetry = retry;

  // Step 1: Check if already installed
  var installedPath = detectInstallation();
  if (installedPath) {
    var installedState = ensureStateObject(state);
    installedState.status = 'installed';
    installedState.detected_path = installedPath;
    installedState.restart_required = false;
    installedState.next_action = 'configure';
    installedState.last_attempt_at = new Date().toISOString();
    installedState.last_error_code = null;
    writeState(installedState);
    if (!dryRun) {
      log('Helper already installed at: ' + installedPath);
      log('Status: installed (permanent skip — no retry needed)');
    }
    return { exitCode: 0, status: 'installed', detected_path: installedPath, reason: 'already_installed' };
  }

  // Step 2: Check existing state (only when state file exists and is valid)
  if (state) {
    var existingState = ensureStateObject(state);
    if (existingState.status === 'installed') {
      // State says installed but file is gone — re-evaluate
      log('State says installed but file not found — re-evaluating');
    } else if ((existingState.status === 'deferred' || existingState.status === 'unavailable') && !isRetry) {
      // Non-blocking: skip retry on normal startup
      log('Status: ' + existingState.status + ' (skipping — use --retry for another attempt)');
      log('Next action: ' + (existingState.next_action || 'none — use "重试 Cooper 安装" to retry'));
      return { exitCode: 0, status: existingState.status, reason: 'deferred_skip' };
    }
  }

  if (dryRun) {
    log('Dry run: would attempt installation');
    return { exitCode: 0, status: 'would_install', reason: 'dry_run' };
  }

  // Step 3: Attempt installation
  var lastError = null;
  var installedMethod = null;

  for (var cmdIdx = 0; cmdIdx < INSTALL_COMMANDS.length; cmdIdx++) {
    var cmd = INSTALL_COMMANDS[cmdIdx];
    log('Attempting: ' + cmd.join(' '));

    var result = runCommand(cmd, runner);

    if (result.exitCode === 0) {
      installedMethod = cmd[0]; // 'd-skills' or 'npx'
      log('Install command succeeded (exit 0)');
      // Verify the installation actually appeared
      var newPath = detectInstallation();
      if (newPath) {
        var successState = ensureStateObject(state);
        successState.status = 'installed';
        successState.detected_path = newPath;
        successState.install_method = installedMethod;
        successState.last_attempt_at = new Date().toISOString();
        successState.last_error_code = null;
        successState.restart_required = true;
        successState.next_action = 'restart_required';
        writeState(successState);
        log('Helper installed at: ' + newPath);
        log('INSTALL SUCCESS: restart_required=true');
        log('NEXT STEP: Restart Cursor/Codex to activate the helper.');
        log('After restart, configure Cooper credentials as directed by the helper documentation.');
        return { exitCode: 0, status: 'installed', detected_path: newPath, restart_required: true, reason: 'install_success' };
      }
      // Command succeeded but file not found — treat as network success but install deferred
      lastError = 'EXIT_0_BUT_FILE_NOT_FOUND';
    } else {
      // QC-F-271: Strip secrets from stderr before saving to last_error_code
      var cleanError = 'EXIT_' + result.exitCode + '_' + (stripSecrets(result.stderr) || 'unknown');
      lastError = cleanError.substring(0, 100);
      // QC-F-277: Never output raw stderr to logs — always strip first
      var cleanLogMsg = (stripSecrets(result.stderr) || 'unknown').substring(0, 120).trim();
      log('Command failed (exit ' + result.exitCode + '): ' + cleanLogMsg);
    }
  }

  // All commands failed — record deferred/unavailable
  var deferredState = ensureStateObject(state);
  deferredState.status = 'unavailable';
  deferredState.install_method = null;
  deferredState.last_attempt_at = new Date().toISOString();
  deferredState.last_error_code = (lastError || 'ALL_COMMANDS_FAILED').substring(0, 100);
  deferredState.restart_required = false;
  deferredState.next_action = 'manual_review';
  writeState(deferredState);

  log('INSTALL UNAVAILABLE: all install commands failed');
  log('Status: unavailable (non-blocking — Cooper features deferred)');
  log('Current project management features remain fully available.');
  log('To retry: say "重试 Cooper 安装" in your next message.');
  return { exitCode: 0, status: 'unavailable', reason: 'install_unavailable' };
}

// =============================================================================
// CLI
// =============================================================================

function main() {
  var args = process.argv.slice(2);

  if (args.indexOf('--dry-run') !== -1) {
    var r = bootstrap({ dryRun: true });
    console.log(JSON.stringify(r, null, 2));
    process.exit(0);
    return;
  }

  var retry = args.indexOf('--retry') !== -1;
  var result = bootstrap({ retry: retry });

  // Explicit success semantics:
  // installed (with restart) → exit 0, report restart needed
  // installed (skip) → exit 0
  // deferred/unavailable → exit 0, non-blocking
  // invalid state file → exit 1 (fail-closed — but we handle this internally)
  process.exit(result.exitCode);
}

// Export for testing
module.exports = { bootstrap: bootstrap };

if (require.main === module) {
  main();
}
