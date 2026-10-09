const WORK_PROMPT = {
  title: '休息结束',
  body: '该开始工作了，下一轮专注已自动开始。',
  buttonLabel: '知道了'
};

function shouldOpenWorkPrompt({ alreadyOpen }) {
  return !alreadyOpen;
}

function workPromptWindowOptions() {
  return {
    title: WORK_PROMPT.title,
    width: 360,
    height: 180,
    alwaysOnTop: true,
    resizable: false,
    frame: true
  };
}

module.exports = {
  WORK_PROMPT,
  shouldOpenWorkPrompt,
  workPromptWindowOptions
};
