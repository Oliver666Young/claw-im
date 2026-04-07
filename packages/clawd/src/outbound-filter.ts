import type { Tier } from '@claw-im/shared';

interface FilterResult {
  allowed: boolean;
  reason?: string;
  sanitized?: string;
}

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  {
    name: 'Private Key',
    regex: /-----BEGIN[A-Z\s]*PRIVATE KEY-----/,
  },
  {
    name: 'AWS Access Key',
    regex: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: 'JWT Token',
    regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\./,
  },
  {
    name: 'Environment Variable',
    regex: /^(?:AWS_SECRET|DATABASE_URL|API_KEY|SECRET_KEY|PRIVATE_KEY|PASSWORD|TOKEN|OPENAI_API_KEY|ANTHROPIC_API_KEY)[A-Z_]*=.+/m,
  },
];

const PATH_PATTERN = /(?:\/Users\/[^\s"']+|\/home\/[^\s"']+|[A-Z]:\\[^\s"']+)/g;

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

function detectSecrets(content: string): string[] {
  const found: string[] = [];
  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(content)) {
      found.push(pattern.name);
    }
  }
  return found;
}

function sanitizePaths(content: string): string {
  return content.replace(PATH_PATTERN, (match) => {
    // Replace the home directory part with ~
    const homeMatch = match.match(/^(?:\/Users\/[^/]+|\/home\/[^/]+)/);
    if (homeMatch) {
      return match.replace(homeMatch[0], '~');
    }
    return '[path-redacted]';
  });
}

function stripCodeBlocks(content: string): string {
  return content.replace(CODE_BLOCK_PATTERN, '[code-block-redacted]');
}

export function filterMessage(content: string, tier: Tier): FilterResult {
  const secrets = detectSecrets(content);

  if (tier === 'self') {
    // Always allow, but warn if secrets found
    if (secrets.length > 0) {
      return {
        allowed: true,
        reason: `Warning: message contains ${secrets.join(', ')}`,
        sanitized: content,
      };
    }
    return { allowed: true };
  }

  if (tier === 'friend') {
    // Block secrets, sanitize paths
    if (secrets.length > 0) {
      return {
        allowed: false,
        reason: `Blocked: message contains ${secrets.join(', ')}`,
      };
    }
    const sanitized = sanitizePaths(content);
    return {
      allowed: true,
      sanitized: sanitized !== content ? sanitized : undefined,
    };
  }

  // stranger tier: strictest
  if (secrets.length > 0) {
    return {
      allowed: false,
      reason: `Blocked: message contains ${secrets.join(', ')}`,
    };
  }

  let sanitized = sanitizePaths(content);
  sanitized = stripCodeBlocks(sanitized);

  if (sanitized !== content) {
    return { allowed: true, sanitized };
  }
  return { allowed: true };
}
