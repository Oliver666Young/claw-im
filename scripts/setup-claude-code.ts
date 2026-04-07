#!/usr/bin/env npx tsx
/**
 * Patches ~/.claude/settings.json to add Claw IM hooks and MCP server config.
 * Preserves existing settings (especially existing PreToolUse hooks).
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

interface HookEntry {
  type: string;
  command?: string;
  url?: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

interface McpServer {
  type: string;
  command: string;
  args: string[];
}

interface Settings {
  hooks?: Record<string, HookMatcher[]>;
  mcpServers?: Record<string, McpServer>;
  [key: string]: unknown;
}

function loadSettings(): Settings {
  try {
    const raw = readFileSync(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw) as Settings;
  } catch {
    console.error(`Could not read ${SETTINGS_PATH}, starting with empty settings.`);
    return {};
  }
}

function mergeHookArray(
  existing: HookMatcher[] | undefined,
  newEntry: HookMatcher,
): HookMatcher[] {
  const arr = existing ? [...existing] : [];

  // Check if there's already a matcher group with the same matcher value
  const idx = arr.findIndex((m) => m.matcher === newEntry.matcher);

  if (idx === -1) {
    // No existing matcher group — add the whole entry
    arr.push(newEntry);
  } else {
    // Matcher group exists — merge hooks, avoiding duplicates
    const merged = [...arr[idx].hooks];
    for (const hook of newEntry.hooks) {
      const duplicate = merged.some(
        (h) =>
          h.type === hook.type &&
          h.command === hook.command &&
          h.url === hook.url,
      );
      if (!duplicate) {
        merged.push(hook);
      }
    }
    arr[idx] = { ...arr[idx], hooks: merged };
  }

  return arr;
}

function main(): void {
  const settings = loadSettings();

  // Ensure hooks object exists
  if (!settings.hooks) {
    settings.hooks = {};
  }

  // 1. Add PostToolUse hook
  const postToolUseHook: HookMatcher = {
    matcher: "*",
    hooks: [
      {
        type: "http",
        url: "http://127.0.0.1:18820/hook/post-tool-use",
      },
    ],
  };
  settings.hooks.PostToolUse = mergeHookArray(
    settings.hooks.PostToolUse,
    postToolUseHook,
  );

  // 2. Add SessionStart hook
  const sessionStartHook: HookMatcher = {
    matcher: "startup",
    hooks: [
      {
        type: "command",
        command: `bash ${join(homedir(), ".claw-im", "hooks", "session-start.sh")}`,
      },
    ],
  };
  settings.hooks.SessionStart = mergeHookArray(
    settings.hooks.SessionStart,
    sessionStartHook,
  );

  // 3. Add MCP server config
  if (!settings.mcpServers) {
    settings.mcpServers = {};
  }
  settings.mcpServers["claw-im"] = {
    type: "stdio",
    command: "node",
    args: [join(homedir(), "claw-im", "packages", "clawd", "dist", "mcp-entry.js")],
  };

  // Write back with 2-space indentation to preserve formatting
  mkdirSync(join(homedir(), ".claude"), { recursive: true });
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + "\n", "utf-8");

  console.log("Claw IM hooks and MCP server config merged into", SETTINGS_PATH);
  console.log("  - hooks.PostToolUse: HTTP hook added");
  console.log("  - hooks.SessionStart: session-start.sh added");
  console.log('  - mcpServers["claw-im"]: MCP server configured');
}

main();
