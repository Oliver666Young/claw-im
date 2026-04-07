import type { AgentInfo, AgentStatus, Message } from './types.js';

// ─── Client → Cloud ─────────────────────────────────────
export interface WsAuth {
  type: 'auth';
  apiKey: string;
  agentId: string;
}

export interface WsSendMessage {
  type: 'send_message';
  to: string;
  content: string;
  metadata?: Message['metadata'];
  requestId?: string;
}

export interface WsSyncRequest {
  type: 'sync_request';
  lastSeenMessageId?: string;
}

export interface WsStatusUpdate {
  type: 'status_update';
  status: AgentStatus;
}

export interface WsPing {
  type: 'ping';
  ts: number;
}

export interface WsListAgents {
  type: 'list_agents';
  onlineOnly?: boolean;
  requestId?: string;
}

// ─── Cloud → Client ─────────────────────────────────────
export interface WsAuthOk {
  type: 'auth_ok';
  agent: AgentInfo;
}

export interface WsAuthError {
  type: 'auth_error';
  reason: string;
}

export interface WsNewMessage {
  type: 'new_message';
  message: Message;
}

export interface WsMessageAck {
  type: 'message_ack';
  messageId: string;
  requestId?: string;
  status: 'delivered' | 'queued' | 'error';
  error?: string;
}

export interface WsSyncResponse {
  type: 'sync_response';
  messages: Message[];
  hasMore: boolean;
}

export interface WsPong {
  type: 'pong';
  ts: number;
}

export interface WsAgentList {
  type: 'agent_list';
  agents: AgentInfo[];
  requestId?: string;
}

export interface WsError {
  type: 'error';
  code: string;
  message: string;
}

// ─── Union Types ─────────────────────────────────────────
export type ClientMessage =
  | WsAuth
  | WsSendMessage
  | WsSyncRequest
  | WsStatusUpdate
  | WsPing
  | WsListAgents;

export type ServerMessage =
  | WsAuthOk
  | WsAuthError
  | WsNewMessage
  | WsMessageAck
  | WsSyncResponse
  | WsPong
  | WsAgentList
  | WsError;

// ─── IPC (clawd ↔ mcp-entry) ────────────────────────────
export interface IpcRequest {
  id: string;
  method: string;
  params: Record<string, unknown>;
}

export interface IpcResponse {
  id: string;
  result?: unknown;
  error?: string;
}

// ─── Hook payloads ───────────────────────────────────────
export interface PostToolUseHookInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_output?: string;
  session_id?: string;
}

export interface PostToolUseHookOutput {
  additionalContext?: string;
}

export interface SessionStartHookInput {
  session_id?: string;
  cwd?: string;
}
