import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { z } from "zod";
import { type Config } from "./config.js";

const execFile = promisify(execFileCb);

// --- Validation schemas ---

const PATH_UNSAFE = /(?:^\/|\.\.(?:[\\/]|$)|\x00)/;

export const safeFileSchema = z
  .string()
  .min(1)
  .max(10000)
  .refine((v) => !PATH_UNSAFE.test(v), {
    message:
      "File path must not contain '..' traversal, absolute paths, or null bytes",
  });

export const safePathSchema = z
  .string()
  .min(1)
  .max(10000)
  .refine((v) => !PATH_UNSAFE.test(v), {
    message:
      "Folder path must not contain '..' traversal, absolute paths, or null bytes",
  });

export const vaultNameSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w\s\-().]+$/, {
    message:
      "Vault name may only contain letters, numbers, spaces, hyphens, parentheses, and dots",
  })
  .refine((v) => !v.startsWith("-"), {
    message: "Vault name must not start with a dash",
  });

export const safePropertyNameSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[\w\-. ]+$/, {
    message: "Property name contains invalid characters",
  });

export const safeExtSchema = z
  .string()
  .max(20)
  .regex(/^[\w.]+$/, {
    message: "Extension contains invalid characters",
  });

// --- Argument building ---

export interface ObsidianRunOpts {
  command: string;
  positional?: string[];
  flags?: Record<string, string | number | boolean | undefined>;
  vault?: string;
}

export function buildObsidianArgs(
  opts: ObsidianRunOpts,
  configVault?: string,
): string[] {
  const args: string[] = [opts.command];

  // Add vault flag — explicit param overrides config default
  const vault = opts.vault ?? configVault;
  if (vault) {
    args.push(`--vault=${vault}`);
  }

  // Add positional key=value args
  if (opts.positional) {
    args.push(...opts.positional);
  }

  // Add flags
  if (opts.flags) {
    for (const [key, value] of Object.entries(opts.flags)) {
      if (value === undefined || value === false) continue;
      if (value === true) {
        args.push(`--${key}`);
      } else {
        args.push(`--${key}=${String(value)}`);
      }
    }
  }

  return args;
}

// --- CLI execution ---

export interface CliResult {
  stdout: string;
  stderr: string;
}

export async function runObsidianCli(
  config: Config,
  opts: ObsidianRunOpts,
): Promise<CliResult> {
  const args = buildObsidianArgs(opts, config.vault);
  try {
    const { stdout, stderr } = await execFile(config.obsidianCliPath, args, {
      timeout: config.obsidianCliTimeout,
      maxBuffer: 10 * 1024 * 1024, // 10 MB
    });
    return { stdout: stdout ?? "", stderr: filterStderr(stderr ?? "") };
  } catch (err) {
    throw wrapCliError("obsidian", args, err);
  }
}

export async function runObCli(
  config: Config,
  subcommand: string,
  args: string[] = [],
): Promise<CliResult> {
  const fullArgs = [subcommand, ...args];

  // ob sync commands use --path, not --vault
  if (config.vaultPath) {
    fullArgs.push(`--path=${config.vaultPath}`);
  }

  try {
    const { stdout, stderr } = await execFile(config.obCliPath, fullArgs, {
      timeout: config.obCliTimeout,
      maxBuffer: 10 * 1024 * 1024,
    });
    return { stdout: stdout ?? "", stderr: filterStderr(stderr ?? "") };
  } catch (err) {
    throw wrapCliError("ob", fullArgs, err);
  }
}

// --- Output parsing ---

export function parseJsonOutput(stdout: string): unknown {
  const trimmed = stdout.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Return raw text if not valid JSON
    return trimmed;
  }
}

// --- Helpers ---

function filterStderr(stderr: string): string {
  if (!stderr) return "";
  return stderr
    .split("\n")
    .filter((line) => {
      const l = line.trim();
      if (!l) return false;
      // Filter out common noisy lines
      if (l.startsWith("(node:")) return false;
      if (l.includes("ExperimentalWarning")) return false;
      return true;
    })
    .join("\n");
}

function wrapCliError(
  binary: string,
  args: string[],
  err: unknown,
): Error {
  const e = err as {
    code?: string;
    killed?: boolean;
    signal?: string;
    stderr?: string;
    message?: string;
  };

  if (e.killed || e.signal === "SIGTERM") {
    return new Error(
      `${binary} command timed out: ${binary} ${args.join(" ")}`,
    );
  }

  const stderr = (e.stderr ?? "").trim();
  const detail = stderr || e.message || "Unknown error";
  return new Error(`${binary} command failed: ${detail}`);
}
