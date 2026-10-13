function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatLocalDateTime(ts) {
  if (ts == null) return '';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ` +
    `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

function shouldExport(rows) {
  return Array.isArray(rows) && rows.length > 0;
}

function buildExportRows(sessions) {
  if (!Array.isArray(sessions)) return [];
  return sessions.map((s) => {
    const isRest = s.type === 'rest';
    return {
      类型: isRest ? '休息' : '专注',
      开始时间: formatLocalDateTime(s.startTime),
      结束时间: formatLocalDateTime(s.endTime),
      '时长（分钟）': s.durationMinutes == null ? '' : s.durationMinutes,
      事项: isRest ? '' : (s.inputContent == null ? '' : String(s.inputContent))
    };
  });
}

function csvEscape(value) {
  const str = value == null ? '' : String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function mdCell(value) {
  return String(value == null ? '' : value)
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, '<br>');
}

function sessionsToCsv(sessions) {
  const rows = buildExportRows(sessions);
  const headers = ['类型', '开始时间', '结束时间', '时长（分钟）', '事项'];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

function sessionsToMarkdown(sessions) {
  const rows = buildExportRows(sessions);
  const headers = ['类型', '开始时间', '结束时间', '时长（分钟）', '事项'];
  const lines = [
    '# TimeEnd 专注与休息记录',
    '',
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`
  ];
  for (const row of rows) {
    lines.push(`| ${headers.map((h) => mdCell(row[h])).join(' | ')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

function normalizeFormat(format) {
  return String(format || '').toLowerCase() === 'md' ? 'md' : 'csv';
}

function detectExportFormat(filePath) {
  const lower = String(filePath || '').toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
  return 'csv';
}

function renderExportContent(sessions, format) {
  return normalizeFormat(format) === 'md'
    ? sessionsToMarkdown(sessions)
    : sessionsToCsv(sessions);
}

function buildExportFilename({ filterLabel, now = new Date(), format = 'md' } = {}) {
  const d = now instanceof Date ? now : new Date(now);
  const stamp =
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-` +
    `${pad2(d.getHours())}${pad2(d.getMinutes())}`;
  const label = (filterLabel == null || filterLabel === '' ? '记录' : String(filterLabel)).replace(/[\\/:*?"<>|]/g, '_');
  const ext = normalizeFormat(format) === 'md' ? 'md' : 'csv';
  return `TimeEnd-记录-${label}-${stamp}.${ext}`;
}

module.exports = {
  shouldExport,
  buildExportRows,
  sessionsToCsv,
  sessionsToMarkdown,
  buildExportFilename,
  detectExportFormat,
  renderExportContent,
  formatLocalDateTime
};
