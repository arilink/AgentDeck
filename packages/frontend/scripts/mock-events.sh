#!/usr/bin/env bash
# AgentDeck frontend dev — manual mock event feed for backend.
# Run while `npm run dev` is up in both backend (port 7891) and frontend (5173).
# Drives 6 agents through the 5 states so the dashboard fills up.
#
# Usage:  bash packages/frontend/scripts/mock-events.sh
#         (optionally set AGENTDECK_HTTP=http://127.0.0.1:7891)

set -euo pipefail

URL="${AGENTDECK_HTTP:-http://127.0.0.1:7891}/event"

post() {
  local body="$1"
  curl -sS -X POST "$URL" \
    -H 'Content-Type: application/json' \
    -d "$body" >/dev/null
  printf '.'
}

now() { node -e 'process.stdout.write(String(Date.now()))'; }

emit() {
  local sid="$1" type="$2" payload="$3"
  post "{\"source\":\"claude-code\",\"session_id\":\"$sid\",\"event_type\":\"$type\",\"timestamp\":$(now),\"payload\":$payload}"
}

echo "→ seeding 6 sessions on $URL"

# backend-api: starts → uses Read tool (tool_use)
emit backend-api  session_start    '{"workdir":"/repo/backend-api","model":"claude-sonnet-4.7"}'
emit backend-api  user_prompt      '{"prompt_preview":"refactor auth flow"}'
emit backend-api  tool_use_start   '{"tool_name":"Read","tool_args_preview":"auth.ts"}'

# frontend-ui: thinking
emit frontend-ui  session_start    '{"workdir":"/repo/frontend-ui","model":"claude-sonnet-4.7"}'
emit frontend-ui  user_prompt      '{"prompt_preview":"design a component tree"}'

# db-migration: tool_use bash
emit db-migration session_start    '{"workdir":"/repo/db-migration","model":"claude-sonnet-4.7"}'
emit db-migration tool_use_start   '{"tool_name":"Bash","tool_args_preview":"pytest -x"}'

# deploy-pipeline: waiting for decision
emit deploy-pipeline session_start '{"workdir":"/repo/deploy-pipeline","model":"claude-sonnet-4.7"}'
emit deploy-pipeline decision_required '{"message":"Allow this command to run?","options":[{"key":"y","label":"Yes, run it"},{"key":"n","label":"No, deny"}]}'

# docs-writer: idle (just start, no further activity → will drift to idle after timeout)
emit docs-writer  session_start    '{"workdir":"/repo/docs-writer","model":"claude-sonnet-4.7"}'

# test-runner: done
emit test-runner  session_start    '{"workdir":"/repo/test-runner","model":"claude-sonnet-4.7"}'
emit test-runner  tool_use_start   '{"tool_name":"Bash","tool_args_preview":"npm test"}'
emit test-runner  tool_use_end     '{"tool_name":"Bash","success":true}'
emit test-runner  response_complete '{}'

echo
echo "✓ 6 agents seeded. Check the dashboard at http://localhost:5173/"
