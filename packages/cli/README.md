# @supermemory/cli

Command-line interface for Supermemory - manage your AI memory from the terminal.

## Installation

```bash
npm install -g @supermemory/cli
```

## Quick Start

```bash
# Authenticate
sm auth YOUR_API_KEY

# Add a memory
sm add "Machine learning is a subset of AI"

# Search memories
sm search "machine learning"

# List memories
sm list
```

## Commands

### `sm auth [key]`
Manage authentication with Supermemory API.

```bash
sm auth YOUR_API_KEY     # Save API key
sm auth --show           # Show current status
sm auth --clear          # Clear saved key
```

### `sm add [content]`
Add a new memory.

```bash
sm add "Your content here"              # Direct content
sm add --file ./notes.txt               # From file
sm add --tags work,research "Content"   # With tags
cat file.txt | sm add                   # From stdin
```

### `sm search <query>`
Search through your memories.

```bash
sm search "query"              # Basic search
sm search "query" --limit 5    # Limit results
sm search "query" --json       # JSON output
```

### `sm list`
List your memories.

```bash
sm list                       # Recent memories
sm list --limit 20            # More items
sm list --status done         # Filter by status
sm list --json                # JSON output
```

## Global Options

- `--debug` - Enable verbose error output
- `-v, --version` - Show version
- `-h, --help` - Show help

## License

MIT
