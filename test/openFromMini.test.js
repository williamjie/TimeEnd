const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { planOpenSettingsFromMini } = require('../src/main/openFromMini');

describe('openFromMini settings', () => {
  it('shows main settings modal without destroying the mini window', () => {
    const plan = planOpenSettingsFromMini();
    assert.equal(plan.keepMiniWindow, true);
    assert.equal(plan.showMainWindow, true);
    assert.equal(plan.focusMainWindow, true);
    assert.equal(plan.mainRendererEvent, 'show-config-modal');
  });
});
