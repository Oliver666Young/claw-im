import type { Tier, Zone } from './types.js';

export interface TierCapabilities {
  canSendMessages: boolean;
  canSendCode: boolean;
  canSeeFilePaths: boolean;
  canInterrupt: boolean;
  defaultZone: Zone;
  maxMessageLength: number;
  rateLimit: number; // per minute
}

export const TIER_CAPABILITIES: Record<Tier, TierCapabilities> = {
  self: {
    canSendMessages: true,
    canSendCode: true,
    canSeeFilePaths: true,
    canInterrupt: true,
    defaultZone: 'interrupt',
    maxMessageLength: 32_768,
    rateLimit: Infinity,
  },
  friend: {
    canSendMessages: true,
    canSendCode: true,
    canSeeFilePaths: false,
    canInterrupt: false, // only when urgent
    defaultZone: 'mailbox',
    maxMessageLength: 16_384,
    rateLimit: 30,
  },
  stranger: {
    canSendMessages: true,
    canSendCode: false,
    canSeeFilePaths: false,
    canInterrupt: false,
    defaultZone: 'digest',
    maxMessageLength: 1_024,
    rateLimit: 5,
  },
};

export function resolveZone(tier: Tier, urgent?: boolean, replyToSelf?: boolean): Zone {
  if (tier === 'self') return 'interrupt';
  if (tier === 'friend') {
    if (urgent || replyToSelf) return 'interrupt';
    return 'mailbox';
  }
  return 'digest';
}
