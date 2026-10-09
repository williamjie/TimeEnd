const REST_FINISHED_STATUS = '休息结束，可开始下一次专注';

function formatRestRemaining(totalSeconds) {
  const s = Math.max(0, Number(totalSeconds) || 0);
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function restRemainingUi(remainingSeconds) {
  if (remainingSeconds == null) {
    return { show: false, text: formatRestRemaining(0) };
  }
  return { show: true, text: formatRestRemaining(remainingSeconds) };
}

function restFinishedUi({ autoStarted }) {
  if (autoStarted) {
    return {
      status: '专注中',
      showRemaining: false,
      keepElapsed: false,
      startEnabled: false,
      pauseEnabled: true,
      stopEnabled: true
    };
  }
  return {
    status: REST_FINISHED_STATUS,
    showRemaining: false,
    keepElapsed: true,
    startEnabled: true,
    pauseEnabled: false,
    stopEnabled: false
  };
}

function restCountdownControls({ isPaused }) {
  if (isPaused) {
    return null;
  }
  return {
    isRunning: false,
    startEnabled: true,
    pauseEnabled: false,
    stopEnabled: false
  };
}

function restStateLoadedUi({
  startTimestamp,
  frozenMinutes,
  remainingSeconds,
  restFinishedStandby,
  elapsedMinutes
}) {
  if (startTimestamp != null) {
    return {
      mode: 'elapsed',
      remaining: restRemainingUi(remainingSeconds)
    };
  }
  if (frozenMinutes != null) {
    return {
      mode: 'frozen',
      remaining: restRemainingUi(null)
    };
  }
  if (restFinishedStandby) {
    return {
      mode: 'finished-standby',
      elapsedMinutes: elapsedMinutes == null ? 0 : elapsedMinutes,
      remaining: restRemainingUi(null),
      finished: restFinishedUi({ autoStarted: false })
    };
  }
  return {
    mode: 'cleared',
    remaining: restRemainingUi(null)
  };
}

module.exports = {
  formatRestRemaining,
  REST_FINISHED_STATUS,
  restFinishedUi,
  restRemainingUi,
  restCountdownControls,
  restStateLoadedUi
};
