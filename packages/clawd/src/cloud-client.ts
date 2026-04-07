import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import type { ClawConfig } from '@claw-im/shared';
import type {
  ClientMessage,
  ServerMessage,
  WsAuth,
  WsPing,
} from '@claw-im/shared';
import {
  WS_HEARTBEAT_INTERVAL,
  WS_HEARTBEAT_TIMEOUT,
  WS_RECONNECT_MIN,
  WS_RECONNECT_MAX,
} from '@claw-im/shared';

export interface CloudClientEvents {
  connected: [];
  disconnected: [reason: string];
  message: [msg: ServerMessage];
  error: [err: Error];
}

export class CloudClient extends EventEmitter<CloudClientEvents> {
  private ws: WebSocket | null = null;
  private config: ClawConfig;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = WS_RECONNECT_MIN;
  private shouldReconnect = true;
  private lastPong = 0;

  constructor(config: ClawConfig) {
    super();
    this.config = config;
  }

  connect(): void {
    this.shouldReconnect = true;
    this._connect();
  }

  private _connect(): void {
    if (this.ws) {
      try { this.ws.terminate(); } catch { /* ignore */ }
    }

    const url = this.config.cloudUrl.replace(/^http/, 'ws') + '/ws';
    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      this.reconnectDelay = WS_RECONNECT_MIN;
      this._sendAuth();
      this._startHeartbeat();
      this.emit('connected');
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as ServerMessage;
        if (msg.type === 'pong') {
          this.lastPong = Date.now();
          return;
        }
        this.emit('message', msg);
      } catch (err) {
        this.emit('error', new Error(`Failed to parse message: ${data.toString()}`));
      }
    });

    this.ws.on('close', (code, reason) => {
      this._stopHeartbeat();
      this.emit('disconnected', reason.toString() || `code=${code}`);
      this._scheduleReconnect();
    });

    this.ws.on('error', (err) => {
      this.emit('error', err);
    });
  }

  private _sendAuth(): void {
    const auth: WsAuth = {
      type: 'auth',
      apiKey: this.config.apiKey,
      agentId: this.config.agentId,
    };
    this._sendRaw(auth);
  }

  private _startHeartbeat(): void {
    this.lastPong = Date.now();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        const ping: WsPing = { type: 'ping', ts: Date.now() };
        this._sendRaw(ping);
      }
    }, WS_HEARTBEAT_INTERVAL);

    this.timeoutTimer = setInterval(() => {
      if (Date.now() - this.lastPong > WS_HEARTBEAT_TIMEOUT) {
        console.error('[cloud-client] Heartbeat timeout, reconnecting...');
        this.ws?.terminate();
      }
    }, WS_HEARTBEAT_INTERVAL);
  }

  private _stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.timeoutTimer) {
      clearInterval(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  private _scheduleReconnect(): void {
    if (!this.shouldReconnect) return;

    const jitter = Math.random() * 0.3 * this.reconnectDelay;
    const delay = this.reconnectDelay + jitter;
    console.log(`[cloud-client] Reconnecting in ${Math.round(delay)}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, delay);

    this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_RECONNECT_MAX);
  }

  send(msg: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    this._sendRaw(msg);
  }

  private _sendRaw(msg: ClientMessage): void {
    this.ws?.send(JSON.stringify(msg));
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  sendSyncRequest(lastSeenMessageId?: string): void {
    if (!this.connected) return;
    this.send({
      type: 'sync_request',
      lastSeenMessageId,
    });
  }

  close(): void {
    this.shouldReconnect = false;
    this._stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(1000, 'client closing');
      this.ws = null;
    }
  }
}
