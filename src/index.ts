#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolveConfig } from "./config.js";
import {
  runObsidianCli,
  runObCli,
  parseJsonOutput,
  safeFileSchema,
  safePathSchema,
  vaultNameSchema,
  safePropertyNameSchema,
  safeExtSchema,
} from "./cli.js";

const config = resolveConfig();

const server = new McpServer({
  name: "obsidian-cli-mcp",
  version: "0.1.0",
});

// --- Helper to build MCP text response ---

function textResult(content: string) {
  return { content: [{ type: "text" as const, text: content }] };
}

async function obsidianTool(
  command: string,
  positional?: string[],
  flags?: Record<string, string | number | boolean | undefined>,
  vault?: string,
) {
  const result = await runObsidianCli(config, {
    command,
    positional,
    flags,
    vault,
  });
  const output = result.stdout.trim() || "(no output)";
  const warning = result.stderr ? `\n[stderr]: ${result.stderr}` : "";
  return textResult(output + warning);
}

// ===== READING / QUERYING (7) =====

server.tool(
  "obsidian_read",
  "Read the contents of an Obsidian note",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, vault }) => {
    const positional: string[] = [];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    return obsidianTool("read", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_search",
  "Full-text search across vault notes with context",
  {
    query: z.string().min(1).max(10000),
    folder: safePathSchema.optional(),
    limit: z.number().int().positive().optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ query, folder, limit, vault }) => {
    const positional = [`query=${query}`];
    if (folder) positional.push(`folder=${folder}`);
    const flags: Record<string, string | number | boolean | undefined> = {};
    if (limit) flags.limit = limit;
    return obsidianTool("search:context", positional, flags, vault);
  },
);

server.tool(
  "obsidian_outline",
  "Get the heading structure of a note",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, vault }) => {
    const positional: string[] = [];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    return obsidianTool("outline", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_backlinks",
  "Get incoming links to a note",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    counts: z.boolean().optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, counts, vault }) => {
    const positional: string[] = [];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    const flags: Record<string, string | number | boolean | undefined> = {};
    if (counts) flags.counts = counts;
    return obsidianTool("backlinks", positional, flags, vault);
  },
);

server.tool(
  "obsidian_links",
  "Get outgoing links from a note",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, vault }) => {
    const positional: string[] = [];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    return obsidianTool("links", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_tags",
  "List tags in a note or across the vault with counts",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    sort: z.enum(["name", "count"]).optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, sort, vault }) => {
    const positional: string[] = [];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    const flags: Record<string, string | number | boolean | undefined> = {};
    if (sort) flags.sort = sort;
    return obsidianTool("tags", positional, flags, vault);
  },
);

server.tool(
  "obsidian_tasks",
  "List tasks (todos) in a note or across the vault",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    status: z.enum(["todo", "done", "all"]).optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, status, vault }) => {
    const positional: string[] = [];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    const flags: Record<string, string | number | boolean | undefined> = {};
    if (status) flags.status = status;
    return obsidianTool("tasks", positional, flags, vault);
  },
);

// ===== WRITING / MODIFYING (5) =====

server.tool(
  "obsidian_create",
  "Create a new note in the vault",
  {
    name: safeFileSchema,
    path: safePathSchema.optional(),
    content: z.string().max(100000).optional(),
    template: safeFileSchema.optional(),
    overwrite: z.boolean().optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ name, path, content, template, overwrite, vault }) => {
    const positional = [`name=${name}`];
    if (path) positional.push(`path=${path}`);
    if (content) positional.push(`content=${content}`);
    if (template) positional.push(`template=${template}`);
    const flags: Record<string, string | number | boolean | undefined> = {};
    if (overwrite) flags.overwrite = overwrite;
    return obsidianTool("create", positional, flags, vault);
  },
);

server.tool(
  "obsidian_append",
  "Append content to an existing note",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    content: z.string().min(1).max(100000),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, content, vault }) => {
    const positional: string[] = [`content=${content}`];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    return obsidianTool("append", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_prepend",
  "Prepend content to an existing note",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    content: z.string().min(1).max(100000),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, content, vault }) => {
    const positional: string[] = [`content=${content}`];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    return obsidianTool("prepend", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_property_set",
  "Set a frontmatter property on a note",
  {
    name: safePropertyNameSchema,
    value: z.string().max(10000),
    type: z.string().optional(),
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ name, value, type, file, path, vault }) => {
    const positional = [`name=${name}`, `value=${value}`];
    if (type) positional.push(`type=${type}`);
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    return obsidianTool("property:set", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_task_update",
  "Update a task's status (toggle, complete, etc.)",
  {
    file: safeFileSchema.optional(),
    path: safePathSchema.optional(),
    line: z.number().int().nonnegative(),
    action: z.enum(["toggle", "complete", "incomplete"]),
    vault: vaultNameSchema.optional(),
  },
  async ({ file, path, line, action, vault }) => {
    const positional: string[] = [
      `line=${line}`,
      `action=${action}`,
    ];
    if (file) positional.push(`file=${file}`);
    if (path) positional.push(`path=${path}`);
    return obsidianTool("task", positional, undefined, vault);
  },
);

// ===== NAVIGATION (4) =====

server.tool(
  "obsidian_files",
  "List files in the vault, optionally filtered by folder or extension",
  {
    folder: safePathSchema.optional(),
    ext: safeExtSchema.optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ folder, ext, vault }) => {
    const positional: string[] = [];
    if (folder) positional.push(`folder=${folder}`);
    if (ext) positional.push(`ext=${ext}`);
    return obsidianTool("files", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_folders",
  "List folders in the vault",
  {
    folder: safePathSchema.optional(),
    vault: vaultNameSchema.optional(),
  },
  async ({ folder, vault }) => {
    const positional: string[] = [];
    if (folder) positional.push(`folder=${folder}`);
    return obsidianTool("folders", positional, undefined, vault);
  },
);

server.tool(
  "obsidian_templates",
  "List available templates in the vault",
  {
    vault: vaultNameSchema.optional(),
  },
  async ({ vault }) => {
    return obsidianTool("templates", undefined, undefined, vault);
  },
);

server.tool(
  "obsidian_vault_info",
  "Get vault metadata (name, path, file count, etc.)",
  {
    vault: vaultNameSchema.optional(),
  },
  async ({ vault }) => {
    return obsidianTool("vault", undefined, undefined, vault);
  },
);

// ===== SYNC (2) =====

server.tool(
  "obsidian_sync",
  "Trigger Obsidian sync (requires ob headless client)",
  {
    continuous: z.boolean().optional(),
  },
  async ({ continuous }) => {
    const args: string[] = [];
    if (continuous) args.push("--continuous");
    const result = await runObCli(config, "sync", args);
    const output = result.stdout.trim() || "(no output)";
    const warning = result.stderr ? `\n[stderr]: ${result.stderr}` : "";
    return textResult(output + warning);
  },
);

server.tool(
  "obsidian_sync_status",
  "Check Obsidian sync status (requires ob headless client)",
  {},
  async () => {
    const result = await runObCli(config, "sync-status");
    const output = result.stdout.trim() || "(no output)";
    const warning = result.stderr ? `\n[stderr]: ${result.stderr}` : "";
    return textResult(output + warning);
  },
);

// ===== START SERVER =====

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Failed to start obsidian-cli-mcp server:", err);
  process.exit(1);
});
