const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const sessionStore = require('../src/main/sessionStore');

describe('sessionStore.updateFocusSession', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'timeend-sessions-'));
    sessionStore.setSessionsRoot(tmpDir);
  });

  afterEach(() => {
    sessionStore.setSessionsRoot(null);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('updates inputContent by id and persists', () => {
    const session = {
      id: 'focus-1',
      startTime: Date.UTC(2026, 9, 13, 2, 0, 0),
      endTime: Date.UTC(2026, 9, 13, 2, 25, 0),
      durationMinutes: 25,
      inputContent: '旧事项'
    };
    sessionStore.appendFocusSession(session);

    const result = sessionStore.updateFocusSession('focus-1', { inputContent: '新事项' });
    assert.equal(result.ok, true);

    const { focusSessions } = sessionStore.loadAllSessions();
    assert.equal(focusSessions.length, 1);
    assert.equal(focusSessions[0].inputContent, '新事项');
    assert.equal(focusSessions[0].durationMinutes, 25);
  });

  it('returns failure when id not found', () => {
    const result = sessionStore.updateFocusSession('missing', { inputContent: 'x' });
    assert.equal(result.ok, false);
  });

  it('allows clearing inputContent to empty string', () => {
    sessionStore.appendFocusSession({
      id: 'focus-2',
      startTime: Date.UTC(2026, 9, 13, 3, 0, 0),
      endTime: Date.UTC(2026, 9, 13, 3, 25, 0),
      durationMinutes: 25,
      inputContent: '有内容'
    });
    const result = sessionStore.updateFocusSession('focus-2', { inputContent: '' });
    assert.equal(result.ok, true);
    assert.equal(sessionStore.loadAllSessions().focusSessions[0].inputContent, '');
  });
});
