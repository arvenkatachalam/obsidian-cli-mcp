import { describe, it, expect } from "vitest";
import { safeFileSchema, safePathSchema, vaultNameSchema } from "../src/cli.js";

describe("security: path traversal prevention", () => {
  const traversalPayloads = [
    "../../../etc/passwd",
    "..\\..\\windows\\system32",
    "foo/../../../etc/shadow",
    "notes/../../secret",
    "../..",
  ];

  for (const payload of traversalPayloads) {
    it(`rejects file path traversal: "${payload}"`, () => {
      expect(safeFileSchema.safeParse(payload).success).toBe(false);
    });

    it(`rejects folder path traversal: "${payload}"`, () => {
      expect(safePathSchema.safeParse(payload).success).toBe(false);
    });
  }
});

describe("security: null byte injection", () => {
  const nullPayloads = [
    "note\x00.md",
    "\x00",
    "folder\x00/file.md",
    "test\x00",
  ];

  for (const payload of nullPayloads) {
    it(`rejects null bytes in file: "${payload.replace(/\x00/g, "\\x00")}"`, () => {
      expect(safeFileSchema.safeParse(payload).success).toBe(false);
    });
  }
});

describe("security: absolute path prevention", () => {
  const absolutePaths = [
    "/etc/passwd",
    "/home/user/.ssh/id_rsa",
    "/tmp/evil",
  ];

  for (const payload of absolutePaths) {
    it(`rejects absolute path: "${payload}"`, () => {
      expect(safeFileSchema.safeParse(payload).success).toBe(false);
    });
  }
});

describe("security: shell metacharacters in content are safe", () => {
  // These should be ACCEPTED by validation since they're passed via execFile
  // (no shell interpretation). This test documents that we don't over-restrict content.
  it("allows shell metacharacters in file names (they won't execute)", () => {
    // File names with special chars are valid (the CLI handles them)
    // We only block traversal, absolute paths, and null bytes
    const allowed = [
      "note with spaces.md",
      "note (copy).md",
      "note-2024.md",
    ];
    for (const name of allowed) {
      expect(safeFileSchema.safeParse(name).success).toBe(true);
    }
  });
});

describe("security: vault name validation", () => {
  it("rejects shell injection in vault names", () => {
    const attacks = [
      "vault; rm -rf /",
      "vault`whoami`",
      "vault$(id)",
      "vault | cat /etc/passwd",
      'vault" && echo pwned',
    ];
    for (const attack of attacks) {
      expect(vaultNameSchema.safeParse(attack).success).toBe(false);
    }
  });
});

describe("security: oversized input", () => {
  it("rejects vault names over 200 chars", () => {
    const longName = "a".repeat(201);
    expect(vaultNameSchema.safeParse(longName).success).toBe(false);
  });

  it("accepts vault names at boundary (200 chars)", () => {
    const name = "a".repeat(200);
    expect(vaultNameSchema.safeParse(name).success).toBe(true);
  });
});

describe("security: empty and missing values", () => {
  it("rejects empty file name", () => {
    expect(safeFileSchema.safeParse("").success).toBe(false);
  });

  it("rejects empty path", () => {
    expect(safePathSchema.safeParse("").success).toBe(false);
  });

  it("rejects empty vault name", () => {
    expect(vaultNameSchema.safeParse("").success).toBe(false);
  });
});
