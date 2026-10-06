#!/usr/bin/env bash
set -euo pipefail

docs_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
docs_port="${PORT:-3003}"
mintlify_args=(dev --no-open --port "$docs_port")

printf -v docs_dir_escaped "%q" "$docs_dir"
printf -v mintlify_args_escaped " %q" "${mintlify_args[@]}"

# Run outside the monorepo so npx does not pick up Mintlify's Bun-installed
# dependency tree, which is incompatible with its Node-based schema compiler.
cd /tmp
exec npx --yes \
  --package node@22 \
  --package mintlify@latest \
  --call "cd $docs_dir_escaped && mintlify$mintlify_args_escaped"
