const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { WORK_PROMPT, shouldOpenWorkPrompt, workPromptWindowOptions } = require('../src/main/workPrompt');

describe('workPrompt', () => {
  it('uses short always-on-top copy telling the user to start working', () => {
    assert.equal(WORK_PROMPT.title, '休息结束');
    assert.equal(WORK_PROMPT.body, '该开始工作了，下一轮专注已自动开始。');
    assert.equal(WORK_PROMPT.buttonLabel, '知道了');
  });

  it('opens a small alwaysOnTop window only when none of the same type exists', () => {
    assert.equal(shouldOpenWorkPrompt({ alreadyOpen: false }), true);
    assert.equal(shouldOpenWorkPrompt({ alreadyOpen: true }), false);
    const opts = workPromptWindowOptions();
    assert.equal(opts.alwaysOnTop, true);
    assert.equal(opts.title, WORK_PROMPT.title);
    assert.ok(opts.width <= 420);
    assert.ok(opts.height <= 220);
  });
});
