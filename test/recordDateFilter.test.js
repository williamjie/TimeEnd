const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { parseDateInput, formatDateYmd } = require('../src/renderer/scripts/recordDateFilter');

describe('recordDateFilter', () => {
  it('parses valid YYYY-MM-DD', () => {
    assert.deepEqual(parseDateInput('2026-10-13'), { ok: true, value: '2026-10-13' });
    assert.deepEqual(parseDateInput(' 2026-01-01 '), { ok: true, value: '2026-01-01' });
  });

  it('rejects invalid format or impossible dates', () => {
    assert.equal(parseDateInput('2026/10/13').ok, false);
    assert.equal(parseDateInput('2026-13-01').ok, false);
    assert.equal(parseDateInput('2026-02-30').ok, false);
    assert.equal(parseDateInput('').ok, false);
    assert.equal(parseDateInput('abc').ok, false);
  });

  it('formats Date to YYYY-MM-DD', () => {
    assert.equal(formatDateYmd(new Date(2026, 9, 13)), '2026-10-13');
    assert.equal(formatDateYmd(new Date(2026, 0, 5)), '2026-01-05');
  });
});
