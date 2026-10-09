const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  canFinishRest,
  decideOnRestFinished,
  shouldBeginRestAfterInterrupt,
  shouldBeginRestOnFocusComplete,
  buildRestSession,
  saveRestIfAny,
  shouldShowWorkPrompt,
  miniStatusWhenRestBegins,
  nextRestFinishedStandby,
  buildRestStatePayload,
  elapsedRestMinutes
} = require('../src/main/restLifecycle');

describe('restLifecycle', () => {
  it('does not begin rest on focus complete before the interrupt window closes', () => {
    assert.equal(shouldBeginRestOnFocusComplete(), false);
  });

  it('begins rest only after interrupt window is closed and no focus timer is running', () => {
    assert.equal(shouldBeginRestAfterInterrupt({ interruptOpen: true, focusRunning: false }), false);
    assert.equal(shouldBeginRestAfterInterrupt({ interruptOpen: false, focusRunning: true }), false);
    assert.equal(shouldBeginRestAfterInterrupt({ interruptOpen: false, focusRunning: false }), true);
  });

  it('refuses to finish rest while interrupt is open or focus is running', () => {
    assert.equal(canFinishRest({ interruptOpen: true, focusRunning: false }), false);
    assert.equal(canFinishRest({ interruptOpen: false, focusRunning: true }), false);
    assert.equal(canFinishRest({ interruptOpen: false, focusRunning: false }), true);
  });

  it('on rest finished without autoStart stays standby, persists rest, and does not prompt', () => {
    const decision = decideOnRestFinished({
      interruptOpen: false,
      focusRunning: false,
      autoStartNextFocus: false
    });
    assert.deepEqual(decision, {
      action: 'standby',
      persistRest: true,
      broadcast: 'rest-finished',
      showWorkPrompt: false
    });
  });

  it('on rest finished with autoStart starts next focus and shows work prompt', () => {
    const decision = decideOnRestFinished({
      interruptOpen: false,
      focusRunning: false,
      autoStartNextFocus: true
    });
    assert.deepEqual(decision, {
      action: 'auto-start',
      persistRest: true,
      broadcast: 'rest-finished',
      showWorkPrompt: true
    });
  });

  it('skips rest finished when safety assertions fail', () => {
    const decision = decideOnRestFinished({
      interruptOpen: true,
      focusRunning: false,
      autoStartNextFocus: true
    });
    assert.equal(decision.action, 'skip');
    assert.equal(decision.persistRest, false);
    assert.equal(decision.showWorkPrompt, false);
  });

  it('builds a rest session from start/end and saveRestIfAny writes once then clears start', () => {
    const start = 1_700_000_000_000;
    const end = start + 5 * 60 * 1000;
    const session = buildRestSession({ restStartTime: start, endTime: end, id: 'rest-1' });
    assert.equal(session.startTime, start);
    assert.equal(session.endTime, end);
    assert.equal(session.durationMinutes, 5);

    const written = [];
    let restStartTime = start;
    const first = saveRestIfAny({
      restStartTime,
      endTime: end,
      id: 'rest-1',
      append: (s) => written.push(s)
    });
    restStartTime = first.restStartTime;
    assert.equal(written.length, 1);
    assert.equal(restStartTime, null);

    saveRestIfAny({
      restStartTime,
      endTime: end + 1000,
      id: 'rest-2',
      append: (s) => written.push(s)
    });
    assert.equal(written.length, 1);
  });

  it('marks both windows idle when rest countdown begins so Start is enabled', () => {
    assert.deepEqual(miniStatusWhenRestBegins(), { isRunning: false, isPaused: false });
  });

  it('does not show work prompt on manual early start', () => {
    assert.equal(shouldShowWorkPrompt({ autoStartNextFocus: true, naturalRestComplete: false }), false);
    assert.equal(shouldShowWorkPrompt({ autoStartNextFocus: true, naturalRestComplete: true }), true);
    assert.equal(shouldShowWorkPrompt({ autoStartNextFocus: false, naturalRestComplete: true }), false);
  });

  it('enters finished-standby only when rest ends without auto-start', () => {
    assert.equal(nextRestFinishedStandby({ action: 'standby' }), true);
    assert.equal(nextRestFinishedStandby({ action: 'auto-start' }), false);
    assert.equal(nextRestFinishedStandby({ action: 'skip' }), false);
  });

  it('buildRestStatePayload keeps finished-standby so remount can restore copy', () => {
    assert.deepEqual(
      buildRestStatePayload({
        restStartTime: null,
        frozenRestMinutes: null,
        remainingSeconds: null,
        restFinishedStandby: true,
        lastRestElapsedMinutes: 4
      }),
      {
        restStartTime: null,
        frozenRestMinutes: null,
        remainingSeconds: null,
        restFinishedStandby: true,
        lastRestElapsedMinutes: 4
      }
    );
  });

  it('elapsedRestMinutes floors active rest length and is zero when no start', () => {
    const start = 1_700_000_000_000;
    assert.equal(elapsedRestMinutes({ restStartTime: start, now: start + 4.9 * 60 * 1000 }), 4);
    assert.equal(elapsedRestMinutes({ restStartTime: null, now: start }), 0);
  });
});
