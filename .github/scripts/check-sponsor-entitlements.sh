#!/usr/bin/env bash
# Enforces that sponsor-related server action files include entitlement checks.
#
# Every exported async function in sponsor-connection action files must go
# through requireFeature (or the lower-level getSpeakerEntitlements) so that
# Free-plan users cannot invoke gated actions directly.
#
# Modeled on check-mcp-client-isolation.sh.
#
# Exit 0 if all files pass; 1 and print violations otherwise.

set -e
cd "$(dirname "$0")/../.."

FAILED=0

# Sponsor-connection actions must reference requireFeature or getSpeakerEntitlements
SPONSOR_ACTIONS="apps/web/app/dashboard/sponsor-connections/actions.ts"
if [ -f "$SPONSOR_ACTIONS" ]; then
  if ! grep -qE 'requireFeature|getSpeakerEntitlements' "$SPONSOR_ACTIONS"; then
    echo "::error file=$SPONSOR_ACTIONS::Sponsor-connections actions must call requireFeature or getSpeakerEntitlements for entitlement gating."
    FAILED=1
  fi
fi

# Resource-block actions that handle sponsor_account_id must reference
# requireActiveConnection or an equivalent connection check
FANFLET_ACTIONS="apps/web/app/dashboard/fanflets/[id]/actions.ts"
if [ -f "$FANFLET_ACTIONS" ]; then
  if ! grep -qE 'requireActiveConnection|sponsor_connections' "$FANFLET_ACTIONS"; then
    echo "::error file=$FANFLET_ACTIONS::Fanflet actions handle sponsor_account_id but have no active-connection validation."
    FAILED=1
  fi
fi

# Resource library actions that handle sponsor types must include entitlement checks
RESOURCE_ACTIONS="apps/web/app/dashboard/resources/actions.ts"
if [ -f "$RESOURCE_ACTIONS" ]; then
  if ! grep -qE 'requireFeature|getSpeakerEntitlements|sponsor_visibility' "$RESOURCE_ACTIONS"; then
    echo "::error file=$RESOURCE_ACTIONS::Resource library actions handle sponsor types but have no sponsor_visibility entitlement check."
    FAILED=1
  fi
fi

if [ $FAILED -eq 1 ]; then
  echo ""
  echo "Sponsor entitlement checks missing. Every sponsor-related action file must"
  echo "validate entitlements server-side, not rely on page-level UI gating alone."
  echo "See apps/web/lib/entitlement-guards.ts for the requireFeature() utility."
  exit 1
fi
echo "Sponsor entitlement checks passed."
