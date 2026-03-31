#!/bin/bash
# Pre-push verification: build the app and verify it renders correctly
# Runs before any git push to catch broken builds before deploy

set -e

TOOL_INPUT=$(cat)
COMMAND=$(echo "$TOOL_INPUT" | jq -r '.tool_input.command // ""')

# Only run for git push commands
if ! echo "$COMMAND" | grep -qE '^git push'; then
  exit 0
fi

PROJECT_DIR="/home/user/loose-threads"
cd "$PROJECT_DIR"

# Step 1: Build
echo "Building app..." >&2
if ! npm run build --silent 2>&1; then
  echo '{"decision":"block","reason":"Build failed. Fix build errors before pushing."}'
  exit 0
fi

# Step 2: Start preview server
npx vite preview --port 4174 --strictPort &>/dev/null &
PREVIEW_PID=$!

# Give server time to start
sleep 2

# Step 3: Verify the page loads and contains expected content
PASS=true
ERRORS=""

# Check that index.html is served
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:4174/loose-threads/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
  PASS=false
  ERRORS="Page returned HTTP $HTTP_CODE instead of 200."
fi

if [ "$PASS" = true ]; then
  PAGE=$(curl -s http://localhost:4174/loose-threads/ 2>/dev/null)

  # Check for canvas element in the JS bundle (rendered by React)
  if ! echo "$PAGE" | grep -q '<div id="root"'; then
    PASS=false
    ERRORS="Missing root div in HTML."
  fi

  # Check that JS bundle is referenced
  if ! echo "$PAGE" | grep -q '\.js"'; then
    PASS=false
    ERRORS="${ERRORS} No JS bundle reference found in HTML."
  fi

  # Verify the JS bundle itself loads
  JS_PATH=$(echo "$PAGE" | grep -oP 'src="([^"]+\.js)"' | head -1 | sed 's/src="//;s/"//')
  if [ -n "$JS_PATH" ]; then
    JS_CODE=$(curl -s "http://localhost:4174${JS_PATH}" 2>/dev/null)

    # Check for key app signatures in the bundle
    if ! echo "$JS_CODE" | grep -q 'canvas'; then
      PASS=false
      ERRORS="${ERRORS} JS bundle missing canvas references."
    fi
    if ! echo "$JS_CODE" | grep -q 'Loose Threads\|loose.thread\|LOOSE'; then
      PASS=false
      ERRORS="${ERRORS} JS bundle missing app name references."
    fi
    if ! echo "$JS_CODE" | grep -q 'simulateThread\|verlet\|DAMPING\|prevX'; then
      PASS=false
      ERRORS="${ERRORS} JS bundle missing physics simulation code."
    fi
    if ! echo "$JS_CODE" | grep -q 'drawThread\|bezier\|quadraticCurve\|strokeStyle'; then
      PASS=false
      ERRORS="${ERRORS} JS bundle missing thread rendering code."
    fi
  else
    PASS=false
    ERRORS="${ERRORS} Could not find JS bundle path."
  fi
fi

# Step 4: Kill preview server
kill $PREVIEW_PID 2>/dev/null
wait $PREVIEW_PID 2>/dev/null || true

# Step 5: Report result
if [ "$PASS" = true ]; then
  echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","additionalContext":"Pre-push verification passed: build succeeded, page loads, JS bundle contains canvas rendering, physics simulation, and thread drawing code."}}'
else
  echo "{\"decision\":\"block\",\"reason\":\"Pre-push verification failed: ${ERRORS} Fix these issues before pushing.\"}"
fi
