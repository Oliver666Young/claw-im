import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import {
  CONFIG_DIR,
  CONFIG_PATH,
  DIGEST_DIR,
  LOGS_DIR,
  HOOKS_DIR,
} from '@claw-im/shared';
import type { ClawConfig } from '@claw-im/shared';

export function ensureConfigDir(): void {
  const dirs = [CONFIG_DIR, DIGEST_DIR, LOGS_DIR, HOOKS_DIR];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }
}

export function loadConfig(): ClawConfig | null {
  try {
    if (!existsSync(CONFIG_PATH)) return null;
    const raw = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw) as ClawConfig;
  } catch {
    return null;
  }
}

export function saveConfig(config: ClawConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
