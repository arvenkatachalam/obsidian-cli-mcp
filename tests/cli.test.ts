import { describe, it, expect } from "vitest";
import {
  buildObsidianArgs,
  parseJsonOutput,
  safeFileSchema,
  safePathSchema,
  vaultNameSchema,
} from "../src/cli.js";

describe("buildObsidianArgs", () => {
  it("builds args with just a command", () => {
    const args = buildObsidianArgs({ command: "vault" });
    expect(args).toEqual(["vault"]);
  });

  it("adds vault from config when no explicit vault", () => {
    const args = buildObsidianArgs({ command: "read" }, "My Vault");
    expect(args).toEqual(["read", "--vault=My Vault"]);
  });

  it("explicit vault overrides config vault", () => {
    const args = buildObsidianArgs(
      { command: "read", vault: "Other Vault" },
      "My Vault",
    );
    expect(args).toEqual(["read", "--vault=Other Vault"]);
  });

  it("adds positional args", () => {
    const args = buildObsidianArgs({
      command: "read",
      positional: ["file=note.md", "path=folder"],
    });
    expect(args).toEqual(["read", "file=note.md", "path=folder"]);
  });

  it("adds boolean flags", () => {
    const args = buildObsidianArgs({
      command: "backlinks",
      flags: { counts: true },
    });
    expect(args).toEqual(["backlinks", "--counts"]);
  });

  it("adds string/number flags", () => {
    const args = buildObsidianArgs({
      command: "search:context",
      flags: { limit: 10, sort: "name" },
    });
    expect(args).toContain("--limit=10");
    expect(args).toContain("--sort=name");
  });

  it("skips undefined and false flags", () => {
    const args = buildObsidianArgs({
      command: "tasks",
      flags: { status: undefined, verbose: false },
    });
    expect(args).toEqual(["tasks"]);
  });

  it("combines vault, positional, and flags", () => {
    const args = buildObsidianArgs(
      {
        command: "search:context",
        positional: ["query=test"],
        flags: { limit: 5 },
        vault: "V",
      },
      "Default",
    );
    expect(args[0]).toBe("search:context");
    expect(args).toContain("--vault=V");
    expect(args).toContain("query=test");
    expect(args).toContain("--limit=5");
  });
});

describe("parseJsonOutput", () => {
  it("parses valid JSON", () => {
    expect(parseJsonOutput('{"key": "value"}')).toEqual({ key: "value" });
  });

  it("parses JSON arrays", () => {
    expect(parseJsonOutput("[1, 2, 3]")).toEqual([1, 2, 3]);
  });

  it("returns null for empty string", () => {
    expect(parseJsonOutput("")).toBeNull();
  });

  it("returns null for whitespace-only", () => {
    expect(parseJsonOutput("   \n  ")).toBeNull();
  });

  it("returns raw string for non-JSON output", () => {
    expect(parseJsonOutput("Some plain text output")).toBe(
      "Some plain text output",
    );
  });

  it("trims whitespace before parsing", () => {
    expect(parseJsonOutput('  {"a": 1}  \n')).toEqual({ a: 1 });
  });
});

describe("validation schemas", () => {
  describe("safeFileSchema", () => {
    it("accepts normal filenames", () => {
      expect(safeFileSchema.safeParse("note.md").success).toBe(true);
      expect(safeFileSchema.safeParse("folder/note.md").success).toBe(true);
      expect(safeFileSchema.safeParse("My Note (2024).md").success).toBe(true);
    });

    it("rejects path traversal", () => {
      expect(safeFileSchema.safeParse("../secret.md").success).toBe(false);
      expect(safeFileSchema.safeParse("foo/../../etc/passwd").success).toBe(
        false,
      );
    });

    it("rejects absolute paths", () => {
      expect(safeFileSchema.safeParse("/etc/passwd").success).toBe(false);
    });

    it("rejects null bytes", () => {
      expect(safeFileSchema.safeParse("note\x00.md").success).toBe(false);
    });

    it("rejects empty string", () => {
      expect(safeFileSchema.safeParse("").success).toBe(false);
    });
  });

  describe("safePathSchema", () => {
    it("accepts normal folder paths", () => {
      expect(safePathSchema.safeParse("folder").success).toBe(true);
      expect(safePathSchema.safeParse("01 Work/subfolder").success).toBe(true);
    });

    it("rejects traversal", () => {
      expect(safePathSchema.safeParse("../outside").success).toBe(false);
    });
  });

  describe("vaultNameSchema", () => {
    it("accepts normal vault names", () => {
      expect(vaultNameSchema.safeParse("My Vault").success).toBe(true);
      expect(vaultNameSchema.safeParse("vault-name_2").success).toBe(true);
      expect(vaultNameSchema.safeParse("Vault (backup)").success).toBe(true);
    });

    it("rejects special characters", () => {
      expect(vaultNameSchema.safeParse("vault;rm -rf").success).toBe(false);
      expect(vaultNameSchema.safeParse("vault`cmd`").success).toBe(false);
    });

    it("rejects empty string", () => {
      expect(vaultNameSchema.safeParse("").success).toBe(false);
    });

    it("rejects overly long names", () => {
      expect(vaultNameSchema.safeParse("a".repeat(201)).success).toBe(false);
    });
  });
});
