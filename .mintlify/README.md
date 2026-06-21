# Mintlify MCP Integration

This directory contains Mintlify Model Context Protocol (MCP) server configuration for the Wasd project.

## Overview

The Mintlify MCP server provides:
- **Documentation Search**: Search across the Mintlify knowledge base
- **Documentation Query**: Run read-only queries against virtualized documentation filesystem
- **Dashboard Access**: Integration with Mintlify dashboard for content management

## Configuration

The MCP configuration is stored in `.mintlify/mcp.json`.

### Available Tools

1. `search_mintlify` - Search across Mintlify documentation
2. `query_docs_filesystem_mintlify` - Query the documentation filesystem

## Installation for AI Assistants

To use this MCP server with an AI coding assistant:

### Cursor
1. Open Cursor Settings → MCP
2. Add new MCP server
3. Point to `.mintlify/mcp.json` or use the npm package

### Claude Desktop
Add to `~/.claude/mcp_servers.json`:
```json
{
  "mcpServers": {
    "mintlify-docs": {
      "command": "npx",
      "args": ["-y", "@mintlify/mcp@latest"]
    }
  }
}
```

### VS Code Copilot
Follow the Copilot MCP extension setup instructions.

## Resources

- [Mintlify MCP Documentation](https://mintlify.com/docs/mcp)
- [MCP Registry](https://mintlify.com/docs/mcp-registry)
- [Admin MCP](https://mintlify.com/docs/admin-mcp)

## Notes

This configuration enables AI assistants to:
- Search Mintlify documentation for best practices
- Query documentation pages for context on project structure
- Access documentation patterns and component examples
