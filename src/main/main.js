const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Timer = require('./timer');
const Store = require('electron-store');

const store = new Store();

let mainWindow = null;
let interruptWindow = null;
let timer = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
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

function createInterruptWindow() {
  if (interruptWindow) {
    interruptWindow.focus();
    return;
  }

  interruptWindow = new BrowserWindow({
    width: 600,
    height: 400,
    alwaysOnTop: true,
    modal: true,
    resizable: false,
    frame: true,
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    // icon: path.join(__dirname, '../../assets/icon.png') // 可选：添加图标文件
  });

  interruptWindow.loadFile(path.join(__dirname, '../renderer/interrupt.html'));

  interruptWindow.on('closed', () => {
    interruptWindow = null;
  });

  // 阻止关闭窗口，直到用户输入内容
  interruptWindow.on('close', (event) => {
    event.preventDefault();
    interruptWindow.webContents.send('check-input');
  });
}

app.whenReady().then(() => {
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

// IPC 通信处理
ipcMain.on('start-timer', (event, duration) => {
  if (timer) {
    timer.stop();
  }
  timer = new Timer(duration, (remaining) => {
    mainWindow.webContents.send('timer-update', remaining);
  }, () => {
    // 计时结束回调
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
  }
});

ipcMain.on('resume-timer', () => {
  if (timer) {
    timer.resume();
  }
});

ipcMain.on('stop-timer', () => {
  if (timer) {
    timer.stop();
    timer = null;
    mainWindow.webContents.send('timer-stopped');
  }
});

ipcMain.on('interrupt-submitted', (event, inputText) => {
  // 更新统计数据
  const stats = store.get('stats', {
    completedSessions: 0,
    todayMinutes: 0,
    totalMinutes: 0,
    lastDate: new Date().toDateString()
  });

  // 获取配置的专注时长
  const config = store.get('config', {
    focusDuration: 25,
    breakDuration: 5
  });

  stats.completedSessions += 1;
  stats.todayMinutes += config.focusDuration;
  stats.totalMinutes += config.focusDuration;
  stats.lastDate = new Date().toDateString();

  store.set('stats', stats);

  // 关闭中断窗口
  if (interruptWindow) {
    interruptWindow.destroy();
    interruptWindow = null;
  }

  // 更新主窗口统计数据
  mainWindow.webContents.send('stats-updated', stats);
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
    breakDuration: 5
  });
  event.reply('config-loaded', config);
});

ipcMain.on('save-config', (event, config) => {
  store.set('config', config);
  event.reply('config-saved');
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
