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
let restCountdownControls;
let restStateLoadedUi;
try {
    ({ formatRestRemaining, restFinishedUi, restCountdownControls, restStateLoadedUi } = require('./scripts/restDisplay'));
} catch (primaryError) {
    ({ formatRestRemaining, restFinishedUi, restCountdownControls, restStateLoadedUi } = require('./restDisplay'));
}

let parseDateInput;
let formatDateYmd;
try {
    ({ parseDateInput, formatDateYmd } = require('./scripts/recordDateFilter'));
} catch (primaryError) {
    ({ parseDateInput, formatDateYmd } = require('./recordDateFilter'));
}

let formatMatterSummary;
let MAIN_SUMMARY_MAX;
try {
    ({ formatMatterSummary, MAIN_SUMMARY_MAX } = require('./scripts/focusMatterDisplay'));
} catch (primaryError) {
    ({ formatMatterSummary, MAIN_SUMMARY_MAX } = require('./focusMatterDisplay'));
}

let timerState = {
    isRunning: false,
    isPaused: false,
    remaining: 0
};

let config = {
    focusDuration: 25,
    breakDuration: 5,
    openAtLogin: false,
    autoStartNextFocus: false,
    workStartTime: '',
    workEndTime: '',
    dailySalary: '',
    payday: ''
};

let stats = {
    completedSessions: 0,
    todayMinutes: 0,
    totalMinutes: 0
};

/** 休息开始时间戳，null 表示未在休息 */
let restStartTime = null;
let restTickId = null;
let salaryTickId = null;

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
const autoStartNextFocusInput = document.getElementById('auto-start-next-focus-input');
const openAtLoginInput = document.getElementById('open-at-login-input');
const workStartInput = document.getElementById('work-start-input');
const workEndInput = document.getElementById('work-end-input');
const dailySalaryInput = document.getElementById('daily-salary-input');
const paydayInput = document.getElementById('payday-input');
const salaryPayLine = document.getElementById('salary-pay-line');
const salaryWorkLine = document.getElementById('salary-work-line');
const salaryMoneyLine = document.getElementById('salary-money-line');
const focusDurationDisplay = document.getElementById('focus-duration');
const breakDurationDisplay = document.getElementById('break-duration');
const restStatItem = document.getElementById('rest-stat-item');
const restMinutesEl = document.getElementById('rest-minutes');
const restRemainingItem = document.getElementById('rest-remaining-item');
const restRemainingEl = document.getElementById('rest-remaining');
const minimizeBtn = document.getElementById('minimize-btn');
const recordBtn = document.getElementById('record-btn');
const recordModal = document.getElementById('record-modal');
const recordClose = document.querySelector('.record-close');
const recordListEl = document.getElementById('record-list');
const recordDateInput = document.getElementById('record-date');
const recordDateText = document.getElementById('record-date-text');
const recordFocusCount = document.getElementById('record-focus-count');
const recordFocusMin = document.getElementById('record-focus-min');
const recordRestMin = document.getElementById('record-rest-min');
const focusMatterBtn = document.getElementById('focus-matter-btn');
const focusMatterSummary = document.getElementById('focus-matter-summary');
const focusMatterModal = document.getElementById('focus-matter-modal');
const focusMatterInput = document.getElementById('focus-matter-input');
const focusMatterClose = document.querySelector('.focus-matter-close');
const saveFocusMatterBtn = document.getElementById('save-focus-matter-btn');
const closeFocusMatterBtn = document.getElementById('close-focus-matter-btn');
const exportRecordBtn = document.getElementById('export-record-btn');
let currentFocusMatterContent = '';
let focusMatterUiVisible = false;

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
    autoStartNextFocusInput.checked = !!config.autoStartNextFocus;
    focusDurationDisplay.textContent = config.focusDuration;
    breakDurationDisplay.textContent = config.breakDuration;
    workStartInput.value = config.workStartTime != null ? config.workStartTime : '';
    workEndInput.value = config.workEndTime != null ? config.workEndTime : '';
    dailySalaryInput.value = config.dailySalary !== '' && config.dailySalary != null ? config.dailySalary : '';
    paydayInput.value = config.payday !== '' && config.payday != null ? config.payday : '';
    updateTimeDisplay(config.focusDuration * 60);
    startSalaryTick();
});

ipcRenderer.on('config-saved', (event, fullConfig) => {
    config = fullConfig;
    focusInput.value = config.focusDuration;
    breakInput.value = config.breakDuration;
    openAtLoginInput.checked = !!config.openAtLogin;
    autoStartNextFocusInput.checked = !!config.autoStartNextFocus;
    workStartInput.value = config.workStartTime != null ? config.workStartTime : '';
    workEndInput.value = config.workEndTime != null ? config.workEndTime : '';
    dailySalaryInput.value = config.dailySalary !== '' && config.dailySalary != null ? config.dailySalary : '';
    paydayInput.value = config.payday !== '' && config.payday != null ? config.payday : '';
    focusDurationDisplay.textContent = config.focusDuration;
    breakDurationDisplay.textContent = config.breakDuration;
    if (!timerState.isRunning) {
        updateTimeDisplay(config.focusDuration * 60);
    }
    startSalaryTick();
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

ipcRenderer.on('rest-remaining', (event, remainingSeconds) => {
    showRestRemaining(remainingSeconds);
});

ipcRenderer.on('rest-finished', (event, payload) => {
    applyRestFinished(payload && payload.autoStarted);
});

// 休息清零（再次开始专注时，或停止时先清零再开始新休息）
ipcRenderer.on('rest-cleared', () => {
    clearRest();
});

// 休息冻结（继续后保留当前分钟数，直到停止再清零）
ipcRenderer.on('rest-frozen', (event, minutes) => {
    freezeRest(minutes);
});

// 页面加载时恢复休息状态（如窗口刷新）
ipcRenderer.on('rest-state-loaded', (event, startTimestamp, frozenMinutes, remainingSeconds, restFinishedStandby, elapsedMinutes) => {
    const ui = restStateLoadedUi({
        startTimestamp,
        frozenMinutes,
        remainingSeconds,
        restFinishedStandby,
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

// 更新统计数据显示
function updateStats() {
    document.getElementById('completed-sessions').textContent = stats.completedSessions;
    document.getElementById('today-minutes').textContent = stats.todayMinutes;
    document.getElementById('total-minutes').textContent = stats.totalMinutes;
}

function refreshSalaryMain() {
    const state = computeSalaryState(config);
    if (!state.configured) {
        salaryPayLine.textContent = '';
        salaryWorkLine.textContent = state.main.workLine;
        salaryMoneyLine.textContent = '';
        return;
    }
    salaryPayLine.textContent = state.main.payLine;
    salaryWorkLine.textContent = state.main.workLine;
    salaryMoneyLine.textContent = state.main.moneyLine;
}

function startSalaryTick() {
    refreshSalaryMain();
    if (salaryTickId) clearInterval(salaryTickId);
    salaryTickId = setInterval(refreshSalaryMain, 1000);
}

// 开始休息计时：显示「本次休息」并每秒更新
function startRestTick(startTimestamp) {
    restStartTime = startTimestamp;
    restStatItem.style.display = 'flex';
    const controls = restCountdownControls({ isPaused: timerState.isPaused });
    if (controls) {
        timerState.isRunning = controls.isRunning;
        startBtn.disabled = !controls.startEnabled;
        pauseBtn.disabled = !controls.pauseEnabled;
        stopBtn.disabled = !controls.stopEnabled;
        statusText.textContent = '休息中';
        statusText.className = 'status-text resting';
    }
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
function hideRestRemaining() {
    if (restRemainingItem) {
        restRemainingItem.style.display = 'none';
    }
    if (restRemainingEl) {
        restRemainingEl.textContent = formatRestRemaining(0);
    }
}

function showRestRemaining(remainingSeconds) {
    if (!restRemainingItem || !restRemainingEl) return;
    restRemainingItem.style.display = 'flex';
    restRemainingEl.textContent = formatRestRemaining(remainingSeconds);
}

function applyRestFinished(autoStarted) {
    const ui = restFinishedUi({ autoStarted: !!autoStarted });
    hideRestRemaining();
    startBtn.disabled = !ui.startEnabled;
    pauseBtn.disabled = !ui.pauseEnabled;
    stopBtn.disabled = !ui.stopEnabled;
    if (ui.keepElapsed) {
        if (restTickId) {
            clearInterval(restTickId);
            restTickId = null;
        }
        restStatItem.style.display = 'flex';
        statusText.textContent = ui.status;
        statusText.className = 'status-text resting';
        timerState.isRunning = false;
        timerState.isPaused = false;
    } else {
        clearRest();
        statusText.textContent = ui.status;
        statusText.className = 'status-text focusing';
        timerState.isRunning = true;
        timerState.isPaused = false;
    }
}

function restoreFinishedStandby(elapsedMinutes) {
    if (restTickId) {
        clearInterval(restTickId);
        restTickId = null;
    }
    restStartTime = null;
    hideRestRemaining();
    restStatItem.style.display = 'flex';
    restMinutesEl.textContent = elapsedMinutes == null ? '0' : String(elapsedMinutes);
    const ui = restFinishedUi({ autoStarted: false });
    statusText.textContent = ui.status;
    statusText.className = 'status-text resting';
    timerState.isRunning = false;
    timerState.isPaused = false;
    startBtn.disabled = !ui.startEnabled;
    pauseBtn.disabled = !ui.pauseEnabled;
    stopBtn.disabled = !ui.stopEnabled;
}

function clearRest() {
    restStartTime = null;
    if (restTickId) {
        clearInterval(restTickId);
        restTickId = null;
    }
    restStatItem.style.display = 'none';
    restMinutesEl.textContent = '0';
    hideRestRemaining();
}

// 休息冻结：暂停结束后保留当前分钟数，停止后再清零
function freezeRest(minutes) {
    restStartTime = null;
    if (restTickId) {
        clearInterval(restTickId);
        restTickId = null;
    }
    restStatItem.style.display = 'flex';
    restMinutesEl.textContent = minutes;
    hideRestRemaining();
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

function applyFocusMatterSummary(content) {
    currentFocusMatterContent = content == null ? '' : String(content);
    if (!focusMatterSummary) return;
    const summary = formatMatterSummary(currentFocusMatterContent, MAIN_SUMMARY_MAX);
    focusMatterSummary.textContent = summary.display;
    focusMatterSummary.title = summary.title;
}

function setFocusMatterUiVisible(visible) {
    focusMatterUiVisible = !!visible;
    if (focusMatterBtn) {
        focusMatterBtn.style.display = focusMatterUiVisible ? 'inline-block' : 'none';
    }
    if (focusMatterSummary) {
        focusMatterSummary.style.display = focusMatterUiVisible ? 'block' : 'none';
    }
    if (focusMatterUiVisible) {
        applyFocusMatterSummary(currentFocusMatterContent);
    }
}

function openFocusMatterModal() {
    if (!focusMatterModal) return;
    focusMatterModal.style.display = 'flex';
    focusMatterModal.classList.add('show');
    ipcRenderer.send('get-current-focus-matter');
}

function closeFocusMatterModal(saveDraft) {
    if (!focusMatterModal) return;
    if (saveDraft && focusMatterInput) {
        ipcRenderer.send('set-current-focus-matter', focusMatterInput.value);
    }
    focusMatterModal.classList.remove('show');
    focusMatterModal.style.display = 'none';
}

ipcRenderer.on('current-focus-matter', (event, data) => {
    const content = (data && data.content) || '';
    applyFocusMatterSummary(content);
    if (focusMatterInput && focusMatterModal && focusMatterModal.classList.contains('show')) {
        focusMatterInput.value = content;
        focusMatterInput.focus();
    }
});

ipcRenderer.on('focus-matter-updated', (event, data) => {
    applyFocusMatterSummary((data && data.content) || '');
});

ipcRenderer.on('focus-matter-visibility', (event, data) => {
    setFocusMatterUiVisible(!!(data && data.visible));
});

if (focusMatterBtn) {
    focusMatterBtn.addEventListener('click', openFocusMatterModal);
}
if (focusMatterSummary) {
    focusMatterSummary.addEventListener('click', openFocusMatterModal);
    focusMatterSummary.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFocusMatterModal();
        }
    });
}
if (saveFocusMatterBtn) {
    saveFocusMatterBtn.addEventListener('click', () => {
        ipcRenderer.send('set-current-focus-matter', focusMatterInput ? focusMatterInput.value : '');
        closeFocusMatterModal(false);
    });
}
if (closeFocusMatterBtn) {
    closeFocusMatterBtn.addEventListener('click', () => closeFocusMatterModal(true));
}
if (focusMatterClose) {
    focusMatterClose.addEventListener('click', () => closeFocusMatterModal(true));
}
if (focusMatterModal) {
    focusMatterModal.addEventListener('click', (e) => {
        if (e.target === focusMatterModal) closeFocusMatterModal(true);
    });
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
        setFocusMatterUiVisible(true);
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
    setFocusMatterUiVisible(false);
    closeFocusMatterModal(true);
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
function openConfigModal() {
    configModal.style.display = 'flex';
    configModal.classList.add('show');
    focusInput.value = config.focusDuration;
    breakInput.value = config.breakDuration;
    autoStartNextFocusInput.checked = !!config.autoStartNextFocus;
    workStartInput.value = config.workStartTime != null ? config.workStartTime : '';
    workEndInput.value = config.workEndTime != null ? config.workEndTime : '';
    dailySalaryInput.value = config.dailySalary !== '' && config.dailySalary != null ? config.dailySalary : '';
    paydayInput.value = config.payday !== '' && config.payday != null ? config.payday : '';
}

function closeConfigModalPanel() {
    configModal.classList.remove('show');
    configModal.style.display = 'none';
}

configBtn.addEventListener('click', openConfigModal);

// 关闭模态框
closeModal.addEventListener('click', () => {
    closeConfigModalPanel();
});

cancelConfigBtn.addEventListener('click', () => {
    closeConfigModalPanel();
});

// 保存配置
saveConfigBtn.addEventListener('click', () => {
    const ws = (workStartInput.value || '').trim();
    const we = (workEndInput.value || '').trim();
    const dsRaw = (dailySalaryInput.value || '').trim();
    const pdRaw = (paydayInput.value || '').trim();

    const hasAny = ws !== '' || we !== '' || dsRaw !== '' || pdRaw !== '';
    if (hasAny) {
        if (ws === '' || we === '' || dsRaw === '' || pdRaw === '') {
            alert('工作与工资四项需全部填写，或全部留空。');
            return;
        }
        const pd = parseInt(pdRaw, 10);
        if (Number.isNaN(pd) || pd < 1 || pd > 31) {
            alert('发薪日需在 1-31 之间');
            return;
        }
        const ds = parseFloat(dsRaw);
        if (Number.isNaN(ds) || ds < 0) {
            alert('日工资需为大于等于 0 的数字');
            return;
        }
        const timeRe = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
        if (!timeRe.test(ws) || !timeRe.test(we)) {
            alert('上下班时间请使用 HH:mm，例如 09:00');
            return;
        }
        const [sh, sm] = ws.split(':').map((n) => parseInt(n, 10));
        const [eh, em] = we.split(':').map((n) => parseInt(n, 10));
        const startMin = sh * 60 + sm;
        const endMin = eh * 60 + em;
        if (endMin <= startMin) {
            alert('下班时间必须晚于上班时间（不支持跨天班次）');
            return;
        }
    }

    const newConfig = {
        focusDuration: parseInt(focusInput.value) || 25,
        breakDuration: parseInt(breakInput.value) || 5,
        openAtLogin: openAtLoginInput.checked,
        autoStartNextFocus: autoStartNextFocusInput.checked,
        workStartTime: hasAny ? ws : '',
        workEndTime: hasAny ? we : '',
        dailySalary: hasAny ? parseFloat(dsRaw) : '',
        payday: hasAny ? parseInt(pdRaw, 10) : ''
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
    closeConfigModalPanel();
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
        closeConfigModalPanel();
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
            const contentText = item.inputContent || '';
            return `<div class="record-item focus" data-id="${escapeHtml(item.id || '')}">
                <div class="record-item-header">
                    <div class="record-item-time">${timeStr}</div>
                    <button type="button" class="btn-record-edit" data-id="${escapeHtml(item.id || '')}">编辑</button>
                </div>
                <div class="record-item-meta">
                    <span class="record-item-duration">时长：专注 ${item.durationMinutes} 分钟</span>
                </div>
                <div class="record-item-content record-item-view">
                    <span class="record-item-content-label">事项：</span><span class="record-item-content-text">${contentText ? escapeHtml(contentText) : '<span class="record-item-empty">（未填写）</span>'}</span>
                </div>
                <div class="record-item-edit" style="display:none;">
                    <textarea class="record-edit-input" rows="3">${escapeHtml(contentText)}</textarea>
                    <div class="record-edit-actions">
                        <button type="button" class="btn btn-primary btn-record-save" data-id="${escapeHtml(item.id || '')}">保存</button>
                        <button type="button" class="btn btn-secondary btn-record-cancel">取消</button>
                    </div>
                </div>
            </div>`;
        }
        const timeStr = formatRecordTime(item.startTime) + ' ~ ' + formatRecordTime(item.endTime);
        return `<div class="record-item rest">
            <div class="record-item-time">${timeStr}</div>
            <div class="record-item-meta">
                <span class="record-item-duration">时长：休息 ${item.durationMinutes} 分钟</span>
            </div>
        </div>`;
    }).join('');
}

recordListEl.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.btn-record-edit');
    if (editBtn) {
        const item = editBtn.closest('.record-item');
        if (!item) return;
        item.querySelector('.record-item-view').style.display = 'none';
        item.querySelector('.record-item-edit').style.display = 'block';
        editBtn.style.display = 'none';
        return;
    }
    const cancelBtn = e.target.closest('.btn-record-cancel');
    if (cancelBtn) {
        const item = cancelBtn.closest('.record-item');
        if (!item) return;
        item.querySelector('.record-item-edit').style.display = 'none';
        item.querySelector('.record-item-view').style.display = '';
        const edit = item.querySelector('.btn-record-edit');
        if (edit) edit.style.display = '';
        return;
    }
    const saveBtn = e.target.closest('.btn-record-save');
    if (saveBtn) {
        const id = saveBtn.dataset.id;
        const item = saveBtn.closest('.record-item');
        const textarea = item && item.querySelector('.record-edit-input');
        const inputContent = textarea ? textarea.value : '';
        ipcRenderer.send('update-focus-session', { id, inputContent });
    }
});

ipcRenderer.on('focus-session-updated', (event, result) => {
    if (!result || !result.ok) {
        alert('保存失败，未找到该记录');
        return;
    }
    loadRecordSessions();
});

function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

ipcRenderer.on('sessions-loaded', (event, data) => {
    renderRecordList(data);
});

function syncDayDateControls(ymd) {
    if (recordDateInput) recordDateInput.value = ymd || '';
    if (recordDateText) recordDateText.value = ymd || '';
}

function applyDayDateFromText() {
    const parsed = parseDateInput(recordDateText ? recordDateText.value : '');
    if (!parsed.ok) {
        alert('请输入合法日期，格式：YYYY-MM-DD');
        if (recordDateText && recordDateInput) recordDateText.value = recordDateInput.value || '';
        return false;
    }
    syncDayDateControls(parsed.value);
    recordQuery.value = parsed.value;
    loadRecordSessions();
    return true;
}

function openRecordModal() {
    recordModal.style.display = 'flex';
    recordModal.classList.add('show');
    const today = formatDateYmd(new Date());
    syncDayDateControls(today);
    recordQuery = { type: 'day', value: null };
    loadRecordSessions();
}

function closeRecordModal() {
    recordModal.classList.remove('show');
    recordModal.style.display = 'none';
}

recordBtn.addEventListener('click', openRecordModal);

// 小窗口点击「记录」时由主进程通知打开记录弹窗
ipcRenderer.on('show-record-modal', () => {
    openRecordModal();
});

// 小窗口点击「设置」时由主进程通知打开设置弹窗
ipcRenderer.on('show-config-modal', () => {
    openConfigModal();
});

recordClose.addEventListener('click', () => {
    closeRecordModal();
});

recordModal.addEventListener('click', (e) => {
    if (e.target === recordModal) closeRecordModal();
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
            const ymd = (recordDateInput && recordDateInput.value) || formatDateYmd(new Date());
            syncDayDateControls(ymd);
            recordQuery.value = ymd;
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
            const ymd = formatDateYmd(d);
            syncDayDateControls(ymd);
            recordQuery.value = ymd;
        } else if (recordQuery.type === 'week') {
            const d = new Date();
            d.setDate(d.getDate() + offset * 7);
            recordQuery.value = formatDateYmd(d);
        } else {
            const d = new Date();
            d.setMonth(d.getMonth() + offset);
            recordQuery.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        }
        loadRecordSessions();
    });
});

recordDateInput.addEventListener('change', () => {
    const ymd = recordDateInput.value || '';
    syncDayDateControls(ymd);
    recordQuery.value = ymd || null;
    loadRecordSessions();
});

if (recordDateText) {
    recordDateText.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyDayDateFromText();
        }
    });
    recordDateText.addEventListener('blur', () => {
        if (!recordDateText.value.trim()) {
            if (recordDateInput) recordDateText.value = recordDateInput.value || '';
            return;
        }
        if (recordDateText.value.trim() !== (recordDateInput && recordDateInput.value)) {
            applyDayDateFromText();
        }
    });
}

function currentExportFilterLabel() {
    if (recordQuery.type === 'day') {
        return recordQuery.value || (recordDateInput && recordDateInput.value) || formatDateYmd(new Date());
    }
    if (recordQuery.type === 'week') return recordQuery.value || 'week';
    if (recordQuery.type === 'month') return recordQuery.value || 'month';
    return '记录';
}

if (exportRecordBtn) {
    exportRecordBtn.addEventListener('click', () => {
        ipcRenderer.send('export-sessions', {
            type: recordQuery.type,
            value: recordQuery.value,
            filterLabel: currentExportFilterLabel()
        });
    });
}

ipcRenderer.on('sessions-exported', (event, result) => {
    if (!result) return;
    if (result.ok) {
        alert('导出成功：\n' + result.filePath);
        return;
    }
    if (result.reason === 'empty') {
        alert('当前筛选无记录可导出');
        return;
    }
    if (result.reason === 'cancelled') return;
    alert('导出失败' + (result.message ? '：' + result.message : ''));
});

// 初始化显示
updateTimeDisplay(config.focusDuration * 60);
