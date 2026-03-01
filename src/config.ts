import { execFileSync } from "node:child_process";

export interface Config {
  vault: string;
  vaultPath: string | undefined;
  obsidianCliPath: string;
  obCliPath: string;
  obsidianCliTimeout: number;
  obCliTimeout: number;
}

export function resolveConfig(): Config {
  const timeoutRaw = process.env.OBSIDIAN_CLI_TIMEOUT;
  const obTimeoutRaw = process.env.OB_CLI_TIMEOUT;

  const obsidianCliTimeout = parseTimeout(timeoutRaw, 30000);
  const obCliTimeout = parseTimeout(obTimeoutRaw, 60000);

  const vault = process.env.OBSIDIAN_VAULT || undefined;
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH || undefined;

  if (!vault) {
    throw new Error(
      "OBSIDIAN_VAULT environment variable is required. " +
        "Set it to your vault name in the MCP server configuration.",
    );
  }

  const obsidianCliPath = process.env.OBSIDIAN_CLI_PATH || "obsidian";
  const obCliPath = process.env.OB_CLI_PATH || "ob";

  checkBinary("OBSIDIAN_CLI_PATH", obsidianCliPath);

  return {
    vault,
    vaultPath,
    obsidianCliPath,
    obCliPath,
    obsidianCliTimeout,
    obCliTimeout,
  };
}

function checkBinary(name: string, path: string): void {
  try {
    execFileSync(path, ["--version"], {
      timeout: 5000,
      stdio: "ignore",
    });
  } catch {
    throw new Error(
      `"${path}" binary not found or not executable. ` +
        `Install Obsidian CLI (requires Obsidian 1.12+) or set ${name} to the correct path.`,
    );
  }
}

function parseTimeout(raw: string | undefined, defaultValue: number): number {
  if (raw === undefined) return defaultValue;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `Invalid timeout value: "${raw}". Must be a positive number.`,
    );
  }
  return parsed;
}
