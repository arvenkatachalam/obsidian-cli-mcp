# Changelog

## [0.2.0] - 2026-02-28

### Added

- Startup validation requiring `OBSIDIAN_VAULT` environment variable
- Startup check that the `obsidian` binary exists and is executable
- Clear error messages guiding users to set the correct env vars

### Fixed

- `runObCli` test incorrectly asserting `--vault` instead of `--path` for sync commands

## [0.1.0] - 2026-02-28

### Added

- MCP server exposing 18 tools for Obsidian vault interaction (read, search, outline, backlinks, links, tags, tasks, create, append, prepend, property set, task update, files, folders, templates, vault info, sync, sync status)
- Configurable via environment variables (`OBSIDIAN_VAULT`, `OBSIDIAN_VAULT_PATH`, `OBSIDIAN_CLI_PATH`, `OB_CLI_PATH`, timeouts)
- Input validation with Zod schemas preventing path traversal, null byte injection, and oversized inputs
- Safe command execution via `execFile` (no shell interpretation)
- Stderr filtering for Node.js experimental warnings

### Fixed

- Hardened all inputs against pentest findings P1-P8 (path traversal, vault injection, YAML injection, flag injection, length limits)
- `ob` sync commands now correctly use `--path` instead of `--vault`
