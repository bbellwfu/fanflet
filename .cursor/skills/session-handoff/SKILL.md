# Session Handoff

Maintain a running session handoff so you can restore full context in under 2 minutes from any device. Use when starting or ending a work session, or when asked to “save context”, “wrap up”, “end session”, or “where did I leave off.”

## Overview

Two files, always at repo root:

- `HANDOFF.md` — current session state. Always overwritten at session end. Always read at session start.
- `FANFLET_PARKING.md` — ideas and future features not for this session. Append-only, never deleted.

-----

## Two Modes

**END mode** — triggered at end of session, or on: “wrap up”, “save context”, “end session”, “handoff”

**START mode** — triggered at start of session, or on: “where did I leave off”, “get me up to speed”, “restore context”, “start session”

-----

## Workflow — END Mode

1. Check current state:

```bash
git branch --show-current
git log --oneline -5
git status
```

1. Review conversation context and open files to understand:
- What was actively being worked on
- What was left mid-thought or mid-build
- Any ideas mentioned that belong in the parking lot
1. Overwrite `HANDOFF.md` using template below
1. Append any new parking lot items to `FANFLET_PARKING.md` — never remove existing items
1. Commit and push:

```bash
git add HANDOFF.md FANFLET_PARKING.md
git commit -m "docs: session handoff $(date '+%Y-%m-%d %H:%M')"
git push
```

-----

## Workflow — START Mode

1. Read `HANDOFF.md`
1. Deliver a 2-3 sentence plain-language briefing covering: where you stopped, what to do first
1. Ask: *“Ready to pick up where you left off, or do you want to adjust direction first?”*
1. Do not modify any files in START mode

-----

## HANDOFF.md Template

```markdown
# Session Handoff
{YYYY-MM-DD HH:MM} | {branch}

## Where I Stopped
{1-2 sentences. Specific enough to orient immediately.}

## Do This First
{One action. Specific enough to start in under 60 seconds.}

## In-Flight Decisions
- {Unresolved question or tradeoff}
- {Add more as needed}

## Known Issues
{Or "none"}
```

-----

## FANFLET_PARKING.md Append Format

When adding new items, append to the bottom of the file under today’s date:

```markdown
## {YYYY-MM-DD}
- {idea or future feature}
- {add more as needed}
```

-----

## Guidelines

- `HANDOFF.md` should fit on a phone screen — keep it short
- “Where I Stopped” is specific, not vague — name the file, feature, or problem
- “Do This First” is singular — one thing only
- START mode is read-only — never modify files, only brief the user
- Parking lot accumulates across all sessions — only the user decides when to prune it
- If nothing new belongs in the parking lot, skip the append step silently