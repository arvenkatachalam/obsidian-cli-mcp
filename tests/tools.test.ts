import { describe, it, expect, vi, beforeEach } from "vitest";
import { execFile } from "node:child_process";

// Mock child_process before importing modules that use it
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

// We need to mock util.promisify to work with our mocked execFile
vi.mock("node:util", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    promisify: (fn: unknown) => {
      // Return a function that calls the mock and returns a promise
      return (...args: unknown[]) => {
        return new Promise((resolve, reject) => {
          (fn as Function)(...args, (err: Error | null, result: unknown) => {
            if (err) reject(err);
            else resolve(result);
          });
        });
      };
    },
  };
});

import { runObsidianCli, runObCli } from "../src/cli.js";
import type { Config } from "../src/config.js";

const mockExecFile = vi.mocked(execFile);

function makeConfig(overrides?: Partial<Config>): Config {
  return {
    vault: "TestVault",
    vaultPath: "/path/to/TestVault",
    obsidianCliPath: "obsidian",
    obCliPath: "ob",
    obsidianCliTimeout: 30000,
    obCliTimeout: 60000,
    ...overrides,
  };
}

function mockSuccess(stdout: string, stderr = "") {
  mockExecFile.mockImplementation(
    (_cmd: any, _args: any, _opts: any, callback: any) => {
      callback(null, { stdout, stderr });
      return {} as any;
    },
  );
}

function mockFailure(stderr: string, code = 1) {
  mockExecFile.mockImplementation(
    (_cmd: any, _args: any, _opts: any, callback: any) => {
      const err = new Error("Command failed") as any;
      err.code = code;
      err.stderr = stderr;
      callback(err);
      return {} as any;
    },
  );
}

describe("runObsidianCli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls execFile with correct binary and args", async () => {
    mockSuccess("output");
    const config = makeConfig();
    await runObsidianCli(config, { command: "read", positional: ["file=test.md"] });

    expect(mockExecFile).toHaveBeenCalledTimes(1);
    const call = mockExecFile.mock.calls[0]!;
    expect(call[0]).toBe("obsidian");
    expect(call[1]).toEqual(["read", "--vault=TestVault", "file=test.md"]);
  });

  it("returns stdout and filtered stderr", async () => {
    mockSuccess("content here", "some warning\n");
    const config = makeConfig();
    const result = await runObsidianCli(config, { command: "read" });
    expect(result.stdout).toBe("content here");
    expect(result.stderr).toContain("some warning");
  });

  it("filters node experimental warnings from stderr", async () => {
    mockSuccess("ok", "(node:12345) ExperimentalWarning: something\nreal warning");
    const config = makeConfig();
    const result = await runObsidianCli(config, { command: "vault" });
    expect(result.stderr).not.toContain("ExperimentalWarning");
    expect(result.stderr).toContain("real warning");
  });

  it("throws on CLI failure", async () => {
    mockFailure("file not found");
    const config = makeConfig();
    await expect(
      runObsidianCli(config, { command: "read", positional: ["file=nope.md"] }),
    ).rejects.toThrow("file not found");
  });

  it("uses custom CLI path", async () => {
    mockSuccess("ok");
    const config = makeConfig({ obsidianCliPath: "/custom/obsidian" });
    await runObsidianCli(config, { command: "vault" });
    expect(mockExecFile.mock.calls[0]![0]).toBe("/custom/obsidian");
  });

  it("passes timeout to execFile options", async () => {
    mockSuccess("ok");
    const config = makeConfig({ obsidianCliTimeout: 5000 });
    await runObsidianCli(config, { command: "vault" });
    const opts = mockExecFile.mock.calls[0]![2] as any;
    expect(opts.timeout).toBe(5000);
  });

  it("omits vault flag when no vault configured", async () => {
    mockSuccess("ok");
    const config = makeConfig({ vault: undefined });
    await runObsidianCli(config, { command: "vault" });
    const args = mockExecFile.mock.calls[0]![1] as string[];
    expect(args.some((a: string) => a.includes("--vault"))).toBe(false);
  });
});

describe("runObCli", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls ob with correct subcommand", async () => {
    mockSuccess("synced");
    const config = makeConfig();
    await runObCli(config, "sync");

    expect(mockExecFile.mock.calls[0]![0]).toBe("ob");
    const args = mockExecFile.mock.calls[0]![1] as string[];
    expect(args[0]).toBe("sync");
    expect(args).toContain("--path=/path/to/TestVault");
  });

  it("passes additional args", async () => {
    mockSuccess("synced");
    const config = makeConfig();
    await runObCli(config, "sync", ["--continuous"]);

    const args = mockExecFile.mock.calls[0]![1] as string[];
    expect(args).toContain("--continuous");
  });

  it("throws on failure", async () => {
    mockFailure("sync error");
    const config = makeConfig();
    await expect(runObCli(config, "sync")).rejects.toThrow("sync error");
  });

  it("uses ob timeout", async () => {
    mockSuccess("ok");
    const config = makeConfig({ obCliTimeout: 120000 });
    await runObCli(config, "sync-status");
    const opts = mockExecFile.mock.calls[0]![2] as any;
    expect(opts.timeout).toBe(120000);
  });
});

describe("tool argument construction", () => {
  // These tests verify the argument patterns that each tool would produce
  // by testing buildObsidianArgs directly with the patterns each tool uses

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("obsidian_read builds correct args", async () => {
    mockSuccess("note content");
    const config = makeConfig();
    await runObsidianCli(config, {
      command: "read",
      positional: ["file=test.md"],
    });
    const args = mockExecFile.mock.calls[0]![1] as string[];
    expect(args[0]).toBe("read");
    expect(args).toContain("file=test.md");
  });

  it("obsidian_search builds correct args with all params", async () => {
    mockSuccess("[]");
    const config = makeConfig();
    await runObsidianCli(config, {
      command: "search:context",
      positional: ["query=test query", "folder=subfolder"],
      flags: { limit: 10 },
    });
    const args = mockExecFile.mock.calls[0]![1] as string[];
    expect(args[0]).toBe("search:context");
    expect(args).toContain("query=test query");
    expect(args).toContain("folder=subfolder");
    expect(args).toContain("--limit=10");
  });

  it("obsidian_create builds correct args", async () => {
    mockSuccess("created");
    const config = makeConfig();
    await runObsidianCli(config, {
      command: "create",
      positional: ["name=New Note", "path=folder", "content=Hello"],
      flags: { overwrite: true },
    });
    const args = mockExecFile.mock.calls[0]![1] as string[];
    expect(args[0]).toBe("create");
    expect(args).toContain("name=New Note");
    expect(args).toContain("--overwrite");
  });

  it("obsidian_task_update builds correct args", async () => {
    mockSuccess("toggled");
    const config = makeConfig();
    await runObsidianCli(config, {
      command: "task",
      positional: ["line=5", "action=toggle", "file=todo.md"],
    });
    const args = mockExecFile.mock.calls[0]![1] as string[];
    expect(args[0]).toBe("task");
    expect(args).toContain("line=5");
    expect(args).toContain("action=toggle");
  });
});
