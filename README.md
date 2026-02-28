# obsidian-cli-mcp

MCP server that wraps the Obsidian CLI (`obsidian`) and headless sync client (`ob`) so any MCP-compatible AI tool can interact with Obsidian vaults.

Requires **Obsidian 1.12+** which introduced the CLI tools.

## Install

```bash
git clone <repo-url> && cd obsidian-cli-mcp
npm install && npm run build
```

## Configure

Add to your MCP client config (e.g. Claude Code `~/.mcp.json`):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": ["/path/to/obsidian-cli-mcp/dist/index.js"],
      "env": {
        "OBSIDIAN_VAULT": "My Vault Name"
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OBSIDIAN_VAULT` | _(none)_ | Default vault name |
| `OBSIDIAN_CLI_PATH` | `obsidian` | Path to `obsidian` binary |
| `OB_CLI_PATH` | `ob` | Path to `ob` binary |
| `OBSIDIAN_CLI_TIMEOUT` | `30000` | CLI timeout (ms) |
| `OB_CLI_TIMEOUT` | `60000` | Sync timeout (ms) |

## Tools (18)

### Reading
- `obsidian_read` — Read note contents
- `obsidian_search` — Full-text search with context
- `obsidian_outline` — Heading structure
- `obsidian_backlinks` — Incoming links
- `obsidian_links` — Outgoing links
- `obsidian_tags` — Tags with counts
- `obsidian_tasks` — Todo/done tasks

### Writing
- `obsidian_create` — Create note
- `obsidian_append` — Append to note
- `obsidian_prepend` — Prepend to note
- `obsidian_property_set` — Set frontmatter property
- `obsidian_task_update` — Toggle/complete task

### Navigation
- `obsidian_files` — List files
- `obsidian_folders` — List folders
- `obsidian_templates` — List templates
- `obsidian_vault_info` — Vault metadata

### Sync
- `obsidian_sync` — Trigger sync
- `obsidian_sync_status` — Check sync status

## Development

```bash
npm test              # run all tests
npm run test:security # security tests only
npm run build         # compile TypeScript
```

## License

MIT
