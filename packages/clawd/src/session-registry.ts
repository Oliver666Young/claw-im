import type { SessionInfo } from '@claw-im/shared';
import { SESSION_IDLE_TIMEOUT } from '@claw-im/shared';

export class SessionRegistry {
  private sessions = new Map<string, SessionInfo>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 60_000);
  }

  register(sessionId: string, cwd: string): void {
    this.sessions.set(sessionId, {
      sessionId,
      cwd,
      lastActivity: Date.now(),
    });
  }

  heartbeat(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  unregister(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getActive(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  hasActive(): boolean {
    return this.sessions.size > 0;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (now - session.lastActivity > SESSION_IDLE_TIMEOUT) {
        this.sessions.delete(id);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.sessions.clear();
  }
}
