#!/usr/bin/env bash
# Enforces idempotent migration patterns. See supabase/migrations/README.md.
# Exit 0 if all migrations are idempotent; 1 and print violations otherwise.

set -e
cd "$(dirname "$0")/../.."
MIGRATIONS_DIR="supabase/migrations"
FAILED=0

for f in "$MIGRATIONS_DIR"/*.sql; do
  [ -f "$f" ] || continue
  base=$(basename "$f")

  # Skip empty or comment-only lines; check CREATE statements
  while IFS= read -r line; do
    # Strip leading whitespace and skip comments
    stripped=$(echo "$line" | sed 's/^[[:space:]]*//')
    [ -z "$stripped" ] && continue
    [ "${stripped#--}" != "$stripped" ] && continue

    # CREATE TABLE without IF NOT EXISTS
    if echo "$line" | grep -qE 'CREATE[ \t]+TABLE[ \t]+'; then
      if ! echo "$line" | grep -q 'IF NOT EXISTS'; then
        echo "::error file=$f::$base: Use CREATE TABLE IF NOT EXISTS (idempotent migration required)"
        FAILED=1
      fi
    fi

    # CREATE INDEX / CREATE UNIQUE INDEX without IF NOT EXISTS
    if echo "$line" | grep -qE 'CREATE[ \t]+(UNIQUE[ \t]+)?INDEX[ \t]+'; then
      if ! echo "$line" | grep -q 'IF NOT EXISTS'; then
        echo "::error file=$f::$base: Use CREATE INDEX IF NOT EXISTS (idempotent migration required)"
        FAILED=1
      fi
    fi

  done < "$f"

  # CREATE POLICY: file that has CREATE POLICY must contain DROP POLICY IF EXISTS
  if grep -qE 'CREATE[ \t]+POLICY[ \t]+' "$f" && ! grep -q 'DROP POLICY IF EXISTS' "$f"; then
    echo "::error file=$f::$base: File with CREATE POLICY must include DROP POLICY IF EXISTS (idempotent migration required)"
    FAILED=1
  fi
done

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "See supabase/migrations/README.md for idempotent migration patterns."
  exit 1
fi
echo "All migrations use idempotent patterns."
