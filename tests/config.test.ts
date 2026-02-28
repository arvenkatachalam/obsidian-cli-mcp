import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveConfig } from "../src/config.js";

describe("resolveConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OBSIDIAN_VAULT;
    delete process.env.OBSIDIAN_CLI_PATH;
    delete process.env.OB_CLI_PATH;
    delete process.env.OBSIDIAN_CLI_TIMEOUT;
    delete process.env.OB_CLI_TIMEOUT;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns defaults when no env vars set", () => {
    const config = resolveConfig();
    expect(config.vault).toBeUndefined();
    expect(config.obsidianCliPath).toBe("obsidian");
    expect(config.obCliPath).toBe("ob");
    expect(config.obsidianCliTimeout).toBe(30000);
    expect(config.obCliTimeout).toBe(60000);
  });

  it("reads all env vars", () => {
    process.env.OBSIDIAN_VAULT = "My Vault";
    process.env.OBSIDIAN_CLI_PATH = "/usr/local/bin/obsidian";
    process.env.OB_CLI_PATH = "/usr/local/bin/ob";
    process.env.OBSIDIAN_CLI_TIMEOUT = "5000";
    process.env.OB_CLI_TIMEOUT = "10000";

    const config = resolveConfig();
    expect(config.vault).toBe("My Vault");
    expect(config.obsidianCliPath).toBe("/usr/local/bin/obsidian");
    expect(config.obCliPath).toBe("/usr/local/bin/ob");
    expect(config.obsidianCliTimeout).toBe(5000);
    expect(config.obCliTimeout).toBe(10000);
  });

  it("treats empty OBSIDIAN_VAULT as undefined", () => {
    process.env.OBSIDIAN_VAULT = "";
    const config = resolveConfig();
    expect(config.vault).toBeUndefined();
  });

  it("throws on invalid timeout (non-numeric)", () => {
    process.env.OBSIDIAN_CLI_TIMEOUT = "abc";
    expect(() => resolveConfig()).toThrow("Invalid timeout");
  });

  it("throws on invalid timeout (negative)", () => {
    process.env.OB_CLI_TIMEOUT = "-1";
    expect(() => resolveConfig()).toThrow("Invalid timeout");
  });

  it("throws on invalid timeout (zero)", () => {
    process.env.OBSIDIAN_CLI_TIMEOUT = "0";
    expect(() => resolveConfig()).toThrow("Invalid timeout");
  });
});
