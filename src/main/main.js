const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Timer = require('./timer');
const Store = require('electron-store');
const sessionStore = require('./sessionStore');

const store = new Store();

let mainWindow = null;
let interruptWindow = null;
let miniWindow = null; // 最小化时仅显示时间的小窗口
let timer = null;
/** 休息开始时间戳，null 表示未在休息；结束/停止后设置，开始专注时清零 */
let restStartTime = null;
/** 暂停期间的休息开始时间，用于暂停时也显示本次休息；继续时冻结显示，停止时清零 */
let pauseRestStartTime = null;
/** 继续后冻结的休息分钟数（停止前保留），用于窗口加载时恢复显示 */
let frozenRestMinutes = null;
/** 当前专注开始时间戳，用于写入专注记录 */
let focusStartTime = null;
/** 用户点击「停止」后暂存的结束时间，弹窗提交/关闭后用于写入专注记录 */
let pendingStopEndTime = null;
/** 当前中断弹窗模式：'interrupt' 自然结束必填，'stop' 停止后选填 */
let interruptMode = 'interrupt';

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
    interruptWindow.webContents.send('interrupt-mode', interruptMode);
  });

  interruptWindow.on('closed', () => {
    interruptWindow = null;
    if (interruptMode === 'stop' && pendingStopEndTime != null) {
      runStopAftermath('');
    }
    interruptMode = 'interrupt';
  });

  // 关闭时：stop 模式视为跳过，写空内容并收尾；interrupt 模式必须输入
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
  restStartTime = Date.now();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rest-started', restStartTime);
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('rest-started', restStartTime);
  }
}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.focus();
    return;
  }
  miniWindow = new BrowserWindow({
    width: 250,
    height: 148,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    transparent: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  miniWindow.loadFile(path.join(__dirname, '../renderer/mini.html'));
  miniWindow.on('closed', () => {
    miniWindow = null;
  });
  // 同步当前计时、状态、配置、休息到小窗口
  miniWindow.webContents.on('did-finish-load', () => {
    const config = store.get('config', { focusDuration: 25, breakDuration: 5 });
    miniWindow.webContents.send('config-loaded', config);
    miniWindow.webContents.send('rest-state-loaded', restStartTime, frozenRestMinutes);
    if (timer) {
      miniWindow.webContents.send('timer-update', timer.getRemaining());
      miniWindow.webContents.send('mini-status', { isRunning: true, isPaused: timer.isPaused });
    } else {
      miniWindow.webContents.send('mini-status', { isRunning: false, isPaused: false });
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
  const config = store.get('config', { focusDuration: 25, breakDuration: 5, openAtLogin: false });
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

// 写入休息记录（在点击「开始」专注时调用，restStartTime 存在则写一条）
function saveRestSessionIfAny() {
  if (restStartTime == null) return;
  const endTime = Date.now();
  const durationMinutes = Math.round((endTime - restStartTime) / 60000);
  sessionStore.appendRestSession({
    id: `rest-${restStartTime}-${Math.random().toString(36).slice(2, 9)}`,
    startTime: restStartTime,
    endTime,
    durationMinutes
  });
}

// 写入专注记录
function saveFocusSession(endTime, inputContent) {
  if (focusStartTime == null) return;
  const durationMinutes = Math.round((endTime - focusStartTime) / 60000);
  sessionStore.appendFocusSession({
    id: `focus-${focusStartTime}-${Math.random().toString(36).slice(2, 9)}`,
    startTime: focusStartTime,
    endTime,
    durationMinutes,
    inputContent: inputContent || ''
  });
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
  // 再次开始专注前：写入本次休息记录并清零
  saveRestSessionIfAny();
  restStartTime = null;
  frozenRestMinutes = null;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('rest-cleared');
  }
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.webContents.send('rest-cleared');
  }
  focusStartTime = Date.now();
  if (timer) {
    timer.stop();
  }
  timer = new Timer(duration, (remaining) => {
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send('timer-update', remaining);
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('timer-update', remaining);
    }
  }, () => {
    // 计时结束回调：开始记录休息时间
    frozenRestMinutes = null;
    restStartTime = Date.now();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('rest-started', restStartTime);
    }
    if (miniWindow && !miniWindow.isDestroyed()) {
      miniWindow.webContents.send('rest-started', restStartTime);
    }
    createInterruptWindow();
    if (timer) {
      timer.stop();
      timer = null;
    }
  });
  timer.start();
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
  // 更新统计数据（仅自然结束更新）
  const stats = store.get('stats', {
    completedSessions: 0,
    todayMinutes: 0,
    totalMinutes: 0,
    lastDate: new Date().toDateString()
  });

  const config = store.get('config', {
    focusDuration: 25,
    breakDuration: 5
  });

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
});

ipcMain.on('close-interrupt', (event, hasInput) => {
  if (hasInput && interruptWindow) {
    interruptWindow.destroy();
    interruptWindow = null;
  }
});

ipcMain.on('get-config', (event) => {
  const config = store.get('config', {
    focusDuration: 25,
    breakDuration: 5,
    openAtLogin: false
  });
  event.reply('config-loaded', config);
});

ipcMain.on('save-config', (event, config) => {
  const prev = store.get('config', {});
  const next = { ...prev, focusDuration: config.focusDuration, breakDuration: config.breakDuration };
  if (config.openAtLogin !== undefined) next.openAtLogin = config.openAtLogin;
  store.set('config', next);
  event.reply('config-saved');
});

// 开机自启动：勾选/取消时立即生效
ipcMain.on('set-open-at-login', (event, enabled) => {
  const config = store.get('config', { focusDuration: 25, breakDuration: 5, openAtLogin: false });
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
  event.reply('rest-state-loaded', restStartTime);
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

// 最小化到后台：小窗口最小化到任务栏
ipcMain.on('minimize-to-background', () => {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.minimize();
  }
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
      mainWindow.webContents.send('rest-state-loaded', restStartTime, frozenRestMinutes);
    }
  }
});

// 记录查询：按天/周/月
ipcMain.on('get-sessions', (event, { type, value }) => {
  const result = getSessionsInRange(type || 'day', value);
  event.reply('sessions-loaded', result);
});
