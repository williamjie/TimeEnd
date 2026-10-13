function resolveFocusContent({ submitted, draft }) {
  const submittedText = submitted == null ? '' : String(submitted).trim();
  if (submittedText) return submittedText;
  const draftText = draft == null ? '' : String(draft).trim();
  return draftText;
}

function createFocusMatterState() {
  let draft = '';

  return {
    get() {
      return draft;
    },
    set(text) {
      draft = text == null ? '' : String(text);
      return draft;
    },
    clear() {
      draft = '';
    },
    beginFocus() {
      draft = '';
    },
    resolveForSave(submitted) {
      return resolveFocusContent({ submitted, draft });
    }
  };
}

module.exports = {
  createFocusMatterState,
  resolveFocusContent
};
