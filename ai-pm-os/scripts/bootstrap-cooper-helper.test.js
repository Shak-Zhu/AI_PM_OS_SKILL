/**
 * Cooper Helper Bootstrap — Offline Test Suite (CB-01 ~ CB-12)
 *
 * All tests use isolated temp home directories and injected runners.
 * No real installation, no network access, no modification of real Codex/Cursor skills directories.
 *
 * Usage:
 *   node ai-pm-os/scripts/bootstrap-cooper-helper.test.js
 *
 * Exit codes:
 *   0 = all tests passed
 *   1 = one or more tests failed
 */

'use strict';

var fs = require('fs');
var path = require('path');
var os = require('os');

var bootstrap = require('./bootstrap-cooper-helper.js').bootstrap;

// =============================================================================
// TEST INFRASTRUCTURE
// =============================================================================

var testsRun = 0;
var testsFailed = 0;

function fail(msg) {
  testsFailed++;
  console.error('[FAIL] ' + msg);
}

function pass(msg) {
  console.log('[PASS] ' + msg);
}

function assertEqual(actual, expected, label) {
  if (actual === expected) {
    pass(label + ': ' + actual + ' === ' + expected);
  } else {
    fail(label + ': ' + actual + ' !== ' + expected + ' (actual=' + JSON.stringify(actual) + ')');
  }
}

function assertTrue(actual, label) {
  if (actual) {
    pass(label + ': true');
  } else {
    fail(label + ': expected true, got ' + JSON.stringify(actual));
  }
}

function assertFalse(actual, label) {
  if (!actual) {
    pass(label + ': false');
  } else {
    fail(label + ': expected false, got ' + JSON.stringify(actual));
  }
}

function createTempHome(name) {
  var tmpDir = path.join(os.tmpdir(), 'cooper-bootstrap-test-' + name + '-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'integrations'), { recursive: true });
  return tmpDir;
}

function cleanupTempHome(tmpHome) {
  try { fs.rmSync(tmpHome, { recursive: true, force: true }); } catch (e) { /* ignore */ }
}

function readStateAtHome(tmpHome) {
  var fp = path.join(tmpHome, 'integrations', 'cooper-mcp-helper.json');
  if (!fs.existsSync(fp)) return null;
  try {
    var content = fs.readFileSync(fp, 'utf8');
    if (!content || content.trim() === '') return null;
    return JSON.parse(content);
  } catch (e) {
    // Corrupted state - return null to simulate the new readState() behavior
    return null;
  }
}

function placeSkill(tmpHome, subdir) {
  subdir = subdir || '.cursor';
  // Normalize: remove any leading 'skills/' from subdir since we always append it
  subdir = subdir.replace(/^skills[\/\\]/, '').replace(/^skills$/, '');
  var sp = path.join(tmpHome, subdir, 'skills', 'cooper-mcp-helper', 'SKILL.md');
  fs.mkdirSync(path.dirname(sp), { recursive: true });
  fs.writeFileSync(sp, '# SKILL\n', 'utf8');
  return sp;
}

// =============================================================================
// TEST: CB-01 — Codex install path exists → runner 0 calls, installed
// =============================================================================

function testCB01() {
  testsRun++;
  var tmpHome = createTempHome('cb01');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;
    process.env.CODEX_HOME = tmpHome;
    placeSkill(tmpHome, 'skills'); // CODEX_HOME/skills/cooper-mcp-helper/SKILL.md

    var runnerCalls = 0;
    var runner = function() { runnerCalls++; return { exitCode: 0, stdout: '', stderr: '' }; };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-01: exit code');
    assertEqual(result.status, 'installed', 'CB-01: status');
    assertEqual(result.reason, 'already_installed', 'CB-01: reason');
    assertEqual(runnerCalls, 0, 'CB-01: runner calls');

    var state = readStateAtHome(tmpHome);
    assertEqual(state.status, 'installed', 'CB-01: state status');
    assertFalse(state.restart_required, 'CB-01: restart_required=false');

    pass('CB-01: Codex install path detected, 0 runner calls, installed');
  } catch (e) {
    fail('CB-01: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
    delete process.env.CODEX_HOME;
  }
}

// =============================================================================
// TEST: CB-02 — Cursor install path exists → runner 0 calls, installed
// =============================================================================

function testCB02() {
  testsRun++;
  var tmpHome = createTempHome('cb02');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;
    placeSkill(tmpHome, '.cursor'); // ~/.cursor/skills/cooper-mcp-helper/SKILL.md

    var runnerCalls = 0;
    var runner = function() { runnerCalls++; return { exitCode: 0, stdout: '', stderr: '' }; };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-02: exit code');
    assertEqual(result.status, 'installed', 'CB-02: status');
    assertEqual(runnerCalls, 0, 'CB-02: runner calls');

    var state = readStateAtHome(tmpHome);
    assertEqual(state.status, 'installed', 'CB-02: state status');

    pass('CB-02: Cursor install path detected, 0 runner calls, installed');
  } catch (e) {
    fail('CB-02: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-03 — No install, d-skills available → only d-skills command
// =============================================================================

function testCB03() {
  testsRun++;
  var tmpHome = createTempHome('cb03');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    var usedCommand = null;
    var runnerCalls = 0;
    var runner = function(cmd) {
      runnerCalls++;
      usedCommand = cmd;
      // d-skills available: first command succeeds AND places the file
      if (cmd[0] === 'd-skills' && cmd[1] === 'add' && cmd[2] === 'cooper-mcp-helper') {
        placeSkill(tmpHome, '.cursor'); // simulate install placing the file
        return { exitCode: 0, stdout: '', stderr: '' };
      }
      return { exitCode: 1, stdout: '', stderr: 'not found' };
    };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-03: exit code');
    assertEqual(runnerCalls, 1, 'CB-03: runner calls');
    // Runner places file and returns success → detectInstallation finds it → install_success
    assertEqual(result.status, 'installed', 'CB-03: result status');
    assertEqual(result.reason, 'install_success', 'CB-03: result reason (file found after runner placement)');
    assertTrue(result.restart_required === true, 'CB-03: restart_required=true');
    assertEqual(usedCommand[0], 'd-skills', 'CB-03: command[0]');
    assertEqual(usedCommand[1], 'add', 'CB-03: command[1]');
    assertEqual(usedCommand[2], 'cooper-mcp-helper', 'CB-03: command[2]');

    var state = readStateAtHome(tmpHome);
    assertEqual(state.status, 'installed', 'CB-03: state status');
    assertEqual(state.next_action, 'restart_required', 'CB-03: next_action');

    pass('CB-03: d-skills available, runner placed file, install succeeded');
  } catch (e) {
    fail('CB-03: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-04 — No d-skills → only npx command with fixed registry
// =============================================================================

function testCB04() {
  testsRun++;
  var tmpHome = createTempHome('cb04');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    var usedCommand = null;
    var runnerCalls = 0;
    var runner = function(cmd) {
      runnerCalls++;
      usedCommand = cmd;
      // npx with intra registry: succeeds AND places the file
      // The npm intra registry flag uses --registry=http://... as ONE string, not two
      if (cmd[0] === 'npx' && cmd.join(' ').indexOf('--registry=http://npm.intra.xiaojukeji.com') !== -1) {
        placeSkill(tmpHome, '.cursor');
        return { exitCode: 0, stdout: '', stderr: '' };
      }
      return { exitCode: 1, stdout: '', stderr: 'not found' };
    };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-04: exit code');
    // d-skills fails, npx succeeds → runner places file → detectInstallation finds it → install_success
    assertEqual(runnerCalls, 2, 'CB-04: runner calls (d-skills fails, npx succeeds)');
    assertEqual(result.status, 'installed', 'CB-04: result status');
    assertEqual(result.reason, 'install_success', 'CB-04: result reason (file found after npx placement)');
    assertTrue(result.restart_required === true, 'CB-04: restart_required=true');
    assertEqual(result.detected_path, path.join(tmpHome, '.cursor', 'skills', 'cooper-mcp-helper', 'SKILL.md'),
                'CB-04: detected_path');
    assertEqual(usedCommand[0], 'npx', 'CB-04: command[0]');
    assertTrue(usedCommand.join(' ').indexOf('--registry') !== -1, 'CB-04: has --registry');
    assertTrue(usedCommand.join(' ').indexOf('http://npm.intra.xiaojukeji.com') !== -1, 'CB-04: has intra registry');

    var state = readStateAtHome(tmpHome);
    assertEqual(state.status, 'installed', 'CB-04: state status');
    assertEqual(state.install_method, 'npx', 'CB-04: install_method=npx');
    assertEqual(state.next_action, 'restart_required', 'CB-04: next_action');

    pass('CB-04: d-skills unavailable, npx with intra registry succeeded, file placed');
  } catch (e) {
    fail('CB-04: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-05 — Network failure → unavailable, non-blocking, both commands tried
// =============================================================================

function testCB05() {
  testsRun++;
  var tmpHome = createTempHome('cb05');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    var runnerCalls = 0;
    var runner = function(cmd) {
      runnerCalls++;
      return { exitCode: 1, stdout: '', stderr: 'network timeout' };
    };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-05: exit code (non-blocking)');
    assertEqual(result.status, 'unavailable', 'CB-05: status');
    assertEqual(runnerCalls, 2, 'CB-05: runner calls (both commands tried)');

    var state = readStateAtHome(tmpHome);
    assertEqual(state.status, 'unavailable', 'CB-05: state.status');
    assertFalse(state.restart_required, 'CB-05: restart_required=false');
    assertFalse(state.last_error_code === null || state.last_error_code === '', 'CB-05: has error_code');

    pass('CB-05: Network failure → unavailable, non-blocking, both commands tried');
  } catch (e) {
    fail('CB-05: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-06 — Existing deferred state, normal startup → no runner call
// =============================================================================

function testCB06() {
  testsRun++;
  var tmpHome = createTempHome('cb06');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    // Pre-write deferred state
    var stateFile = path.join(tmpHome, 'integrations', 'cooper-mcp-helper.json');
    fs.writeFileSync(stateFile, JSON.stringify({
      schema_version: '1.0',
      status: 'deferred',
      detected_path: null,
      install_method: 'npx',
      last_attempt_at: '2026-06-30T00:00:00Z',
      last_error_code: 'EXIT_1_NETWORK_TIMEOUT',
      restart_required: false,
      next_action: 'manual_review'
    }, null, 2) + '\n', 'utf8');

    var runnerCalls = 0;
    var runner = function() { runnerCalls++; return { exitCode: 0, stdout: '', stderr: '' }; };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-06: exit code');
    assertEqual(result.status, 'deferred', 'CB-06: status');
    assertEqual(result.reason, 'deferred_skip', 'CB-06: reason');
    assertEqual(runnerCalls, 0, 'CB-06: runner calls (0 = no retry)');

    pass('CB-06: deferred state → normal startup skips runner');
  } catch (e) {
    fail('CB-06: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-07 — Explicit --retry → runner called (both commands)
// =============================================================================

function testCB07() {
  testsRun++;
  var tmpHome = createTempHome('cb07');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    // Pre-write unavailable state
    var stateFile = path.join(tmpHome, 'integrations', 'cooper-mcp-helper.json');
    fs.writeFileSync(stateFile, JSON.stringify({
      schema_version: '1.0',
      status: 'unavailable',
      detected_path: null,
      install_method: null,
      last_attempt_at: '2026-06-30T00:00:00Z',
      last_error_code: 'EXIT_1',
      restart_required: false,
      next_action: 'manual_review'
    }, null, 2) + '\n', 'utf8');

    var runnerCalls = 0;
    var runner = function() { runnerCalls++; return { exitCode: 1, stderr: 'network' }; };

    var result = bootstrap({ runner: runner, retry: true });

    assertEqual(result.exitCode, 0, 'CB-07: exit code');
    assertEqual(result.reason, 'install_unavailable', 'CB-07: reason');
    assertEqual(runnerCalls, 2, 'CB-07: runner calls (both fixed commands tried)');

    pass('CB-07: Explicit --retry → runner called');
  } catch (e) {
    fail('CB-07: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-08 — Simulated success → installed + restart_required=true
// =============================================================================

function testCB08() {
  testsRun++;
  var tmpHome = createTempHome('cb08');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    var runner = function(cmd) {
      // Place the file AND return success
      placeSkill(tmpHome, '.cursor');
      return { exitCode: 0, stdout: '', stderr: '' };
    };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-08: exit code');
    assertEqual(result.status, 'installed', 'CB-08: status');
    assertTrue(result.restart_required === true, 'CB-08: restart_required=true');

    var state = readStateAtHome(tmpHome);
    assertEqual(state.status, 'installed', 'CB-08: state.status');
    assertTrue(state.restart_required === true, 'CB-08: state restart_required');
    assertEqual(state.next_action, 'restart_required', 'CB-08: next_action');

    pass('CB-08: Simulated success → installed + restart_required=true');
  } catch (e) {
    fail('CB-08: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-09 — Different project root → reuse same user-level state
// =============================================================================

function testCB09() {
  testsRun++;
  var tmpHome = createTempHome('cb09');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    // First: install
    placeSkill(tmpHome, '.cursor');
    var runner1 = function() { return { exitCode: 0, stdout: '', stderr: '' }; };
    var result1 = bootstrap({ runner: runner1 });
    assertEqual(result1.status, 'installed', 'CB-09: initial install');

    // Second: simulate different project root — same tmpHome → state reused
    var runner2Calls = 0;
    var runner2 = function() { runner2Calls++; return { exitCode: 0, stdout: '', stderr: '' }; };
    var result2 = bootstrap({ runner: runner2 });

    assertEqual(result2.status, 'installed', 'CB-09: second call status (reuse)');
    assertEqual(runner2Calls, 0, 'CB-09: runner calls on second call (0 = no retry)');

    pass('CB-09: Different project root → reuse user-level state, no runner call');
  } catch (e) {
    fail('CB-09: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-10 — Corrupted state file, NO install file → fail-closed, 0 runner calls
// QC-F-270: This is the real corrupted-state path: corrupted state + no install file
// =============================================================================

function testCB10() {
  testsRun++;
  var tmpHome = createTempHome('cb10');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    // Write corrupted JSON state (but NO install file)
    var stateFile = path.join(tmpHome, 'integrations', 'cooper-mcp-helper.json');
    fs.writeFileSync(stateFile, 'NOT_VALID_JSON{{{\n', 'utf8');

    // DO NOT place the skill file — this is the key QC-F-270 scenario:
    // corrupted state with no install file must NOT call runner

    var runnerCalls = 0;
    var runner = function(cmd) { runnerCalls++; return { exitCode: 0, stdout: '', stderr: '' }; };

    var result = bootstrap({ runner: runner });

    // QC-F-270: runner must be 0 — fail-closed, no install command executed
    assertEqual(result.exitCode, 0, 'CB-10: exit code (non-blocking)');
    assertEqual(runnerCalls, 0, 'CB-10: runner calls (0 = fail-closed, QC-F-270)');
    assertEqual(result.status, 'unavailable', 'CB-10: status (rebuilt to unavailable)');
    assertEqual(result.reason, 'corrupted_state_no_install', 'CB-10: reason (QC-F-270)');

    var state = readStateAtHome(tmpHome);
    assertTrue(state !== null, 'CB-10: state rebuilt from corruption');
    assertEqual(state.status, 'unavailable', 'CB-10: state rebuilt to unavailable');
    assertEqual(state.last_error_code, 'STATE_FILE_CORRUPTED', 'CB-10: error code is STATE_FILE_CORRUPTED');

    pass('CB-10: Corrupted state, no install file → 0 runner calls, fail-closed (QC-F-270)');
  } catch (e) {
    fail('CB-10: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-10B — Corrupted state file WITH install file → re-evaluate, 0 runner calls
// Companion to CB-10: when state is corrupted but file exists, re-detect and skip
// =============================================================================

function testCB10b() {
  testsRun++;
  var tmpHome = createTempHome('cb10b');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    // Write corrupted JSON state
    var stateFile = path.join(tmpHome, 'integrations', 'cooper-mcp-helper.json');
    fs.writeFileSync(stateFile, 'CORRUPTED{{{{\n', 'utf8');

    // Place the skill file — state is corrupted but file exists
    placeSkill(tmpHome, '.cursor');

    var runnerCalls = 0;
    var runner = function(cmd) { runnerCalls++; return { exitCode: 0, stdout: '', stderr: '' }; };

    var result = bootstrap({ runner: runner });

    // File detected → skip runner, rebuild state=installed
    assertEqual(result.exitCode, 0, 'CB-10B: exit code');
    assertEqual(runnerCalls, 0, 'CB-10B: runner calls (0 = file detected first)');
    assertEqual(result.status, 'installed', 'CB-10B: status (file detected)');
    assertEqual(result.reason, 'already_installed', 'CB-10B: reason');

    var state = readStateAtHome(tmpHome);
    assertEqual(state.status, 'installed', 'CB-10B: state rebuilt to installed');

    pass('CB-10B: Corrupted state WITH install file → re-evaluate, 0 runner calls');
  } catch (e) {
    fail('CB-10B: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-11 — Only fixed commands used → no alternative registry/package
// =============================================================================

function testCB11() {
  testsRun++;
  var tmpHome = createTempHome('cb11');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    // This runner succeeds on first command (d-skills)
    var runnerCalls = 0;
    // The fixed commands are the two hardcoded arrays.
    // Mock runner: succeed on first (d-skills), never try npx.
    var runner = function(cmd) {
      runnerCalls++;
      // Only two commands are hardcoded: d-skills and npx+intra-registry
      // The bootstrap tries d-skills first. Simulate success (file placed).
      placeSkill(tmpHome, '.cursor');
      return { exitCode: 0, stdout: '', stderr: '' };
    };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-11: exit code');
    assertEqual(runnerCalls, 1, 'CB-11: runner calls (1 = d-skills succeeded, no npx)');

    pass('CB-11: Only fixed install commands used, no alternative registry/package');
  } catch (e) {
    fail('CB-11: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-12 — State file scan → no secrets, allowed fields only
// =============================================================================

function testCB12() {
  testsRun++;
  var tmpHome = createTempHome('cb12');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    placeSkill(tmpHome, '.cursor');
    var runner = function() { return { exitCode: 0, stdout: '', stderr: '' }; };
    bootstrap({ runner: runner });

    var state = readStateAtHome(tmpHome);
    assertTrue(state !== null, 'CB-12: state exists');

    var stateStr = JSON.stringify(state);
    var secrets = ['token', 'Token', 'TOKEN', 'secret', 'password', 'Password', 'PASSWORD', 'cookie', 'Cookie', 'bearer', 'Bearer', 'auth', 'Auth', 'API_KEY', 'api_key', 'credential', 'session', 'jwt'];
    var foundSecrets = [];
    for (var i = 0; i < secrets.length; i++) {
      if (stateStr.indexOf(secrets[i]) !== -1) {
        foundSecrets.push(secrets[i]);
      }
    }
    assertTrue(foundSecrets.length === 0, 'CB-12: no secrets in state file');

    var allowedKeys = ['schema_version', 'status', 'detected_path', 'install_method', 'last_attempt_at', 'last_error_code', 'restart_required', 'next_action'];
    var stateKeys = Object.keys(state);
    for (var j = 0; j < stateKeys.length; j++) {
      if (allowedKeys.indexOf(stateKeys[j]) === -1) {
        fail('CB-12: unexpected field: ' + stateKeys[j]);
      }
    }
    assertEqual(stateKeys.length, allowedKeys.length, 'CB-12: exactly 8 allowed fields');

    pass('CB-12: State scan → no secrets, allowed fields only');
  } catch (e) {
    fail('CB-12: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-13 — QC-F-271: stderr with token=SECRET → state has no SECRET
// =============================================================================

function testCB13() {
  testsRun++;
  var tmpHome = createTempHome('cb13');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    // Runner returns stderr containing sensitive info
    var runner = function(cmd) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'npm ERR! token=SECRET123abc123 token=sk-abc123456789 abc@example.com'
      };
    };

    var result = bootstrap({ runner: runner });

    assertEqual(result.exitCode, 0, 'CB-13: exit code (non-blocking)');
    assertEqual(result.status, 'unavailable', 'CB-13: status');

    var state = readStateAtHome(tmpHome);
    assertTrue(state !== null, 'CB-13: state exists');
    var stateStr = JSON.stringify(state);

    // The state must NOT contain the actual secret values
    assertFalse(stateStr.indexOf('SECRET123abc123') !== -1, 'CB-13: no raw SECRET in state');
    assertFalse(stateStr.indexOf('sk-abc123456789') !== -1, 'CB-13: no raw API key in state');
    assertFalse(stateStr.indexOf('token=SECRET') !== -1, 'CB-13: no raw token= in state');

    // error_code must exist and be non-empty
    assertTrue(state.last_error_code !== null && state.last_error_code !== '', 'CB-13: has error_code');

    pass('CB-13: stderr with token=SECRET → state has no raw secret (QC-F-271)');
  } catch (e) {
    fail('CB-13: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// TEST: CB-14 — QC-F-277/278: logs must also strip internal URLs/usernames/tokens
// Simulate runner stderr with internal URL + username + token;
// verify NEITHER state NOR console.log output contains raw values.
// =============================================================================

function testCB14() {
  testsRun++;
  var tmpHome = createTempHome('cb14');
  try {
    process.env.AI_PM_OS_HOME = tmpHome;

    var capturedLogs = [];
    // Intercept console.log to capture log output
    var originalLog = console.log;
    console.log = function(msg) {
      capturedLogs.push(msg);
    };

    // Runner returns stderr with internal URL (different from INSTALL_COMMANDS),
    // username, and token. The "Attempting:" log line prints the command itself
    // (which legitimately contains the hardcoded registry URL) — that's NOT stderr.
    // We use a DIFFERENT internal URL in stderr to avoid collision.
    var runner = function(cmd) {
      return {
        exitCode: 1,
        stdout: '',
        stderr: 'npm ERR! private_registry=https://pkgs.company.local user=bob token=sk-abc123xyz789 session=bob@corp.io'
      };
    };

    var result = bootstrap({ runner: runner });

    // Restore console.log
    console.log = originalLog;

    // Check state: must not contain raw sensitive values
    var state = readStateAtHome(tmpHome);
    assertTrue(state !== null, 'CB-14: state exists');
    var stateStr = JSON.stringify(state);

    var forbiddenInState = [
      'https://pkgs.company.local',
      'bob',
      'sk-abc123xyz789',
      'session=bob'
    ];
    for (var fi = 0; fi < forbiddenInState.length; fi++) {
      assertFalse(stateStr.indexOf(forbiddenInState[fi]) !== -1,
        'CB-14: state has no raw ' + forbiddenInState[fi]);
    }

    // Check captured logs: must not contain raw sensitive values
    var allLogs = capturedLogs.join('|||');
    for (var li = 0; li < forbiddenInState.length; li++) {
      assertFalse(allLogs.indexOf(forbiddenInState[li]) !== -1,
        'CB-14: log has no raw ' + forbiddenInState[li]);
    }

    pass('CB-14: internal URL/username/token → 0 hits in state AND logs (QC-F-277/278)');
  } catch (e) {
    console.log = originalLog; // ensure restore on exception
    fail('CB-14: exception: ' + e.message);
  } finally {
    cleanupTempHome(tmpHome);
    delete process.env.AI_PM_OS_HOME;
  }
}

// =============================================================================
// RUN ALL TESTS
// =============================================================================

function runAllTests() {
  console.log('=== Cooper Helper Bootstrap — Offline Test Suite (CB-01~CB-14) ===');
  console.log('');

  testCB01();
  testCB02();
  testCB03();
  testCB04();
  testCB05();
  testCB06();
  testCB07();
  testCB08();
  testCB09();
  testCB10();
  testCB10b();
  testCB11();
  testCB12();
  testCB13();
  testCB14();

  console.log('');
  console.log('=== Summary ===');
  console.log('Tests run: ' + testsRun);
  console.log('Tests failed: ' + testsFailed);

  if (testsFailed > 0) {
    console.log('RESULT: FAIL');
    process.exit(1);
  } else {
    console.log('RESULT: PASS — all ' + testsRun + ' tests passed');
    process.exit(0);
  }
}

runAllTests();
