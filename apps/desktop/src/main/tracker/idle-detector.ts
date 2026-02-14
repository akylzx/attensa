import { powerMonitor } from 'electron';
import { IDLE_THRESHOLD_SECONDS } from '@attensa/shared';

export class IdleDetector {
  private isIdle = false;
  private onIdleStart?: () => void;
  private onIdleEnd?: () => void;
  private checkInterval: ReturnType<typeof setInterval> | null = null;

  start(callbacks: { onIdleStart?: () => void; onIdleEnd?: () => void }) {
    this.onIdleStart = callbacks.onIdleStart;
    this.onIdleEnd = callbacks.onIdleEnd;
    this.isIdle = false;

    // Check idle state every second
    this.checkInterval = setInterval(() => {
      const idleTime = powerMonitor.getSystemIdleTime();
      const nowIdle = idleTime >= IDLE_THRESHOLD_SECONDS;

      if (nowIdle && !this.isIdle) {
        this.isIdle = true;
        this.onIdleStart?.();
      } else if (!nowIdle && this.isIdle) {
        this.isIdle = false;
        this.onIdleEnd?.();
      }
    }, 1000);
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isIdle = false;
  }

  getIsIdle(): boolean {
    return this.isIdle;
  }
}

export const idleDetector = new IdleDetector();
