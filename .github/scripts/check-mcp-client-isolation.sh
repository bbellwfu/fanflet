#!/usr/bin/env bash
# Enforces Supabase client isolation in MCP tool modules.
#
# Non-admin tool files (speaker, sponsor, audience) must NEVER reference
# serviceClient or createServiceClient — they must use ctx.supabase (RLS-scoped).
#
# This guard exists because of a vulnerability where all MCP roles received the
# service-role client, bypassing RLS. See PR #77.
#
# Exit 0 if all tool modules are clean; 1 and print violations otherwise.

set -e
cd "$(dirname "$0")/../.."

TOOLS_DIR="packages/mcp/src/tools"
FAILED=0

# Non-admin role directories that must never use the service client
for role_dir in speaker sponsor audience; do
  dir="$TOOLS_DIR/$role_dir"
  [ -d "$dir" ] || continue

  for f in "$dir"/*.ts; do
    [ -f "$f" ] || continue
    base=$(basename "$f")

    # Skip test files
    [[ "$base" == *.test.ts ]] && continue

    # Check for serviceClient usage in non-comment lines
    # Strip single-line comments (// ...) and JSDoc lines (* ...) before checking
    if grep -vE '^\s*(//|\*|/\*\*)' "$f" | grep -qE 'serviceClient|createServiceClient'; then
      echo "::error file=$f::$base: MCP $role_dir tool must NOT reference serviceClient or createServiceClient. Use ctx.supabase (RLS-scoped) instead."
      FAILED=1
    fi
  done
done

# auth.ts: ensure buildToolContext uses createUserScopedClient for non-admin
AUTH_FILE="packages/mcp/src/auth.ts"
if [ -f "$AUTH_FILE" ]; then
  if ! grep -q 'createUserScopedClient' "$AUTH_FILE"; then
    echo "::error file=$AUTH_FILE::auth.ts must use createUserScopedClient for non-admin roles. Service client bypass detected."
    FAILED=1
  fi
fi

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "MCP client isolation violated. Non-admin tools must use ctx.supabase (RLS-scoped)."
  echo "See packages/mcp/README.md for the security pattern."
  exit 1
fi
echo "MCP client isolation checks passed."
