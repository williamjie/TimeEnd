/**
 * 按周分文件存储专注/休息记录，避免 config.json 过大。
 * 每周一个文件：sessions/2026-W06.json，历史周自动保留；取数时合并当前周与所有历史周文件。
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

function getSessionsDir() {
  const dir = path.join(app.getPath('userData'), 'sessions');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** 时间戳对应的周 key：该周周一日期 YYYY-MM-DD，如 2026-02-02 */
function getWeekKey(timestamp) {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - (day === 0 ? 7 : day) + 1;
  const monday = new Date(d);
  monday.setDate(diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const dayOfMonth = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayOfMonth}`;
}

function getWeekFilePath(weekKey) {
  return path.join(getSessionsDir(), `${weekKey}.json`);
}

/** 读取某一周的文件，不存在返回 { focusSessions: [], restSessions: [] } */
function loadWeek(weekKey) {
  const filePath = getWeekFilePath(weekKey);
  if (!fs.existsSync(filePath)) {
    return { focusSessions: [], restSessions: [] };
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return {
      focusSessions: Array.isArray(data.focusSessions) ? data.focusSessions : [],
      restSessions: Array.isArray(data.restSessions) ? data.restSessions : []
    };
  } catch (e) {
    return { focusSessions: [], restSessions: [] };
  }
}

/** 写入某一周的文件 */
function saveWeek(weekKey, data) {
  const filePath = getWeekFilePath(weekKey);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 0), 'utf8');
}

/** 追加一条专注记录到对应周文件 */
function appendFocusSession(session) {
  const weekKey = getWeekKey(session.endTime || session.startTime);
  const data = loadWeek(weekKey);
  data.focusSessions.push(session);
  saveWeek(weekKey, data);
}

/** 追加一条休息记录到对应周文件 */
function appendRestSession(session) {
  const weekKey = getWeekKey(session.endTime || session.startTime);
  const data = loadWeek(weekKey);
  data.restSessions.push(session);
  saveWeek(weekKey, data);
}

/** 列出所有周 key（按文件名），用于合并读取 */
function listWeekKeys() {
  const dir = getSessionsDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => path.basename(f, '.json')).sort();
}

/** 从所有周文件合并出 focusSessions 和 restSessions（用于按天/周/月查询） */
function loadAllSessions() {
  const keys = listWeekKeys();
  let focusSessions = [];
  let restSessions = [];
  for (const weekKey of keys) {
    const data = loadWeek(weekKey);
    focusSessions = focusSessions.concat(data.focusSessions);
    restSessions = restSessions.concat(data.restSessions);
  }
  return { focusSessions, restSessions };
}

module.exports = {
  getWeekKey,
  loadWeek,
  saveWeek,
  appendFocusSession,
  appendRestSession,
  loadAllSessions,
  listWeekKeys
};
