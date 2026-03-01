import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock execFileSync before importing resolveConfig
vi.mock("node:child_process", () => ({
  execFileSync: vi.fn(),
}));

import { execFileSync } from "node:child_process";
import { resolveConfig } from "../src/config.js";

const mockExecFileSync = vi.mocked(execFileSync);

describe("resolveConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OBSIDIAN_VAULT;
    delete process.env.OBSIDIAN_VAULT_PATH;
    delete process.env.OBSIDIAN_CLI_PATH;
    delete process.env.OB_CLI_PATH;
    delete process.env.OBSIDIAN_CLI_TIMEOUT;
    delete process.env.OB_CLI_TIMEOUT;
    mockExecFileSync.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when OBSIDIAN_VAULT is not set", () => {
    expect(() => resolveConfig()).toThrow("OBSIDIAN_VAULT environment variable is required");
  });

  it("throws when OBSIDIAN_VAULT is empty", () => {
    process.env.OBSIDIAN_VAULT = "";
    expect(() => resolveConfig()).toThrow("OBSIDIAN_VAULT environment variable is required");
  });

  it("throws when obsidian binary is not found", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    mockExecFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => resolveConfig()).toThrow('"obsidian" binary not found');
  });

  it("throws with custom path in error when OBSIDIAN_CLI_PATH is set", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    process.env.OBSIDIAN_CLI_PATH = "/custom/bin/obsidian";
    mockExecFileSync.mockImplementation(() => {
      throw new Error("ENOENT");
    });
    expect(() => resolveConfig()).toThrow('"/custom/bin/obsidian" binary not found');
  });

  it("reads all env vars when valid", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    process.env.OBSIDIAN_VAULT_PATH = "/path/to/vault";
    process.env.OBSIDIAN_CLI_PATH = "/usr/local/bin/obsidian";
    process.env.OB_CLI_PATH = "/usr/local/bin/ob";
    process.env.OBSIDIAN_CLI_TIMEOUT = "5000";
    process.env.OB_CLI_TIMEOUT = "10000";

    const config = resolveConfig();
    expect(config.vault).toBe("My Vault");
    expect(config.vaultPath).toBe("/path/to/vault");
    expect(config.obsidianCliPath).toBe("/usr/local/bin/obsidian");
    expect(config.obCliPath).toBe("/usr/local/bin/ob");
    expect(config.obsidianCliTimeout).toBe(5000);
    expect(config.obCliTimeout).toBe(10000);
  });

  it("returns defaults for optional env vars", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    const config = resolveConfig();
    expect(config.vaultPath).toBeUndefined();
    expect(config.obsidianCliPath).toBe("obsidian");
    expect(config.obCliPath).toBe("ob");
    expect(config.obsidianCliTimeout).toBe(30000);
    expect(config.obCliTimeout).toBe(60000);
  });

  it("throws on invalid timeout (non-numeric)", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    process.env.OBSIDIAN_CLI_TIMEOUT = "abc";
    expect(() => resolveConfig()).toThrow("Invalid timeout");
  });

  it("throws on invalid timeout (negative)", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    process.env.OB_CLI_TIMEOUT = "-1";
    expect(() => resolveConfig()).toThrow("Invalid timeout");
  });

  it("throws on invalid timeout (zero)", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    process.env.OBSIDIAN_CLI_TIMEOUT = "0";
    expect(() => resolveConfig()).toThrow("Invalid timeout");
  });

  it("checks obsidian binary with --version", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    resolveConfig();
    expect(mockExecFileSync).toHaveBeenCalledWith(
      "obsidian",
      ["--version"],
      expect.objectContaining({ timeout: 5000, stdio: "ignore" }),
    );
  });

  it("does not check ob binary at startup", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    resolveConfig();
    expect(mockExecFileSync).not.toHaveBeenCalledWith(
      "ob",
      expect.anything(),
      expect.anything(),
    );
  });
});
