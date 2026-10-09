/**
 * 从小窗打开主窗能力时的动作计划（与「记录」一致：不销毁小窗）。
 */
function planOpenSettingsFromMini() {
  return {
    keepMiniWindow: true,
    showMainWindow: true,
    focusMainWindow: true,
    mainRendererEvent: 'show-config-modal'
  };
}

module.exports = {
  planOpenSettingsFromMini
};
