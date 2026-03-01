# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An MCP (Model Context Protocol) server that wraps the Obsidian CLI (`obsidian` and `ob` binaries) to expose 18 tools for AI clients to interact with Obsidian vaults. Requires Obsidian 1.12+. Uses stdio transport.

## Commands

```bash
npm run build          # Compile TypeScript (tsc → dist/)
npm run dev            # Watch mode
npm test               # Run all tests (vitest)
npm run test:security  # Run security tests only
npx vitest run tests/cli.test.ts  # Run a single test file
```

## Architecture

Three source files with clear separation:

- **src/index.ts** — MCP server setup, all 18 tool definitions and handlers. Tools are grouped: reading (read, search, outline, backlinks, links, tags, tasks), writing (create, append, prepend, property_set, task_update), navigation (files, folders, templates, vault_info), and sync (sync, sync_status). Each handler validates inputs via Zod schemas then delegates to CLI execution functions.

- **src/cli.ts** — CLI execution layer. `buildObsidianArgs()` constructs argument arrays, `runObsidianCli()` and `runObCli()` execute commands via `execFile` (not `exec` — important for shell injection safety). Contains all Zod validation schemas (`safeFileSchema`, `safePathSchema`, `vaultNameSchema`, `safePropertyNameSchema`, `safeExtSchema`) that enforce path traversal prevention, length limits, and input sanitization.

- **src/config.ts** — Resolves configuration from environment variables: `OBSIDIAN_VAULT`, `OBSIDIAN_VAULT_PATH`, `OBSIDIAN_CLI_PATH`, `OB_CLI_PATH`, `OBSIDIAN_CLI_TIMEOUT` (default 30s), `OB_CLI_TIMEOUT` (default 60s).

## Key Conventions

- **ES Modules** — `"type": "module"` in package.json; use `import`/`export` syntax.
- **TypeScript strict mode** — All strict checks enabled, target ES2022, module Node16.
- **Security-first validation** — All user-facing string inputs go through Zod schemas that block path traversal (`../`), absolute paths, null bytes, and leading dashes. Content is capped at 100K chars, paths at 10K, vault names at 200.
- **`execFile` not `exec`** — Commands are never run through a shell; arguments are passed as arrays to prevent injection.
- **Stderr filtering** — `filterStderr()` strips Node.js `ExperimentalWarning` lines from CLI output before returning results.

## Testing

Five test suites (~250 cases) using Vitest:

- `tests/config.test.ts` — Config resolution and env var parsing
- `tests/cli.test.ts` — Argument building, schema validation, JSON parsing
- `tests/tools.test.ts` — CLI execution with mocked `execFile`
- `tests/security.test.ts` — Attack vector validation (traversal, injection, oversized input)
- `tests/pentest.test.ts` — Regression tests for 8 specific security findings (P1–P8)

Tests mock `child_process.execFile` and `util.promisify`. When adding new tools, add corresponding schema validation tests and security tests.
