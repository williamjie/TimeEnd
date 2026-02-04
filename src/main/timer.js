class Timer {
  constructor(duration, onTick, onComplete) {
    this.duration = duration; // 分钟数
    this.remaining = duration * 60; // 转换为秒
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.intervalId = null;
    this.isPaused = false;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.isPaused = false;
    this.intervalId = setInterval(() => {
      if (!this.isPaused) {
        this.remaining--;
        if (this.onTick) {
          this.onTick(this.remaining);
        }
        if (this.remaining <= 0) {
          this.stop();
          if (this.onComplete) {
            this.onComplete();
          }
        }
      }
    }, 1000);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    this.isPaused = false;
  }

  getRemaining() {
    return this.remaining;
  }
}

module.exports = Timer;
