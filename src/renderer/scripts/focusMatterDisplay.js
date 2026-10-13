const MAIN_SUMMARY_MAX = 16;
const MINI_SUMMARY_MAX = 10;
const EMPTY_PLACEHOLDER = '未填写';

/**
 * @param {string} text
 * @param {number} maxLen
 * @returns {{ display: string, full: string, truncated: boolean, title: string }}
 */
function formatMatterSummary(text, maxLen) {
  const full = text == null ? '' : String(text).trim();
  if (!full) {
    return {
      display: EMPTY_PLACEHOLDER,
      full: '',
      truncated: false,
      title: '点击编辑事项'
    };
  }
  const limit = Math.max(1, Number(maxLen) || MAIN_SUMMARY_MAX);
  if (full.length <= limit) {
    return {
      display: full,
      full,
      truncated: false,
      title: full
    };
  }
  return {
    display: full.slice(0, limit) + '…',
    full,
    truncated: true,
    title: full
  };
}

module.exports = {
  MAIN_SUMMARY_MAX,
  MINI_SUMMARY_MAX,
  EMPTY_PLACEHOLDER,
  formatMatterSummary
};
