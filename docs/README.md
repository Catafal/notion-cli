# Documentation Index

This directory contains comprehensive documentation for the Notion CLI.

## User Guides

Essential guides for using the CLI effectively:

- **[Authentication Setup](user-guides/authentication-setup.md)** - Get your token and configure the CLI
- **[AI Agent Guide](user-guides/ai-agent-guide.md)** - Quick reference for AI assistants using this CLI
- **[AI Agent Cookbook](user-guides/ai-agent-cookbook.md)** - Common patterns and recipes for AI agents
- **[Output Formats](user-guides/output-formats.md)** - JSON, CSV, YAML, and table output options
- **[Filter Guide](user-guides/filter-guide.md)** - Database query filtering syntax
- **[Simple Properties](user-guides/simple-properties.md)** - Flat JSON property format for easier use
- **[Verbose Logging](user-guides/verbose-logging.md)** - Debug mode and troubleshooting
- **[Envelope System](user-guides/envelope-index.md)** - Standardized response format
- **[Error Handling](user-guides/error-handling-examples.md)** - Understanding and handling errors
- **[Batch Operations](user-guides/batch-operations.md)** - Retrieve or delete multiple resources at once
- **[Interactive Browsing](user-guides/interactive-browsing.md)** - Navigate Notion page trees with arrow keys
- **[Page Export](export.md)** - Export Notion pages to markdown or JSON files
- **[Daily Journal Setup](user-guides/daily-journal-setup.md)** - Zero-friction daily entries from the command line
- **[Templates Guide](user-guides/templates-guide.md)** - Reusable page presets for consistent page creation
- **[Fuzzy Search](user-guides/fuzzy-search.md)** - Typo-tolerant name resolution and database filtering
- **[Append Command](append.md)** - Add content to existing pages by name
- **[Stats Dashboard](stats.md)** - Workspace statistics at a glance
- **[Markdown to Notion](user-guides/markdown-to-notion.md)** - Supported markdown features and how they map to Notion blocks

## Architecture

Deep dives into internal systems:

- **[Caching](architecture/caching.md)** - In-memory and persistent caching strategy
- **[Envelopes](architecture/envelopes.md)** - Response envelope architecture
- **[Error Handling](architecture/error-handling.md)** - Enhanced error system architecture
- **[Smart ID Resolution](architecture/smart-id-resolution.md)** - Automatic database_id ↔ data_source_id conversion
- **[Interactive Navigator](architecture/interactive-navigator.md)** - Browse command internals and data flow

## API Reference

Notion API documentation:

- **[Notion API v5.2.1](api-reference/notion-api-reference-v5.2.1.md)** - Complete API reference
- **[Quick Reference](api-reference/notion-api-quick-reference.md)** - Common API patterns
- **[Database Specification](api-reference/notion-api-database-specification.md)** - Database API details
- **[Search & Users](api-reference/notion-api-search-users-spec.md)** - Search and user endpoints

## Development

Guides for contributors and AI assistants working on this codebase:

- **[Claude Guide](development/claude-guide.md)** - Instructions for Claude Code when contributing
- **[Gemini Guide](development/gemini-guide.md)** - Instructions for Gemini when contributing

---

For the main README with installation and quick start, see [../README.md](../README.md).
