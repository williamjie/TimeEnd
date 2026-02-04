const { ipcRenderer } = require('electron');

let timerState = {
    isRunning: false,
    isPaused: false,
    remaining: 0
};

let config = {
    focusDuration: 25,
    breakDuration: 5,
    openAtLogin: false
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
const openAtLoginInput = document.getElementById('open-at-login-input');
const focusDurationDisplay = document.getElementById('focus-duration');
const breakDurationDisplay = document.getElementById('break-duration');
const restStatItem = document.getElementById('rest-stat-item');
const restMinutesEl = document.getElementById('rest-minutes');
const minimizeBtn = document.getElementById('minimize-btn');
const recordBtn = document.getElementById('record-btn');
const recordModal = document.getElementById('record-modal');
const recordClose = document.querySelector('.record-close');
const recordListEl = document.getElementById('record-list');
const recordDateInput = document.getElementById('record-date');
const recordFocusCount = document.getElementById('record-focus-count');
const recordFocusMin = document.getElementById('record-focus-min');
const recordRestMin = document.getElementById('record-rest-min');

// 加载配置与状态
ipcRenderer.send('get-config');
ipcRenderer.send('get-stats');
ipcRenderer.send('get-rest-state');

// 监听配置加载
ipcRenderer.on('config-loaded', (event, loadedConfig) => {
    config = loadedConfig;
    focusInput.value = config.focusDuration;
    breakInput.value = config.breakDuration;
    openAtLoginInput.checked = !!config.openAtLogin;
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
        breakDuration: parseInt(breakInput.value) || 5,
        openAtLogin: openAtLoginInput.checked
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

// 开机自启动：勾选/取消时立即生效，无需点保存
openAtLoginInput.addEventListener('change', () => {
    const enabled = openAtLoginInput.checked;
    config.openAtLogin = enabled;
    ipcRenderer.send('set-open-at-login', enabled);
});

// 点击模态框外部关闭
configModal.addEventListener('click', (e) => {
    if (e.target === configModal) {
        configModal.classList.remove('show');
    }
});

// 最小化：仅显示时间的小窗口，可拖动
minimizeBtn.addEventListener('click', () => {
    ipcRenderer.send('enter-minimize');
});

// ---------- 记录弹窗 ----------
let recordQuery = { type: 'day', value: null };

function formatRecordTime(ts) {
    const d = new Date(ts);
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function loadRecordSessions() {
    ipcRenderer.send('get-sessions', recordQuery);
}

function renderRecordList(data) {
    const { focusSessions, restSessions, summary } = data;
    recordFocusCount.textContent = summary.focusCount;
    recordFocusMin.textContent = summary.focusTotalMinutes;
    recordRestMin.textContent = summary.restTotalMinutes;
    const merged = [];
    focusSessions.forEach((s) => merged.push({ type: 'focus', ...s }));
    restSessions.forEach((s) => merged.push({ type: 'rest', ...s }));
    merged.sort((a, b) => (b.endTime || 0) - (a.endTime || 0));
    if (merged.length === 0) {
        recordListEl.innerHTML = '<div class="record-list-empty">该时间段暂无记录</div>';
        return;
    }
    recordListEl.innerHTML = merged.map((item) => {
        if (item.type === 'focus') {
            const timeStr = formatRecordTime(item.startTime) + ' ~ ' + formatRecordTime(item.endTime);
            const content = item.inputContent ? `<div class="record-item-content">${escapeHtml(item.inputContent)}</div>` : '';
            return `<div class="record-item focus">
                <div class="record-item-time">${timeStr}</div>
                <div class="record-item-duration">专注 ${item.durationMinutes} 分钟</div>
                ${content}
            </div>`;
        }
        const timeStr = formatRecordTime(item.startTime) + ' ~ ' + formatRecordTime(item.endTime);
        return `<div class="record-item rest">
            <div class="record-item-time">${timeStr}</div>
            <div class="record-item-duration">休息 ${item.durationMinutes} 分钟</div>
        </div>`;
    }).join('');
}

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

ipcRenderer.on('sessions-loaded', (event, data) => {
    renderRecordList(data);
});

recordBtn.addEventListener('click', () => {
    recordModal.classList.add('show');
    const today = new Date();
    recordDateInput.value = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    recordQuery = { type: 'day', value: null };
    loadRecordSessions();
});

recordClose.addEventListener('click', () => {
    recordModal.classList.remove('show');
});

recordModal.addEventListener('click', (e) => {
    if (e.target === recordModal) recordModal.classList.remove('show');
});

document.querySelectorAll('.record-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.record-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.record-range').forEach((r) => r.style.display = 'none');
        const type = tab.dataset.type;
        recordQuery.type = type;
        if (type === 'day') {
            document.querySelector('.day-range').style.display = 'flex';
            recordQuery.value = recordDateInput.value || null;
        } else if (type === 'week') {
            document.querySelector('.week-range').style.display = 'flex';
            const d = new Date();
            recordQuery.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        } else {
            document.querySelector('.month-range').style.display = 'flex';
            const d = new Date();
            recordQuery.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        }
        loadRecordSessions();
    });
});

document.querySelectorAll('.record-range .btn-range').forEach((btn) => {
    btn.addEventListener('click', () => {
        const offset = parseInt(btn.dataset.offset, 10);
        if (recordQuery.type === 'day') {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            recordDateInput.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
            recordQuery.value = recordDateInput.value;
        } else if (recordQuery.type === 'week') {
            const d = new Date();
            d.setDate(d.getDate() + offset * 7);
            recordQuery.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        } else {
            const d = new Date();
            d.setMonth(d.getMonth() + offset);
            recordQuery.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        }
        loadRecordSessions();
    });
});

recordDateInput.addEventListener('change', () => {
    recordQuery.value = recordDateInput.value || null;
    loadRecordSessions();
});

// 初始化显示
updateTimeDisplay(config.focusDuration * 60);
