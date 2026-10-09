const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  formatRestRemaining,
  REST_FINISHED_STATUS,
  restFinishedUi,
  restRemainingUi,
  restCountdownControls,
  restStateLoadedUi
} = require('../src/renderer/scripts/restDisplay');

describe('restDisplay', () => {
  it('formats remaining rest as mm:ss', () => {
    assert.equal(formatRestRemaining(5 * 60), '05:00');
    assert.equal(formatRestRemaining(65), '01:05');
    assert.equal(formatRestRemaining(0), '00:00');
  });

  it('shows remaining rest row while countdown is active and hides it when finished', () => {
    assert.deepEqual(restRemainingUi(65), { show: true, text: '01:05' });
    assert.deepEqual(restRemainingUi(null), { show: false, text: '00:00' });
  });

  it('enables Start during a rest countdown but not during a pause rest', () => {
    assert.deepEqual(restCountdownControls({ isPaused: false }), {
      isRunning: false,
      startEnabled: true,
      pauseEnabled: false,
      stopEnabled: false
    });
    assert.equal(restCountdownControls({ isPaused: true }), null);
  });

  it('uses standby copy when rest ends without auto-start', () => {
    assert.equal(REST_FINISHED_STATUS, '休息结束，可开始下一次专注');
    assert.deepEqual(restFinishedUi({ autoStarted: false }), {
      status: REST_FINISHED_STATUS,
      showRemaining: false,
      keepElapsed: true,
      startEnabled: true,
      pauseEnabled: false,
      stopEnabled: false
    });
  });

  it('clears rest elapsed when auto-start moves into focusing', () => {
    assert.deepEqual(restFinishedUi({ autoStarted: true }), {
      status: '专注中',
      showRemaining: false,
      keepElapsed: false,
      startEnabled: false,
      pauseEnabled: true,
      stopEnabled: true
    });
  });

  it('rest-state-loaded with remaining shows countdown while elapsed rest is active', () => {
    const ui = restStateLoadedUi({
      startTimestamp: 1_700_000_000_000,
      frozenMinutes: null,
      remainingSeconds: 90
    });
    assert.equal(ui.mode, 'elapsed');
    assert.deepEqual(ui.remaining, { show: true, text: '01:30' });
  });

  it('rest-state-loaded without remaining hides countdown (pause rest or finished)', () => {
    const countingNoRemain = restStateLoadedUi({
      startTimestamp: 1,
      frozenMinutes: null,
      remainingSeconds: null
    });
    assert.equal(countingNoRemain.remaining.show, false);

    const frozen = restStateLoadedUi({
      startTimestamp: null,
      frozenMinutes: 3,
      remainingSeconds: 120
    });
    assert.equal(frozen.mode, 'frozen');
    assert.equal(frozen.remaining.show, false);
  });

  it('rest-state-loaded restores finished-standby copy after remount without auto-start', () => {
    const ui = restStateLoadedUi({
      startTimestamp: null,
      frozenMinutes: null,
      remainingSeconds: null,
      restFinishedStandby: true,
      elapsedMinutes: 5
    });
    assert.equal(ui.mode, 'finished-standby');
    assert.equal(ui.elapsedMinutes, 5);
    assert.equal(ui.remaining.show, false);
    assert.deepEqual(ui.finished, restFinishedUi({ autoStarted: false }));
  });

  it('rest-state-loaded prefers active rest over finished-standby flag', () => {
    const ui = restStateLoadedUi({
      startTimestamp: 1_700_000_000_000,
      frozenMinutes: null,
      remainingSeconds: 30,
      restFinishedStandby: true,
      elapsedMinutes: 5
    });
    assert.equal(ui.mode, 'elapsed');
  });
});
