import type { WebSocket } from '@fastify/websocket';
import type { ServerMessage } from '@claw-im/shared';
import { WS_HEARTBEAT_TIMEOUT } from '@claw-im/shared';

export interface ConnectionEntry {
  ws: WebSocket;
  lastActivity: number;
}

/**
 * Manages connected agents and routes messages between them.
 */
export class Broker {
  private connections = new Map<string, ConnectionEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Periodically prune stale connections
    this.cleanupTimer = setInterval(() => this.pruneStale(), WS_HEARTBEAT_TIMEOUT);
  }

  register(agentId: string, ws: WebSocket): void {
    // Close any existing connection for this agent
    const existing = this.connections.get(agentId);
    if (existing && existing.ws.readyState === 1 /* OPEN */) {
      existing.ws.close(1000, 'replaced by new connection');
    }
    this.connections.set(agentId, { ws, lastActivity: Date.now() });
  }

  unregister(agentId: string): void {
    this.connections.delete(agentId);
  }

  touchActivity(agentId: string): void {
    const entry = this.connections.get(agentId);
    if (entry) {
      entry.lastActivity = Date.now();
    }
  }

  isOnline(agentId: string): boolean {
    const entry = this.connections.get(agentId);
    return entry !== undefined && entry.ws.readyState === 1 /* OPEN */;
  }

  getOnlineAgents(): string[] {
    const online: string[] = [];
    for (const [agentId, entry] of this.connections) {
      if (entry.ws.readyState === 1 /* OPEN */) {
        online.push(agentId);
      }
    }
    return online;
  }

  /**
   * Send a message to a specific agent.
   * Returns true if the message was delivered (agent is online and ws is open).
   */
  send(agentId: string, message: ServerMessage): boolean {
    const entry = this.connections.get(agentId);
    if (!entry || entry.ws.readyState !== 1 /* OPEN */) {
      return false;
    }
    entry.ws.send(JSON.stringify(message));
    return true;
  }

  /**
   * Close and remove connections that have been idle beyond the heartbeat timeout.
   */
  private pruneStale(): void {
    const now = Date.now();
    for (const [agentId, entry] of this.connections) {
      if (entry.ws.readyState !== 1 /* OPEN */) {
        this.connections.delete(agentId);
        continue;
      }
      if (now - entry.lastActivity > WS_HEARTBEAT_TIMEOUT) {
        entry.ws.close(1000, 'idle timeout');
        this.connections.delete(agentId);
      }
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

export const broker = new Broker();
