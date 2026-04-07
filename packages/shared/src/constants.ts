export const CLAWD_PORT = 18820;
export const CLAWD_HOST = '127.0.0.1';
export const CLAWD_BASE_URL = `http://${CLAWD_HOST}:${CLAWD_PORT}`;
export const CLAWD_IPC_PATH = '/tmp/clawd.sock';

export const CLOUD_DEFAULT_URL = 'wss://claw.bauhinia.ai';
export const CLOUD_HTTP_PORT = 3820;

export const CONFIG_DIR = `${process.env.HOME}/.claw-im`;
export const CONFIG_PATH = `${CONFIG_DIR}/config.json`;
export const CONTACTS_DB_PATH = `${CONFIG_DIR}/contacts.db`;
export const AUDIT_LOG_PATH = `${CONFIG_DIR}/audit.log`;
export const DIGEST_DIR = `${CONFIG_DIR}/digest`;
export const LOGS_DIR = `${CONFIG_DIR}/logs`;
export const HOOKS_DIR = `${CONFIG_DIR}/hooks`;

export const WS_HEARTBEAT_INTERVAL = 30_000;
export const WS_HEARTBEAT_TIMEOUT = 90_000;
export const WS_RECONNECT_MIN = 1_000;
export const WS_RECONNECT_MAX = 30_000;

export const SESSION_IDLE_TIMEOUT = 10 * 60_000; // 10 minutes

export const API_KEY_LENGTH = 48; // hex chars

// Per-tier rate limits (messages per minute)
export const RATE_LIMIT = {
  self: Infinity,
  friend: 30,
  stranger: 5,
} as const;

// Per-tier message length limits (bytes)
export const MESSAGE_LENGTH_LIMIT = {
  self: 32_768,
  friend: 16_384,
  stranger: 1_024,
} as const;

export const AUTO_WAKE_MAX_TURNS = 10;
