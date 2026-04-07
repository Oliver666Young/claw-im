import { createServer } from 'node:net';
import type { Server as NetServer, Socket } from 'node:net';
import { existsSync, unlinkSync } from 'node:fs';
import type { ClawConfig } from '@claw-im/shared';
import type { IpcRequest, IpcResponse, ServerMessage } from '@claw-im/shared';
import { CLAWD_IPC_PATH } from '@claw-im/shared';

import { CloudClient } from './cloud-client.js';
import { SessionRegistry } from './session-registry.js';
import { MessageQueue } from './message-queue.js';
import { MessageRouter } from './message-router.js';
import { HookServer } from './hook-server.js';
import { ContactDB } from './contact-db.js';
import { McpToolHandler } from './mcp-server.js';

export class ClawDaemon {
  private config: ClawConfig;
  private cloudClient: CloudClient;
  private sessionRegistry: SessionRegistry;
  private messageQueue: MessageQueue;
  private messageRouter!: MessageRouter;
  private hookServer!: HookServer;
  private contactDB: ContactDB;
  private mcpHandler!: McpToolHandler;
  private ipcServer: NetServer | null = null;
  private ipcClients = new Set<Socket>();

  constructor(config: ClawConfig) {
    this.config = config;
    this.cloudClient = new CloudClient(config);
    this.sessionRegistry = new SessionRegistry();
    this.messageQueue = new MessageQueue();
    this.contactDB = new ContactDB();
  }

  async start(): Promise<void> {
    // 1. Init ContactDB
    this.contactDB.init();
    console.log('[daemon] ContactDB initialized');

    // 2. Setup HookServer
    this.hookServer = new HookServer(
      this.sessionRegistry,
      this.messageQueue,
      this.contactDB,
      { handle: this.config.handle, agentId: this.config.agentId }
    );

    // 3. Setup MessageRouter
    this.messageRouter = new MessageRouter(
      this.contactDB,
      this.messageQueue,
      this.hookServer
    );

    // 4. Setup MCP tool handler
    this.mcpHandler = new McpToolHandler({
      cloudClient: this.cloudClient,
      messageQueue: this.messageQueue,
      contactDB: this.contactDB,
      messageRouter: this.messageRouter,
      agentId: this.config.agentId,
      auditLog: this.config.safety.auditLog,
    });

    // 5. Wire up CloudClient events
    this.cloudClient.on('connected', () => {
      console.log('[daemon] Connected to cloud server');
    });

    this.cloudClient.on('disconnected', (reason) => {
      console.log(`[daemon] Disconnected from cloud: ${reason}`);
    });

    this.cloudClient.on('message', (msg: ServerMessage) => {
      this._handleServerMessage(msg);
    });

    this.cloudClient.on('error', (err) => {
      console.error('[daemon] Cloud client error:', err.message);
    });

    // 6. Start CloudClient
    this.cloudClient.connect();
    console.log('[daemon] CloudClient connecting...');

    // 7. Start HookServer
    await this.hookServer.start();

    // 8. Start IPC server
    await this._startIpcServer();
    console.log('[daemon] IPC server started');

    console.log('[daemon] Claw daemon started successfully');
  }

  async stop(): Promise<void> {
    console.log('[daemon] Stopping...');

    // Close CloudClient
    this.cloudClient.close();

    // Close HookServer
    await this.hookServer.stop();

    // Close IPC server
    await this._stopIpcServer();

    // Close ContactDB
    this.contactDB.close();

    // Cleanup session registry
    this.sessionRegistry.destroy();

    // Clear message queue
    this.messageQueue.clear();

    console.log('[daemon] Stopped');
  }

  private _handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
      case 'auth_ok':
        console.log(
          `[daemon] Authenticated as ${msg.agent.handle} (${msg.agent.displayName})`
        );
        // Sync missed messages after (re)connect
        this.cloudClient.sendSyncRequest();
        break;

      case 'auth_error':
        console.error(`[daemon] Auth failed: ${msg.reason}`);
        break;

      case 'new_message':
        this.messageRouter.routeMessage(msg.message);
        break;

      case 'message_ack':
        if (msg.status === 'error') {
          console.error(
            `[daemon] Message ${msg.messageId} failed: ${msg.error}`
          );
        }
        break;

      case 'sync_response':
        for (const message of msg.messages) {
          this.messageRouter.routeMessage(message);
        }
        break;

      case 'error':
        console.error(`[daemon] Server error [${msg.code}]: ${msg.message}`);
        break;

      default:
        // agent_list, pong handled elsewhere
        break;
    }
  }

  private async _startIpcServer(): Promise<void> {
    // Clean up stale socket
    if (existsSync(CLAWD_IPC_PATH)) {
      unlinkSync(CLAWD_IPC_PATH);
    }

    return new Promise<void>((resolve, reject) => {
      this.ipcServer = createServer((socket) => {
        this.ipcClients.add(socket);
        let buffer = '';

        socket.on('data', (chunk) => {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop()!;

          for (const line of lines) {
            if (!line.trim()) continue;
            this._handleIpcRequest(socket, line);
          }
        });

        socket.on('close', () => {
          this.ipcClients.delete(socket);
        });

        socket.on('error', (err) => {
          console.error('[daemon] IPC client error:', err.message);
          this.ipcClients.delete(socket);
        });
      });

      this.ipcServer.on('error', (err) => {
        reject(err);
      });

      this.ipcServer.listen(CLAWD_IPC_PATH, () => {
        resolve();
      });
    });
  }

  private async _handleIpcRequest(
    socket: Socket,
    rawLine: string
  ): Promise<void> {
    let req: IpcRequest;
    try {
      req = JSON.parse(rawLine) as IpcRequest;
    } catch {
      return;
    }

    try {
      const result = await this.mcpHandler.handleCall(req.method, req.params);
      const response: IpcResponse = {
        id: req.id,
        result,
      };
      socket.write(JSON.stringify(response) + '\n');
    } catch (err) {
      const response: IpcResponse = {
        id: req.id,
        error: err instanceof Error ? err.message : String(err),
      };
      socket.write(JSON.stringify(response) + '\n');
    }
  }

  private async _stopIpcServer(): Promise<void> {
    // Close all IPC clients
    for (const client of this.ipcClients) {
      client.destroy();
    }
    this.ipcClients.clear();

    return new Promise<void>((resolve) => {
      if (!this.ipcServer) {
        resolve();
        return;
      }
      this.ipcServer.close(() => {
        // Clean up socket file
        if (existsSync(CLAWD_IPC_PATH)) {
          try {
            unlinkSync(CLAWD_IPC_PATH);
          } catch { /* ignore */ }
        }
        resolve();
      });
    });
  }
}
