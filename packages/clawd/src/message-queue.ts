import type { Message } from '@claw-im/shared';

interface Waiter {
  resolve: (msg: Message | null) => void;
  from?: string;
  timer: ReturnType<typeof setTimeout>;
}

export class MessageQueue {
  private globalQueue: Message[] = [];
  private waiters: Waiter[] = [];

  enqueue(message: Message): void {
    // Check if any waiter matches this message
    const matchIdx = this.waiters.findIndex(
      (w) => !w.from || w.from === message.from
    );

    if (matchIdx >= 0) {
      const waiter = this.waiters.splice(matchIdx, 1)[0]!;
      clearTimeout(waiter.timer);
      waiter.resolve(message);
      return;
    }

    this.globalQueue.push(message);
  }

  drain(limit?: number, from?: string): Message[] {
    let messages: Message[];

    if (from) {
      const matching: Message[] = [];
      const remaining: Message[] = [];
      for (const msg of this.globalQueue) {
        if (msg.from === from) {
          matching.push(msg);
        } else {
          remaining.push(msg);
        }
      }
      if (limit !== undefined) {
        messages = matching.slice(0, limit);
        // Put unread filtered messages back
        const leftover = matching.slice(limit);
        this.globalQueue = [...leftover, ...remaining];
      } else {
        messages = matching;
        this.globalQueue = remaining;
      }
    } else {
      if (limit !== undefined) {
        messages = this.globalQueue.splice(0, limit);
      } else {
        messages = this.globalQueue.splice(0);
      }
    }

    return messages;
  }

  waitForNext(timeout: number, from?: string): Promise<Message | null> {
    // Check existing queue first
    const idx = from
      ? this.globalQueue.findIndex((m) => m.from === from)
      : 0;

    if (idx >= 0 && idx < this.globalQueue.length) {
      const msg = this.globalQueue.splice(idx, 1)[0]!;
      return Promise.resolve(msg);
    }

    return new Promise<Message | null>((resolve) => {
      const timer = setTimeout(() => {
        const waiterIdx = this.waiters.findIndex((w) => w.resolve === resolve);
        if (waiterIdx >= 0) {
          this.waiters.splice(waiterIdx, 1);
        }
        resolve(null);
      }, timeout);

      this.waiters.push({ resolve, from, timer });
    });
  }

  getPendingCount(from?: string): number {
    if (from) {
      return this.globalQueue.filter((m) => m.from === from).length;
    }
    return this.globalQueue.length;
  }

  getUniqueSenders(): string[] {
    const senders = new Set<string>();
    for (const msg of this.globalQueue) {
      senders.add(msg.from);
    }
    return [...senders];
  }

  clear(): void {
    this.globalQueue = [];
    for (const waiter of this.waiters) {
      clearTimeout(waiter.timer);
      waiter.resolve(null);
    }
    this.waiters = [];
  }
}
