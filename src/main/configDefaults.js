function defaultConfig() {
  return {
    focusDuration: 25,
    breakDuration: 5,
    openAtLogin: false,
    workStartTime: '',
    workEndTime: '',
    dailySalary: '',
    payday: '',
    autoStartNextFocus: false
  };
}

function mergeSavedConfig(prev, incoming) {
  const next = { ...defaultConfig(), ...prev };
  if (incoming.focusDuration !== undefined) next.focusDuration = incoming.focusDuration;
  if (incoming.breakDuration !== undefined) next.breakDuration = incoming.breakDuration;
  if (incoming.openAtLogin !== undefined) next.openAtLogin = incoming.openAtLogin;
  if (incoming.workStartTime !== undefined) next.workStartTime = String(incoming.workStartTime).trim();
  if (incoming.workEndTime !== undefined) next.workEndTime = String(incoming.workEndTime).trim();
  if (incoming.dailySalary !== undefined) next.dailySalary = incoming.dailySalary;
  if (incoming.payday !== undefined) next.payday = incoming.payday;
  if (incoming.autoStartNextFocus !== undefined) {
    next.autoStartNextFocus = !!incoming.autoStartNextFocus;
  }
  return next;
}

module.exports = { defaultConfig, mergeSavedConfig };
