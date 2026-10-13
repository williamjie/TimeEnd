const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  buildExportRows,
  sessionsToCsv,
  sessionsToMarkdown,
  buildExportFilename,
  detectExportFormat,
  renderExportContent,
  shouldExport
} = require('../src/main/sessionsExport');

describe('sessionsExport', () => {
  const focus = {
    type: 'focus',
    startTime: Date.UTC(2026, 9, 13, 1, 0, 0),
    endTime: Date.UTC(2026, 9, 13, 1, 25, 0),
    durationMinutes: 25,
    inputContent: '写方案,含逗号'
  };
  const rest = {
    type: 'rest',
    startTime: Date.UTC(2026, 9, 13, 1, 25, 0),
    endTime: Date.UTC(2026, 9, 13, 1, 30, 0),
    durationMinutes: 5
  };

  it('shouldExport is false for empty list', () => {
    assert.equal(shouldExport([]), false);
    assert.equal(shouldExport(null), false);
    assert.equal(shouldExport([focus]), true);
  });

  it('buildExportRows maps focus and rest columns', () => {
    const rows = buildExportRows([focus, rest]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].类型, '专注');
    assert.equal(rows[0].事项, '写方案,含逗号');
    assert.equal(rows[0]['时长（分钟）'], 25);
    assert.equal(rows[1].类型, '休息');
    assert.equal(rows[1].事项, '');
  });

  it('sessionsToCsv includes BOM and escaped commas/quotes', () => {
    const csv = sessionsToCsv([focus]);
    assert.ok(csv.charCodeAt(0) === 0xfeff);
    assert.ok(csv.includes('类型,开始时间,结束时间,时长（分钟）,事项'));
    assert.ok(csv.includes('"写方案,含逗号"'));
  });

  it('sessionsToMarkdown builds a markdown table and escapes pipes', () => {
    const md = sessionsToMarkdown([
      { ...focus, inputContent: '含|竖线' },
      rest
    ]);
    assert.ok(md.includes('# TimeEnd 专注与休息记录'));
    assert.ok(md.includes('| 类型 | 开始时间 | 结束时间 | 时长（分钟） | 事项 |'));
    assert.ok(md.includes('| --- |'));
    assert.ok(md.includes('含\\|竖线'));
    assert.ok(md.includes('| 休息 |'));
  });

  it('buildExportFilename supports md and csv extensions', () => {
    const now = new Date(2026, 9, 13, 10, 37, 0);
    assert.equal(
      buildExportFilename({ filterLabel: '2026-10-13', now, format: 'md' }),
      'TimeEnd-记录-2026-10-13-20261013-1037.md'
    );
    assert.equal(
      buildExportFilename({ filterLabel: '2026-10-13', now, format: 'csv' }),
      'TimeEnd-记录-2026-10-13-20261013-1037.csv'
    );
  });

  it('detectExportFormat reads extension from path', () => {
    assert.equal(detectExportFormat('a/b/c.md'), 'md');
    assert.equal(detectExportFormat('a/b/c.CSV'), 'csv');
    assert.equal(detectExportFormat('a/b/c.txt'), 'csv');
  });

  it('renderExportContent picks markdown or csv by format', () => {
    const md = renderExportContent([focus], 'md');
    const csv = renderExportContent([focus], 'csv');
    assert.ok(md.includes('| 类型 |'));
    assert.equal(csv.charCodeAt(0), 0xfeff);
  });
});
