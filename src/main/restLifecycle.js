function shouldBeginRestOnFocusComplete() {
  return false;
}

function shouldBeginRestAfterInterrupt({ interruptOpen, focusRunning }) {
  return !interruptOpen && !focusRunning;
}

function canFinishRest({ interruptOpen, focusRunning }) {
  return !interruptOpen && !focusRunning;
}

function decideOnRestFinished({ interruptOpen, focusRunning, autoStartNextFocus }) {
  if (!canFinishRest({ interruptOpen, focusRunning })) {
    return {
      action: 'skip',
      persistRest: false,
      broadcast: null,
      showWorkPrompt: false
    };
  }
  if (autoStartNextFocus) {
    return {
      action: 'auto-start',
      persistRest: true,
      broadcast: 'rest-finished',
      showWorkPrompt: true
    };
  }
  return {
    action: 'standby',
    persistRest: true,
    broadcast: 'rest-finished',
    showWorkPrompt: false
  };
}

function buildRestSession({ restStartTime, endTime, id }) {
  return {
    id,
    startTime: restStartTime,
    endTime,
    durationMinutes: Math.round((endTime - restStartTime) / 60000)
  };
}

function saveRestIfAny({ restStartTime, endTime, id, append }) {
  if (restStartTime == null) {
    return { restStartTime: null, session: null };
  }
  const session = buildRestSession({ restStartTime, endTime, id });
  append(session);
  return { restStartTime: null, session };
}

function shouldShowWorkPrompt({ autoStartNextFocus, naturalRestComplete }) {
  return !!autoStartNextFocus && !!naturalRestComplete;
}

function miniStatusWhenRestBegins() {
  return { isRunning: false, isPaused: false };
}

function nextRestFinishedStandby({ action }) {
  return action === 'standby';
}

function elapsedRestMinutes({ restStartTime, now }) {
  if (restStartTime == null) return 0;
  return Math.floor((now - restStartTime) / 60000);
}

function buildRestStatePayload({
  restStartTime,
  frozenRestMinutes,
  remainingSeconds,
  restFinishedStandby,
  lastRestElapsedMinutes
}) {
  return {
    restStartTime: restStartTime == null ? null : restStartTime,
    frozenRestMinutes: frozenRestMinutes == null ? null : frozenRestMinutes,
    remainingSeconds: remainingSeconds == null ? null : remainingSeconds,
    restFinishedStandby: !!restFinishedStandby,
    lastRestElapsedMinutes:
      lastRestElapsedMinutes == null ? null : lastRestElapsedMinutes
  };
}

module.exports = {
  canFinishRest,
  decideOnRestFinished,
  shouldBeginRestAfterInterrupt,
  shouldBeginRestOnFocusComplete,
  buildRestSession,
  saveRestIfAny,
  shouldShowWorkPrompt,
  miniStatusWhenRestBegins,
  nextRestFinishedStandby,
  buildRestStatePayload,
  elapsedRestMinutes
};
