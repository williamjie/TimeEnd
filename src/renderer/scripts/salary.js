/**
 * 工资信息：发薪倒计时、上下班状态、今日已赚（工作日线性折算）
 * 依赖本地时间；不支持跨天班次。
 */

function parseHHMM(s) {
  if (!s || typeof s !== 'string') return null;
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function paydayTimestamp(year, monthIndex, paydayDay) {
  const dim = daysInMonth(year, monthIndex);
  const day = Math.min(Math.max(1, paydayDay), dim);
  return new Date(year, monthIndex, day, 0, 0, 0, 0).getTime();
}

/** 从今天 0 点起，距离下一次发薪日（当天 0 点）还有几天 */
function daysUntilPayday(nowTs, paydayDay) {
  if (paydayDay == null || Number.isNaN(paydayDay)) return null;
  const pd = Math.floor(Number(paydayDay));
  if (pd < 1 || pd > 31) return null;

  const d = new Date(nowTs);
  const y = d.getFullYear();
  const m = d.getMonth();
  const startOfToday = new Date(y, m, d.getDate(), 0, 0, 0, 0).getTime();

  let target = paydayTimestamp(y, m, pd);
  if (target < startOfToday) {
    const nm = m + 1;
    const ny = nm > 11 ? y + 1 : y;
    const nmi = nm > 11 ? 0 : nm;
    target = paydayTimestamp(ny, nmi, pd);
  }

  return Math.round((target - startOfToday) / 86400000);
}

function formatHMS(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function isSalaryConfigComplete(cfg) {
  if (!cfg || typeof cfg !== 'object') return false;
  const start = parseHHMM(cfg.workStartTime);
  const end = parseHHMM(cfg.workEndTime);
  if (!start || !end) return false;
  const startMs = start.h * 3600000 + start.m * 60000;
  const endMs = end.h * 3600000 + end.m * 60000;
  if (endMs <= startMs) return false;
  if (cfg.dailySalary === '' || cfg.dailySalary == null) return false;
  const salary = Number(cfg.dailySalary);
  if (Number.isNaN(salary) || salary < 0) return false;
  const pd = Number(cfg.payday);
  if (Number.isNaN(pd) || pd < 1 || pd > 31) return false;
  return true;
}

/**
 * @param {object} cfg config 对象
 * @param {number} [nowTs] 时间戳
 * @returns {{ configured: boolean, payDaysLeft: number|null, main: object, mini: object, raw: object }}
 */
function computeSalaryState(cfg, nowTs = Date.now()) {
  if (!isSalaryConfigComplete(cfg)) {
    return {
      configured: false,
      payDaysLeft: null,
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
    };
  }

  const start = parseHHMM(cfg.workStartTime);
  const end = parseHHMM(cfg.workEndTime);
  const dailySalary = Number(cfg.dailySalary);
  const payDaysLeft = daysUntilPayday(nowTs, Number(cfg.payday));

  const d = new Date(nowTs);
  const y = d.getFullYear();
  const mo = d.getMonth();
  const day = d.getDate();
  const workStartMs = new Date(y, mo, day, start.h, start.m, 0, 0).getTime();
  const workEndMs = new Date(y, mo, day, end.h, end.m, 0, 0).getTime();
  const workTotalSec = (workEndMs - workStartMs) / 1000;

  let phase;
  let countdownSec = 0;
  let earned = 0;

  if (nowTs < workStartMs) {
    phase = 'before_work';
    countdownSec = (workStartMs - nowTs) / 1000;
    earned = 0;
  } else if (nowTs < workEndMs) {
    phase = 'during_work';
    countdownSec = (workEndMs - nowTs) / 1000;
    const workedSec = (nowTs - workStartMs) / 1000;
    earned = dailySalary * (workedSec / workTotalSec);
  } else {
    phase = 'after_work';
    countdownSec = 0;
    earned = dailySalary;
  }

  const earnedFixed = earned.toFixed(2);
  const dailyFixed = dailySalary.toFixed(2);

  const payLineMain = `发薪倒计时：还有 ${payDaysLeft} 天发工资`;
  const payLineMini = `发薪：还有 ${payDaysLeft} 天`;

  let workLineMain;
  let workLineMini;
  let moneyLineMain = `今日已赚：￥${earnedFixed} / ￥${dailyFixed}`;

  if (phase === 'before_work') {
    const hms = formatHMS(countdownSec);
    workLineMain = `工作状态：距离上班 ${hms}`;
    workLineMini = `上班：${hms}`;
  } else if (phase === 'during_work') {
    const hms = formatHMS(countdownSec);
    workLineMain = `工作状态：距离下班 ${hms}`;
    workLineMini = `下班：${hms}`;
  } else {
    workLineMain = `下班时间到了，今天已经挣到 ￥${dailyFixed}，恭喜你`;
    workLineMini = `已下班，今日 ￥${dailyFixed}`;
    moneyLineMain = `今日已满额：￥${dailyFixed}`;
  }

  return {
    configured: true,
    payDaysLeft,
    main: {
      payLine: payLineMain,
      workLine: workLineMain,
      moneyLine: moneyLineMain
    },
    mini: {
      line1: payLineMini,
      line2: workLineMini,
      line3: `已赚：￥${earnedFixed}`
    },
    raw: { phase, earned, dailySalary }
  };
}

module.exports = {
  computeSalaryState,
  isSalaryConfigComplete
};
