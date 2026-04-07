export type Tier = 'self' | 'friend' | 'stranger';
export type Zone = 'interrupt' | 'mailbox' | 'digest';
export type AgentStatus = 'online' | 'busy' | 'dnd' | 'offline';

export interface AgentInfo {
  agentId: string;
  displayName: string;
  handle: string;
  status: AgentStatus;
  lastSeen?: string; // ISO timestamp
}

export interface Contact {
  agentId: string;
  displayName: string;
  tier: Tier;
  alias?: string;
  blocked: boolean;
  notes?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  content: string;
  metadata: MessageMetadata;
  timestamp: string; // ISO
}

export interface MessageMetadata {
  urgent?: boolean;
  replyTo?: string; // message id
  replyToSelf?: boolean;
  groupId?: string;
  type?: 'text' | 'code' | 'system';
}

export interface GroupInfo {
  groupId: string;
  name: string;
  members: string[];
  createdBy: string;
  createdAt: string;
}

export interface SessionInfo {
  sessionId: string;
  cwd: string;
  lastActivity: number; // unix ms
  state?: string;
}

export interface ClawConfig {
  agentId: string;
  apiKey: string;
  cloudUrl: string;
  displayName: string;
  handle: string;
  safety: SafetyConfig;
}

export interface SafetyConfig {
  neverShare: string[]; // regex patterns to block
  auditLog: boolean;
}

export interface DigestEntry {
  from: string;
  content: string;
  timestamp: string;
}
