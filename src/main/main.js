const { app, BrowserWindow, ipcMain, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Timer = require('./timer');
const Store = require('electron-store');
const sessionStore = require('./sessionStore');
const { defaultConfig, mergeSavedConfig } = require('./configDefaults');
const {
  buildExportFilename,
  shouldExport,
  detectExportFormat,
  renderExportContent
} = require('./sessionsExport');
const {
  decideOnRestFinished,
  shouldBeginRestAfterInterrupt,
  shouldBeginRestOnFocusComplete,
  saveRestIfAny,
  shouldShowWorkPrompt,
  miniStatusWhenRestBegins,
  nextRestFinishedStandby,
  buildRestStatePayload,
  elapsedRestMinutes
} = require('./restLifecycle');
const { shouldOpenWorkPrompt, workPromptWindowOptions } = require('./workPrompt');
const { planOpenSettingsFromMini } = require('./openFromMini');
const { createFocusMatterState } = require('./focusMatter');

const store = new Store();
const focusMatter = createFocusMatterState();

function broadcastFocusMatterUpdated() {
  sendToWindows('focus-matter-updated', { content: focusMatter.get() });
}

let mainWindow = null;
let interruptWindow = null;
let miniWindow = null; // 最小化时仅显示时间的小窗口
let workPromptWindow = null;
let timer = null;
let restTimer = null;
/** 休息开始时间戳，null 表示未在休息；结束/停止后设置，开始专注时清零 */
let restStartTime = null;
/** 暂停期间的休息开始时间，用于暂停时也显示本次休息；继续时冻结显示，停止时清零 */
let pauseRestStartTime = null;
/** 继续后冻结的休息分钟数（停止前保留），用于窗口加载时恢复显示 */
let frozenRestMinutes = null;
/** 休息倒计时自然结束且未自动开始时，保持待命文案可被窗口重建恢复 */
let restFinishedStandby = false;
/** 进入 finished-standby 时冻结的「本次休息」分钟数 */
let lastRestElapsedMinutes = null;
/** 当前专注开始时间戳，用于写入专注记录 */
let focusStartTime = null;
/** 用户点击「停止」后暂存的结束时间，弹窗提交/关闭后用于写入专注记录 */
let pendingStopEndTime = null;
/** 当前中断弹窗模式：'interrupt' 自然结束必填，'stop' 停止后选填 */
let interruptMode = 'interrupt';
/** 小窗层级模式：top 始终置顶；bottom 取消置顶尽量不挡住其他窗口 */
let miniWindowLayerMode = 'top';

function sendToWindows(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send(channel, ...args);
  }
}

function interruptIsOpen() {
  return !!(interruptWindow && !interruptWindow.isDestroyed());
}

function focusIsRunning() {
  return !!(timer && timer.isRunning);
}

function stopRestTimer() {
  if (restTimer) {
    restTimer.stop();
    restTimer = null;
  }
}

function clearRestFinishedStandby() {
  restFinishedStandby = false;
  lastRestElapsedMinutes = null;
}

function currentRestStatePayload() {
  const remaining = restTimer ? restTimer.getRemaining() : null;
  return buildRestStatePayload({
    restStartTime,
    frozenRestMinutes,
    remainingSeconds: remaining,
    restFinishedStandby,
    lastRestElapsedMinutes
  });
}

function sendRestStateTo(target) {
  if (!target || target.isDestroyed()) return;
  const payload = currentRestStatePayload();
  target.webContents.send(
    'rest-state-loaded',
    payload.restStartTime,
    payload.frozenRestMinutes,
    payload.remainingSeconds,
    payload.restFinishedStandby,
    payload.lastRestElapsedMinutes
  );
}

function startRestCountdown() {
  if (!shouldBeginRestAfterInterrupt({
    interruptOpen: interruptIsOpen(),
    focusRunning: focusIsRunning()
  })) {
    return;
  }
  stopRestTimer();
  clearRestFinishedStandby();
  restStartTime = Date.now();
  sendToWindows('rest-started', restStartTime);
  const config = store.get('config', defaultConfig());
  const minutes = config.breakDuration || 5;
  restTimer = new Timer(minutes, (remaining) => {
    sendToWindows('rest-remaining', remaining);
  }, () => {
    onRestFinished();
  });
  restTimer.start();
  sendToWindows('rest-remaining', restTimer.getRemaining());
  sendToWindows('mini-status', miniStatusWhenRestBegins());
}

function persistRestIfAny() {
  const saved = saveRestIfAny({
    restStartTime,
    endTime: Date.now(),
    id: restStartTime == null ? 'rest-none' : `rest-${restStartTime}-${Math.random().toString(36).slice(2, 9)}`,
    append: (session) => sessionStore.appendRestSession(session)
  });
  restStartTime = saved.restStartTime;
}

function onRestFinished() {
  const config = store.get('config', defaultConfig());
  const decision = decideOnRestFinished({
    interruptOpen: interruptIsOpen(),
    focusRunning: focusIsRunning(),
    autoStartNextFocus: !!config.autoStartNextFocus
  });
  if (decision.action === 'skip') {
    return;
  }
  stopRestTimer();
  const enterStandby = nextRestFinishedStandby(decision);
  if (enterStandby) {
    lastRestElapsedMinutes = elapsedRestMinutes({
      restStartTime,
      now: Date.now()
    });
    restFinishedStandby = true;
  } else {
    clearRestFinishedStandby();
  }
  if (decision.persistRest) {
    persistRestIfAny();
  }
  const autoStarted = decision.action === 'auto-start';
  sendToWindows('rest-finished', { autoStarted });
  if (autoStarted) {
    startFocusTimer(config.focusDuration || 25);
    if (shouldShowWorkPrompt({ autoStartNextFocus: true, naturalRestComplete: true })) {
      createWorkPromptWindow();
    }
  }
}

function startFocusTimer(duration) {
  stopRestTimer();
  persistRestIfAny();
  clearRestFinishedStandby();
  frozenRestMinutes = null;
  sendToWindows('rest-cleared');
  focusMatter.beginFocus();
  focusStartTime = Date.now();
  sendToWindows('focus-matter-visibility', { visible: true });
  broadcastFocusMatterUpdated();
  if (timer) {
    timer.stop();
  }
  timer = new Timer(duration, (remaining) => {
    sendToWindows('timer-update', remaining);
  }, () => {
    frozenRestMinutes = null;
    if (timer) {
      timer.stop();
      timer = null;
    }
    if (shouldBeginRestOnFocusComplete()) {
      startRestCountdown();
    }
    createInterruptWindow();
  });
  timer.start();
  sendToWindows('timer-update', timer.getRemaining());
}

function createWorkPromptWindow() {
  const alreadyOpen = !!(workPromptWindow && !workPromptWindow.isDestroyed());
  if (!shouldOpenWorkPrompt({ alreadyOpen })) {
    if (alreadyOpen) {
      workPromptWindow.focus();
    }
    return;
  }
  const opts = workPromptWindowOptions();
  workPromptWindow = new BrowserWindow({
    ...opts,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  workPromptWindow.loadFile(path.join(__dirname, '../renderer/work-prompt.html'));
  workPromptWindow.on('closed', () => {
    workPromptWindow = null;
  });
}

function createMainWindow() {
  mainWindow = 
  new BrowserWindow({
    width: 500,
    height: 600,
    resizable: true,
    frame: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // icon: path.join(__dirname, '../../assets/icon.png') // 可选：添加图标文件
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 加载保存的统计数据
  const stats = store.get('stats', {
    completedSessions: 0,
    todayMinutes: 0,
    totalMinutes: 0,
    lastDate: new Date().toDateString()
  });

  // 检查是否是新的日期，重置今日数据
  const today = new Date().toDateString();
  if (stats.lastDate !== today) {
    stats.todayMinutes = 0;
    stats.lastDate = today;
    store.set('stats', stats);
  }

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('stats-loaded', stats);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * @param {'interrupt'|'stop'} mode - 'interrupt' 自然结束必填；'stop' 停止后选填，可跳过
 */
function createInterruptWindow(mode = 'interrupt') {
  if (interruptWindow) {
    interruptWindow.focus();
    return;
  }

  sendToWindows('focus-matter-visibility', { visible: false });
  interruptMode = mode;
  const interruptParent = miniWindow && !miniWindow.isDestroyed() ? miniWindow : mainWindow;
  interruptWindow = new BrowserWindow({
    width: 600,
    height: 400,
    alwaysOnTop: true,
    modal: true,
    resizable: false,
    frame: true,
    parent: interruptParent,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // icon: path.join(__dirname, '../../assets/icon.png') // 可选：添加图标文件
  });

  interruptWindow.loadFile(path.join(__dirname, '../renderer/interrupt.html'));

  interruptWindow.webContents.on('did-finish-load', () => {
    interruptWindow.webContents.send('interrupt-mode', {
      mode: interruptMode,
      draft: focusMatter.get()
    });
  });

  interruptWindow.on('closed', () => {
    interruptWindow = null;
    if (interruptMode === 'stop' && pendingStopEndTime != null) {
      runStopAftermath('');
    }
    interruptMode = 'interrupt';
  });

  // 关闭时：stop 模式视为跳过（有草稿则写入草稿）；interrupt 模式必须输入
  interruptWindow.on('close', (event) => {
    if (interruptMode === 'stop') {
      event.preventDefault();
      if (pendingStopEndTime != null) runStopAftermath('');
      return;
    }
    event.preventDefault();
    interruptWindow.webContents.send('check-input');
  });
}

/** 停止后弹窗提交/关闭后的统一收尾：写专注记录、发 timer-stopped、开始休息 */
function runStopAftermath(inputContent) {
  if (pendingStopEndTime == null) return;
  saveFocusSession(pendingStopEndTime, inputContent || '');
  focusStartTime = null;
  pauseRestStartTime = null;
  frozenRestMinutes = null;
  pendingStopEndTime = null;
  sendToWindows('focus-matter-visibility', { visible: false });
  if (interruptWindow) {
    interruptWindow.destroy();
    interruptWindow = null;
  }
  interruptMode = 'interrupt';
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rest-cleared');
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('rest-cleared');
  }
  startRestCountdown();
}

/** 将小窗放在主窗口所在显示器工作区右下角（留出边距） */
function positionMiniWindowBottomRight() {
  if (!miniWindow || miniWindow.isDestroyed()) return;
  const [winW, winH] = miniWindow.getSize();
  let display = screen.getPrimaryDisplay();
  if (mainWindow && !mainWindow.isDestroyed()) {
    const b = mainWindow.getBounds();
    display = screen.getDisplayNearestPoint({
      x: b.x + Math.max(1, Math.floor(b.width / 2)),
      y: b.y + Math.max(1, Math.floor(b.height / 2))
    });
  }
  const wa = display.workArea;
  const margin = 8;
  const px = wa.x + wa.width - winW - margin;
  const py = wa.y + wa.height - winH - margin;
  miniWindow.setPosition(Math.round(px), Math.round(py));
}

function syncMiniWindowLayerMode() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('mini-layer-mode', miniWindowLayerMode);
  }
}

function applyMiniWindowLayerMode(mode = 'top') {
  miniWindowLayerMode = mode === 'bottom' ? 'bottom' : 'top';
  if (!miniWindow || miniWindow.isDestroyed()) return;
  if (miniWindowLayerMode === 'top') {
    miniWindow.setAlwaysOnTop(true, 'screen-saver');
    if (typeof miniWindow.moveTop === 'function') {
      miniWindow.moveTop();
    }
  } else {
    miniWindow.setAlwaysOnTop(false);
    miniWindow.blur();
  }
  syncMiniWindowLayerMode();
}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    applyMiniWindowLayerMode(miniWindowLayerMode);
    positionMiniWindowBottomRight();
    miniWindow.focus();
    return;
  }
  miniWindow = new BrowserWindow({
    width: 260,
    height: 304,
    frame: false,
    resizable: false,
    alwaysOnTop: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  applyMiniWindowLayerMode(miniWindowLayerMode);
  miniWindow.loadFile(path.join(__dirname, '../renderer/mini.html'));
  miniWindow.on('closed', () => {
    miniWindow = null;
  });
  // 同步当前计时、状态、配置、休息、事项到小窗口
  miniWindow.webContents.on('did-finish-load', () => {
    positionMiniWindowBottomRight();
    syncMiniWindowLayerMode();
    const config = store.get('config', defaultConfig());
    miniWindow.webContents.send('config-loaded', config);
    sendRestStateTo(miniWindow);
    if (timer) {
      miniWindow.webContents.send('timer-update', timer.getRemaining());
      miniWindow.webContents.send('mini-status', { isRunning: true, isPaused: timer.isPaused });
      miniWindow.webContents.send('focus-matter-visibility', { visible: true });
      miniWindow.webContents.send('focus-matter-updated', { content: focusMatter.get() });
    } else {
      miniWindow.webContents.send('mini-status', { isRunning: false, isPaused: false });
      miniWindow.webContents.send('focus-matter-visibility', { visible: false });
    }
  });
}

app.whenReady().then(() => {
  // 一次性迁移：将 config 中的旧记录迁移到按周文件，避免 config.json 过大
  const oldFocus = store.get('focusSessions', []);
  const oldRest = store.get('restSessions', []);
  if (oldFocus.length > 0 || oldRest.length > 0) {
    try {
      oldFocus.forEach((s) => sessionStore.appendFocusSession(s));
      oldRest.forEach((s) => sessionStore.appendRestSession(s));
      store.delete('focusSessions');
      store.delete('restSessions');
    } catch (e) {
      console.warn('session migration:', e.message);
    }
  }
  // 应用启动时同步开机自启动设置
  const config = store.get('config', defaultConfig());
  if (process.platform === 'win32' || process.platform === 'darwin') {
    try {
      app.setLoginItemSettings({ openAtLogin: !!config.openAtLogin });
    } catch (e) {
      console.warn('setLoginItemSettings:', e.message);
    }
  }
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function saveRestSessionIfAny() {
  persistRestIfAny();
}

// 写入专注记录（提交为空时回退到进行中草稿）
function saveFocusSession(endTime, inputContent) {
  if (focusStartTime == null) return;
  const durationMinutes = Math.round((endTime - focusStartTime) / 60000);
  const resolved = focusMatter.resolveForSave(inputContent);
  sessionStore.appendFocusSession({
    id: `focus-${focusStartTime}-${Math.random().toString(36).slice(2, 9)}`,
    startTime: focusStartTime,
    endTime,
    durationMinutes,
    inputContent: resolved
  });
  focusMatter.clear();
  broadcastFocusMatterUpdated();
}

// 按时间段筛选并排序（结束时间倒序），从当前周 + 所有历史周文件合并取数
function getSessionsInRange(type, value) {
  const { focusSessions: allFocus, restSessions: allRest } = sessionStore.loadAllSessions();
  const focusSessions = allFocus;
  const restSessions = allRest;
  let startTs = 0;
  let endTs = Date.now() + 86400000;
  const toDate = (ts) => new Date(ts);
  if (type === 'day') {
    const d = value ? new Date(value) : new Date();
    startTs = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    endTs = startTs + 86400000;
  } else if (type === 'week') {
    const d = value ? new Date(value) : new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d);
    monday.setDate(diff);
    startTs = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate()).getTime();
    endTs = startTs + 7 * 86400000;
  } else if (type === 'month') {
    const [y, m] = value ? value.split('-').map(Number) : [new Date().getFullYear(), new Date().getMonth() + 1];
    startTs = new Date(y, m - 1, 1).getTime();
    endTs = new Date(y, m, 0).getTime() + 86400000;
  }
  const inRange = (s, useEnd = true) => {
    const t = useEnd ? (s.endTime != null ? s.endTime : s.startTime) : s.startTime;
    return t >= startTs && t < endTs;
  };
  const focus = focusSessions.filter((s) => inRange(s)).sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  const rest = restSessions.filter((s) => inRange(s)).sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  const summary = {
    focusCount: focus.length,
    focusTotalMinutes: focus.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
    restTotalMinutes: rest.reduce((sum, s) => sum + (s.durationMinutes || 0), 0)
  };
  return { focusSessions: focus, restSessions: rest, summary };
}

// IPC 通信处理
ipcMain.on('start-timer', (event, duration) => {
  startFocusTimer(duration);
});

ipcMain.on('pause-timer', () => {
  if (timer) {
    timer.pause();
    // 暂停期间也计算并显示本次休息，直到停止后再清零
    pauseRestStartTime = Date.now();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rest-started', pauseRestStartTime);
    }
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send('rest-started', pauseRestStartTime);
      miniWindow.webContents.send('mini-status', { isRunning: true, isPaused: true });
    }
  }
});

ipcMain.on('resume-timer', () => {
  if (timer) {
    timer.resume();
    // 继续时冻结本次休息显示（保留当前分钟数，停止后再清零）
    if (pauseRestStartTime != null) {
      const elapsedMinutes = Math.floor((Date.now() - pauseRestStartTime) / 60000);
      frozenRestMinutes = elapsedMinutes;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('rest-frozen', elapsedMinutes);
      }
      if (miniWindow && !miniWindow.isDestroyed()) {
        miniWindow.webContents.send('rest-frozen', elapsedMinutes);
      }
      pauseRestStartTime = null;
    }
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send('mini-status', { isRunning: true, isPaused: false });
    }
  }
});

ipcMain.on('stop-timer', () => {
  if (timer) {
    const endTime = Date.now();
    pendingStopEndTime = endTime;
    timer.stop();
    timer = null;
    sendToWindows('focus-matter-visibility', { visible: false });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer-stopped');
    }
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send('mini-status', { isRunning: false, isPaused: false });
    }
    createInterruptWindow('stop');
  }
});

ipcMain.on('interrupt-submitted', (event, inputText) => {
  if (pendingStopEndTime != null) {
    runStopAftermath(inputText || '');
    return;
  }
  const endTime = Date.now();
  saveFocusSession(endTime, inputText);
  focusStartTime = null;
  sendToWindows('focus-matter-visibility', { visible: false });
  // 更新统计数据（仅自然结束更新）
  const stats = store.get('stats', {
    completedSessions: 0,
    todayMinutes: 0,
    totalMinutes: 0,
    lastDate: new Date().toDateString()
  });

  const config = store.get('config', defaultConfig());

  stats.completedSessions += 1;
  stats.todayMinutes += config.focusDuration;
  stats.totalMinutes += config.focusDuration;
  stats.lastDate = new Date().toDateString();

  store.set('stats', stats);

  if (interruptWindow) {
    interruptWindow.destroy();
    interruptWindow = null;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('stats-updated', stats);
  }
  startRestCountdown();
});

ipcMain.on('get-current-focus-matter', (event) => {
  event.reply('current-focus-matter', { content: focusMatter.get() });
});

ipcMain.on('set-current-focus-matter', (event, content) => {
  focusMatter.set(content);
  const payload = { content: focusMatter.get() };
  event.reply('current-focus-matter', payload);
  broadcastFocusMatterUpdated();
});

ipcMain.on('update-focus-session', (event, { id, inputContent }) => {
  const result = sessionStore.updateFocusSession(id, { inputContent });
  event.reply('focus-session-updated', result);
});

ipcMain.on('export-sessions', async (event, { type, value, filterLabel } = {}) => {
  const result = getSessionsInRange(type || 'day', value);
  const merged = [];
  (result.focusSessions || []).forEach((s) => merged.push({ type: 'focus', ...s }));
  (result.restSessions || []).forEach((s) => merged.push({ type: 'rest', ...s }));
  merged.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
  if (!shouldExport(merged)) {
    event.reply('sessions-exported', { ok: false, reason: 'empty' });
    return;
  }
  const defaultName = buildExportFilename({
    filterLabel: filterLabel || value || type || '记录',
    format: 'md'
  });
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: '导出记录',
    defaultPath: defaultName,
    filters: [
      { name: 'Markdown (.md)', extensions: ['md'] },
      { name: 'Excel CSV (.csv)', extensions: ['csv'] }
    ]
  });
  if (canceled || !filePath) {
    event.reply('sessions-exported', { ok: false, reason: 'cancelled' });
    return;
  }
  try {
    const format = detectExportFormat(filePath);
    fs.writeFileSync(filePath, renderExportContent(merged, format), 'utf8');
    event.reply('sessions-exported', { ok: true, filePath, format });
  } catch (e) {
    event.reply('sessions-exported', { ok: false, reason: 'write-failed', message: e.message });
  }
});

ipcMain.on('resize-mini-for-matter', (event, { visible } = {}) => {
  if (!miniWindow || miniWindow.isDestroyed()) return;
  const [w] = miniWindow.getSize();
  const baseH = 304;
  const withMatterH = 332;
  miniWindow.setSize(w, visible ? withMatterH : baseH);
  positionMiniWindowBottomRight();
});

ipcMain.on('close-interrupt', (event, hasInput) => {
  if (hasInput && interruptWindow) {
    interruptWindow.destroy();
    interruptWindow = null;
  }
});

ipcMain.on('get-config', (event) => {
  const config = store.get('config', defaultConfig());
  event.reply('config-loaded', mergeSavedConfig(defaultConfig(), config));
});

ipcMain.on('save-config', (event, config) => {
  const prev = store.get('config', defaultConfig());
  const next = mergeSavedConfig(prev, config);
  store.set('config', next);
  event.reply('config-saved', next);
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('config-loaded', next);
  }
});

// 开机自启动：勾选/取消时立即生效
ipcMain.on('set-open-at-login', (event, enabled) => {
  const config = store.get('config', defaultConfig());
  config.openAtLogin = !!enabled;
  store.set('config', config);
  if (process.platform === 'win32' || process.platform === 'darwin') {
    try {
      app.setLoginItemSettings({ openAtLogin: !!enabled });
    } catch (e) {
      console.warn('setLoginItemSettings:', e.message);
    }
  }
});

ipcMain.on('get-stats', (event) => {
  const stats = store.get('stats', {
    completedSessions: 0,
    todayMinutes: 0,
    totalMinutes: 0,
    lastDate: new Date().toDateString()
  });
  event.reply('stats-loaded', stats);
});

// 获取当前休息状态（用于窗口刷新后恢复显示）
ipcMain.on('get-rest-state', (event) => {
  const payload = currentRestStatePayload();
  event.reply(
    'rest-state-loaded',
    payload.restStartTime,
    payload.frozenRestMinutes,
    payload.remainingSeconds,
    payload.restFinishedStandby,
    payload.lastRestElapsedMinutes
  );
});

ipcMain.on('close-work-prompt', () => {
  if (workPromptWindow && !workPromptWindow.isDestroyed()) {
    workPromptWindow.destroy();
    workPromptWindow = null;
  }
});

// 进入最小化：隐藏主窗口，显示仅时间的小窗口
ipcMain.on('enter-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
    createMiniWindow();
  }
});

// 小窗口点击「记录」：显示主窗口并打开记录弹窗
ipcMain.on('open-record-from-mini', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('show-record-modal');
  }
});

// 小窗口点击「设置」：显示主窗口并打开设置弹窗（不销毁小窗）
ipcMain.on('open-settings-from-mini', () => {
  const plan = planOpenSettingsFromMini();
  if (!plan.showMainWindow || !mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  if (plan.focusMainWindow) mainWindow.focus();
  mainWindow.webContents.send(plan.mainRendererEvent);
});

// 最小化到后台：小窗口最小化到任务栏
ipcMain.on('minimize-to-background', () => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.minimize();
  }
});

ipcMain.on('set-mini-layer-mode', (event, mode) => {
  applyMiniWindowLayerMode(mode);
});

// 退出程序
ipcMain.on('quit-app', () => {
  app.quit();
});

// 从最小化还原：显示主窗口，关闭小窗口，同步状态
ipcMain.on('restore-from-mini', () => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.destroy();
    miniWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    if (timer) {
      mainWindow.webContents.send('timer-update', timer.getRemaining());
    }
    sendRestStateTo(mainWindow);
  }
});

// 记录查询：按天/周/月
ipcMain.on('get-sessions', (event, { type, value }) => {
  const result = getSessionsInRange(type || 'day', value);
  event.reply('sessions-loaded', result);
});
