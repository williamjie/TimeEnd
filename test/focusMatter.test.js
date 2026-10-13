const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createFocusMatterState, resolveFocusContent } = require('../src/main/focusMatter');

describe('focusMatter', () => {
  it('starts empty and get/set/clear manage draft', () => {
    const matter = createFocusMatterState();
    assert.equal(matter.get(), '');
    matter.set('写方案');
    assert.equal(matter.get(), '写方案');
    matter.clear();
    assert.equal(matter.get(), '');
  });

  it('set coerces null/undefined to empty string', () => {
    const matter = createFocusMatterState();
    matter.set(null);
    assert.equal(matter.get(), '');
    matter.set(undefined);
    assert.equal(matter.get(), '');
  });

  it('resolveFocusContent prefers non-empty submitted text over draft', () => {
    assert.equal(resolveFocusContent({ submitted: '最终', draft: '草稿' }), '最终');
    assert.equal(resolveFocusContent({ submitted: '  最终  ', draft: '草稿' }), '最终');
  });

  it('resolveFocusContent falls back to draft when submitted empty', () => {
    assert.equal(resolveFocusContent({ submitted: '', draft: '草稿' }), '草稿');
    assert.equal(resolveFocusContent({ submitted: '   ', draft: '草稿' }), '草稿');
    assert.equal(resolveFocusContent({ submitted: null, draft: '草稿' }), '草稿');
  });

  it('resolveFocusContent returns empty when both empty', () => {
    assert.equal(resolveFocusContent({ submitted: '', draft: '' }), '');
  });

  it('beginFocus clears any previous draft', () => {
    const matter = createFocusMatterState();
    matter.set('上一轮');
    matter.beginFocus();
    assert.equal(matter.get(), '');
  });
});
