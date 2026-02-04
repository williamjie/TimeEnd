const { ipcRenderer } = require('electron');

let timerState = {
    isRunning: false,
    isPaused: false,
    remaining: 0
};

let config = {
    focusDuration: 25,
    breakDuration: 5
};

let stats = {
    completedSessions: 0,
    todayMinutes: 0,
    totalMinutes: 0
};

/** 休息开始时间戳，null 表示未在休息 */
let restStartTime = null;
let restTickId = null;

// DOM 元素
const timeDisplay = document.getElementById('time-display');
const statusText = document.getElementById('status-text');
const startBtn = document.getElementById('start-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const configBtn = document.getElementById('config-btn');
const configModal = document.getElementById('config-modal');
const closeModal = document.querySelector('.close');
const saveConfigBtn = document.getElementById('save-config-btn');
const cancelConfigBtn = document.getElementById('cancel-config-btn');
const focusInput = document.getElementById('focus-input');
const breakInput = document.getElementById('break-input');
const focusDurationDisplay = document.getElementById('focus-duration');
const breakDurationDisplay = document.getElementById('break-duration');
const restStatItem = document.getElementById('rest-stat-item');
const restMinutesEl = document.getElementById('rest-minutes');

// 加载配置与状态
ipcRenderer.send('get-config');
ipcRenderer.send('get-stats');
ipcRenderer.send('get-rest-state');

// 监听配置加载
ipcRenderer.on('config-loaded', (event, loadedConfig) => {
    config = loadedConfig;
    focusInput.value = config.focusDuration;
    breakInput.value = config.breakDuration;
    focusDurationDisplay.textContent = config.focusDuration;
    breakDurationDisplay.textContent = config.breakDuration;
    updateTimeDisplay(config.focusDuration * 60);
});

// 监听统计数据加载
ipcRenderer.on('stats-loaded', (event, loadedStats) => {
    stats = loadedStats;
    updateStats();
});

// 监听统计数据更新
ipcRenderer.on('stats-updated', (event, updatedStats) => {
    stats = updatedStats;
    updateStats();
});

// 休息开始（结束或停止后）
ipcRenderer.on('rest-started', (event, startTimestamp) => {
    startRestTick(startTimestamp);
});

// 休息清零（再次开始专注时）
ipcRenderer.on('rest-cleared', () => {
    clearRest();
});

// 页面加载时恢复休息状态（如窗口刷新）
ipcRenderer.on('rest-state-loaded', (event, startTimestamp) => {
    if (startTimestamp != null) {
        startRestTick(startTimestamp);
    } else {
        clearRest();
    }
});

// 更新统计数据显示
function updateStats() {
    document.getElementById('completed-sessions').textContent = stats.completedSessions;
    document.getElementById('today-minutes').textContent = stats.todayMinutes;
    document.getElementById('total-minutes').textContent = stats.totalMinutes;
}

// 开始休息计时：显示「本次休息」并每秒更新
function startRestTick(startTimestamp) {
    restStartTime = startTimestamp;
    restStatItem.style.display = 'flex';
    function tick() {
        if (restStartTime == null) return;
        const elapsedMs = Date.now() - restStartTime;
        const minutes = Math.floor(elapsedMs / 60000);
        restMinutesEl.textContent = minutes;
    }
    tick();
    if (restTickId) clearInterval(restTickId);
    restTickId = setInterval(tick, 1000);
}

// 休息清零：隐藏并停止计时
function clearRest() {
    restStartTime = null;
    if (restTickId) {
        clearInterval(restTickId);
        restTickId = null;
    }
    restStatItem.style.display = 'none';
    restMinutesEl.textContent = '0';
}

// 格式化时间显示
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// 更新时间显示
function updateTimeDisplay(seconds) {
    timeDisplay.textContent = formatTime(seconds);
}

// 监听计时器更新
ipcRenderer.on('timer-update', (event, remaining) => {
    timerState.remaining = remaining;
    updateTimeDisplay(remaining);
    
    if (!timerState.isRunning) {
        timerState.isRunning = true;
        statusText.textContent = '专注中';
        statusText.className = 'status-text focusing';
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
    }
});

// 监听计时器停止（主进程会同时发 rest-started，此处不重复处理休息）
ipcRenderer.on('timer-stopped', () => {
    timerState.isRunning = false;
    timerState.isPaused = false;
    statusText.textContent = '已停止';
    statusText.className = 'status-text';
    updateTimeDisplay(config.focusDuration * 60);
    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stopBtn.disabled = true;
});

// 开始按钮
startBtn.addEventListener('click', () => {
    ipcRenderer.send('start-timer', config.focusDuration);
});

// 暂停按钮
pauseBtn.addEventListener('click', () => {
    if (timerState.isPaused) {
        ipcRenderer.send('resume-timer');
        pauseBtn.textContent = '暂停';
        statusText.textContent = '专注中';
        timerState.isPaused = false;
    } else {
        ipcRenderer.send('pause-timer');
        pauseBtn.textContent = '继续';
        statusText.textContent = '已暂停';
        timerState.isPaused = true;
    }
});

// 停止按钮
stopBtn.addEventListener('click', () => {
    if (confirm('确定要停止计时吗？')) {
        ipcRenderer.send('stop-timer');
        pauseBtn.textContent = '暂停';
    }
});

// 配置按钮
configBtn.addEventListener('click', () => {
    configModal.classList.add('show');
    focusInput.value = config.focusDuration;
    breakInput.value = config.breakDuration;
});

// 关闭模态框
closeModal.addEventListener('click', () => {
    configModal.classList.remove('show');
});

cancelConfigBtn.addEventListener('click', () => {
    configModal.classList.remove('show');
});

// 保存配置
saveConfigBtn.addEventListener('click', () => {
    const newConfig = {
        focusDuration: parseInt(focusInput.value) || 25,
        breakDuration: parseInt(breakInput.value) || 5
    };
    
    if (newConfig.focusDuration < 1 || newConfig.focusDuration > 120) {
        alert('专注时长必须在1-120分钟之间');
        return;
    }
    
    if (newConfig.breakDuration < 1 || newConfig.breakDuration > 60) {
        alert('休息时长必须在1-60分钟之间');
        return;
    }
    
    ipcRenderer.send('save-config', newConfig);
    config = newConfig;
    focusDurationDisplay.textContent = config.focusDuration;
    breakDurationDisplay.textContent = config.breakDuration;
    
    if (!timerState.isRunning) {
        updateTimeDisplay(config.focusDuration * 60);
    }
    
    configModal.classList.remove('show');
});

// 点击模态框外部关闭
configModal.addEventListener('click', (e) => {
    if (e.target === configModal) {
        configModal.classList.remove('show');
    }
});

// 初始化显示
updateTimeDisplay(config.focusDuration * 60);
