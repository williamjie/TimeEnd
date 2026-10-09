const { ipcRenderer } = require('electron');

let computeSalaryState = () => ({
  configured: false,
  main: {
    payLine: '',
    workLine: '请先设置工资信息（设置里填写上下班与日工资）。',
    moneyLine: ''
  },
  mini: {
    line1: '',
    line2: '请先设置工资信息',
    line3: ''
  },
  raw: {}
});

try {
  ({ computeSalaryState } = require('./scripts/salary'));
} catch (primaryError) {
  try {
    ({ computeSalaryState } = require('./salary'));
  } catch (fallbackError) {
    console.error('工资模块加载失败，已降级为无工资展示模式。', primaryError, fallbackError);
  }
}

let formatRestRemaining;
let restFinishedUi;
let restRemainingUi;
let restStateLoadedUi;
try {
  ({ formatRestRemaining, restFinishedUi, restRemainingUi, restStateLoadedUi } = require('./scripts/restDisplay'));
} catch (primaryError) {
  ({ formatRestRemaining, restFinishedUi, restRemainingUi, restStateLoadedUi } = require('./restDisplay'));
}

const timeDisplay = document.getElementById('time-display');
const statusText = document.getElementById('status-text');
const restRow = document.getElementById('rest-row');
const restMinutesEl = document.getElementById('rest-minutes');
const restRemainingRow = document.getElementById('rest-remaining-row');
const restRemainingEl = document.getElementById('rest-remaining');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const recordBtnMini = document.getElementById('record-btn-mini');
const settingsBtnMini = document.getElementById('settings-btn-mini');
const restoreBtn = document.getElementById('restore-btn');
const layerTopBtn = document.getElementById('layer-top-btn');
const layerBottomBtn = document.getElementById('layer-bottom-btn');
const minimizeToBackgroundBtn = document.getElementById('minimize-to-background-btn');
const quitAppBtn = document.getElementById('quit-app-btn');
const salaryLine1 = document.getElementById('salary-mini-line1');
const salaryLine2 = document.getElementById('salary-mini-line2');
const salaryLine3 = document.getElementById('salary-mini-line3');

let miniConfig = {
  focusDuration: 25,
  breakDuration: 5,
  openAtLogin: false,
  workStartTime: '',
  workEndTime: '',
  dailySalary: '',
  payday: ''
};
let isRunning = false;
let isPaused = false;
let restStartTime = null;
let restFinishedStandby = false;
let restTickId = null;
let salaryTickId = null;
let miniLayerMode = 'top';

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateButtons() {
  startBtn.disabled = isRunning;
  pauseBtn.disabled = !isRunning;
  stopBtn.disabled = !isRunning;
  if (isRunning) {
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
  } else {
    pauseBtn.textContent = '暂停';
  }
}

function updateLayerButtons() {
  layerTopBtn.classList.toggle('active', miniLayerMode === 'top');
  layerBottomBtn.classList.toggle('active', miniLayerMode === 'bottom');
}

function refreshSalaryMini() {
  const state = computeSalaryState(miniConfig);
  if (!state.configured) {
    salaryLine1.textContent = '';
    salaryLine2.textContent = state.mini.line2;
    salaryLine3.textContent = '';
    return;
  }
  salaryLine1.textContent = state.mini.line1;
  salaryLine2.textContent = state.mini.line2;
  salaryLine3.textContent = state.mini.line3;
}

function startSalaryTick() {
  refreshSalaryMini();
  if (salaryTickId) clearInterval(salaryTickId);
  salaryTickId = setInterval(refreshSalaryMini, 1000);
}

function startRestTick(startTimestamp) {
  restFinishedStandby = false;
  restStartTime = startTimestamp;
  restRow.classList.add('show');
  function tick() {
    if (restStartTime == null) return;
    const elapsedMs = Date.now() - restStartTime;
    restMinutesEl.textContent = Math.floor(elapsedMs / 60000);
  }
  tick();
  if (restTickId) clearInterval(restTickId);
  restTickId = setInterval(tick, 1000);
}

function hideRestRemaining() {
  if (!restRemainingRow || !restRemainingEl) return;
  restRemainingRow.classList.remove('show');
  restRemainingEl.textContent = formatRestRemaining(0);
}

function showRestRemaining(remainingSeconds) {
  if (!restRemainingRow || !restRemainingEl) return;
  const ui = restRemainingUi(remainingSeconds);
  restRemainingEl.textContent = ui.text;
  restRemainingRow.classList.toggle('show', ui.show);
}

function applyRestFinished(autoStarted) {
  const ui = restFinishedUi({ autoStarted: !!autoStarted });
  hideRestRemaining();
  isRunning = !ui.startEnabled;
  isPaused = false;
  if (ui.keepElapsed) {
    restFinishedStandby = true;
    if (restTickId) {
      clearInterval(restTickId);
      restTickId = null;
    }
    restRow.classList.add('show');
    statusText.textContent = ui.status;
    statusText.className = 'status-text';
    updateButtons();
  } else {
    restFinishedStandby = false;
    clearRest();
    statusText.textContent = ui.status;
    statusText.className = 'status-text focusing';
    updateButtons();
  }
}

function restoreFinishedStandby(elapsedMinutes) {
  restFinishedStandby = true;
  restStartTime = null;
  if (restTickId) {
    clearInterval(restTickId);
    restTickId = null;
  }
  hideRestRemaining();
  restRow.classList.add('show');
  restMinutesEl.textContent = elapsedMinutes == null ? '0' : String(elapsedMinutes);
  const ui = restFinishedUi({ autoStarted: false });
  isRunning = !ui.startEnabled;
  isPaused = false;
  statusText.textContent = ui.status;
  statusText.className = 'status-text';
  updateButtons();
}

function clearRest() {
  restStartTime = null;
  restFinishedStandby = false;
  if (restTickId) {
    clearInterval(restTickId);
    restTickId = null;
  }
  restRow.classList.remove('show');
  restMinutesEl.textContent = '0';
  hideRestRemaining();
}

function freezeRest(minutes) {
  restFinishedStandby = false;
  restStartTime = null;
  if (restTickId) {
    clearInterval(restTickId);
    restTickId = null;
  }
  restRow.classList.add('show');
  restMinutesEl.textContent = minutes;
  hideRestRemaining();
}

ipcRenderer.on('config-loaded', (event, cfg) => {
  miniConfig = { ...miniConfig, ...cfg };
  const fd = miniConfig.focusDuration != null ? miniConfig.focusDuration : 25;
  miniConfig.focusDuration = fd;
  if (!isRunning) {
    timeDisplay.textContent = formatTime(fd * 60);
  }
  startSalaryTick();
});

ipcRenderer.on('rest-state-loaded', (event, startTimestamp, frozenMinutes, remainingSeconds, finishedStandby, elapsedMinutes) => {
  const ui = restStateLoadedUi({
    startTimestamp,
    frozenMinutes,
    remainingSeconds,
    restFinishedStandby: finishedStandby,
    elapsedMinutes
  });
  if (ui.mode === 'elapsed') {
    startRestTick(startTimestamp);
    if (ui.remaining.show) {
      showRestRemaining(remainingSeconds);
    }
  } else if (ui.mode === 'frozen') {
    freezeRest(frozenMinutes);
  } else if (ui.mode === 'finished-standby') {
    restoreFinishedStandby(ui.elapsedMinutes);
  } else {
    clearRest();
  }
});

ipcRenderer.on('timer-update', (event, remaining) => {
  restFinishedStandby = false;
  timeDisplay.textContent = formatTime(remaining);
  if (!statusText.classList.contains('focusing')) {
    statusText.textContent = '专注中';
    statusText.className = 'status-text focusing';
  }
  isRunning = true;
  isPaused = false;
  updateButtons();
});

ipcRenderer.on('mini-status', (event, { isRunning: running, isPaused: paused }) => {
  isRunning = running;
  isPaused = paused;
  const fd = miniConfig.focusDuration != null ? miniConfig.focusDuration : 25;
  if (!running) {
    if (restFinishedStandby) {
      statusText.textContent = restFinishedUi({ autoStarted: false }).status;
    } else {
      statusText.textContent = restStartTime != null ? '休息中' : '准备就绪';
    }
    statusText.className = 'status-text';
    timeDisplay.textContent = formatTime(fd * 60);
  } else if (paused) {
    statusText.textContent = '已暂停';
    statusText.className = 'status-text paused';
  } else {
    statusText.textContent = '专注中';
    statusText.className = 'status-text focusing';
  }
  updateButtons();
});

ipcRenderer.on('rest-started', (event, startTimestamp) => {
  startRestTick(startTimestamp);
});

ipcRenderer.on('rest-remaining', (event, remainingSeconds) => {
  showRestRemaining(remainingSeconds);
});

ipcRenderer.on('rest-finished', (event, payload) => {
  applyRestFinished(payload && payload.autoStarted);
});

ipcRenderer.on('rest-cleared', () => {
  clearRest();
});

ipcRenderer.on('rest-frozen', (event, minutes) => {
  freezeRest(minutes);
});

ipcRenderer.on('mini-layer-mode', (event, mode) => {
  miniLayerMode = mode === 'bottom' ? 'bottom' : 'top';
  updateLayerButtons();
});

startBtn.addEventListener('click', () => {
  ipcRenderer.send('start-timer', miniConfig.focusDuration || 25);
});

pauseBtn.addEventListener('click', () => {
  if (isPaused) {
    ipcRenderer.send('resume-timer');
  } else {
    ipcRenderer.send('pause-timer');
  }
});

stopBtn.addEventListener('click', () => {
  if (confirm('确定要停止计时吗？')) {
    ipcRenderer.send('stop-timer');
  }
});

recordBtnMini.addEventListener('click', () => {
  ipcRenderer.send('open-record-from-mini');
});

settingsBtnMini.addEventListener('click', () => {
  ipcRenderer.send('open-settings-from-mini');
});

restoreBtn.addEventListener('click', () => {
  ipcRenderer.send('restore-from-mini');
});

layerTopBtn.addEventListener('click', () => {
  ipcRenderer.send('set-mini-layer-mode', 'top');
});

layerBottomBtn.addEventListener('click', () => {
  ipcRenderer.send('set-mini-layer-mode', 'bottom');
});

minimizeToBackgroundBtn.addEventListener('click', () => {
  ipcRenderer.send('minimize-to-background');
});

quitAppBtn.addEventListener('click', () => {
  if (confirm('确定要退出程序吗？')) {
    ipcRenderer.send('quit-app');
  }
});

updateLayerButtons();
startSalaryTick();
