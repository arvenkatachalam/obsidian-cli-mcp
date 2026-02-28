export interface Config {
  vault: string | undefined;
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

  return {
    vault: process.env.OBSIDIAN_VAULT || undefined,
    obsidianCliPath: process.env.OBSIDIAN_CLI_PATH || "obsidian",
    obCliPath: process.env.OB_CLI_PATH || "ob",
    obsidianCliTimeout,
    obCliTimeout,
  };
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
