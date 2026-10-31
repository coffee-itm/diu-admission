#!/usr/bin/env bash
# Runs once when the codespace is created. Logins (Claude, OpenCode) stay manual.
set -euo pipefail

corepack enable
corepack prepare pnpm@11.13.1 --activate
pnpm install --frozen-lockfile

# Coding-agent CLIs: Claude Code (planning/review) and OpenCode (free DeepSeek builds).
npm install -g @anthropic-ai/claude-code opencode-ai

echo "Ready. Next: run 'claude' and /login, then 'opencode' once. See README → Codespaces."
