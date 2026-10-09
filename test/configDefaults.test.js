const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { defaultConfig, mergeSavedConfig } = require('../src/main/configDefaults');

describe('configDefaults', () => {
  it('defaults autoStartNextFocus to false so rest never auto-starts without opt-in', () => {
    assert.equal(defaultConfig().autoStartNextFocus, false);
  });

  it('mergeSavedConfig persists autoStartNextFocus from incoming config', () => {
    const next = mergeSavedConfig(
      defaultConfig(),
      { focusDuration: 25, breakDuration: 5, autoStartNextFocus: true }
    );
    assert.equal(next.autoStartNextFocus, true);
  });

  it('mergeSavedConfig keeps autoStartNextFocus false when omitted', () => {
    const prev = { ...defaultConfig(), autoStartNextFocus: false };
    const next = mergeSavedConfig(prev, { focusDuration: 30, breakDuration: 10 });
    assert.equal(next.autoStartNextFocus, false);
    assert.equal(next.focusDuration, 30);
    assert.equal(next.breakDuration, 10);
  });
});
