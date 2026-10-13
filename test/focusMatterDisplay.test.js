const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  MAIN_SUMMARY_MAX,
  MINI_SUMMARY_MAX,
  EMPTY_PLACEHOLDER,
  formatMatterSummary
} = require('../src/renderer/scripts/focusMatterDisplay');

describe('focusMatterDisplay', () => {
  it('exposes default length limits', () => {
    assert.equal(MAIN_SUMMARY_MAX, 16);
    assert.equal(MINI_SUMMARY_MAX, 10);
  });

  it('shows short placeholder when empty', () => {
    const r = formatMatterSummary('', MAIN_SUMMARY_MAX);
    assert.equal(r.display, EMPTY_PLACEHOLDER);
    assert.equal(r.full, '');
    assert.equal(r.truncated, false);
    assert.equal(r.title, '点击编辑事项');
  });

  it('returns full text when within limit', () => {
    const r = formatMatterSummary('写方案', MAIN_SUMMARY_MAX);
    assert.equal(r.display, '写方案');
    assert.equal(r.full, '写方案');
    assert.equal(r.truncated, false);
    assert.equal(r.title, '写方案');
  });

  it('truncates main window summary at 16 chars with ellipsis', () => {
    const full = '一二三四五六七八九十一二三四五六七八'; // 18
    const r = formatMatterSummary(full, MAIN_SUMMARY_MAX);
    assert.equal(r.truncated, true);
    assert.equal(r.display, '一二三四五六七八九十一二三四五六…');
    assert.equal([...r.display].length, 17); // 16 chars + …
    assert.equal(r.full, full);
    assert.equal(r.title, full);
  });

  it('truncates mini summary at 10 chars', () => {
    const full = 'abcdefghijkl'; // 12
    const r = formatMatterSummary(full, MINI_SUMMARY_MAX);
    assert.equal(r.display, 'abcdefghij…');
    assert.equal(r.title, full);
    assert.equal(r.truncated, true);
  });

  it('trims whitespace before measuring', () => {
    const r = formatMatterSummary('  hello  ', 16);
    assert.equal(r.display, 'hello');
    assert.equal(r.full, 'hello');
  });
});
