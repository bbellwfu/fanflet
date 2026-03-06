---
name: daily-worklog
description: Generate a daily work log summarizing commits, PRs, and changes. Use when the user asks to create a daily summary, work log, release notes, or wants to document what was accomplished today.
---

# Daily Work Log Generator

Creates timestamped daily summaries in the `worklog/` folder with an executive summary (user-friendly, suitable for release notes) and technical details (commits, PRs, migrations).

## File Naming Convention

```
worklog/YYMMDD {summary up to 50 chars}.md
```

Example: `worklog/260306 Impersonation Emails Analytics Sponsor Portal.md`

## Workflow

1. **Gather commits for the date**
   ```bash
   git log --since="YYYY-MM-DD 00:00:00" --until="YYYY-MM-DD+1 00:00:00" --oneline --all
   git log --since="YYYY-MM-DD 00:00:00" --until="YYYY-MM-DD+1 00:00:00" --all --pretty=format:"%h %s%n%b---"
   ```

2. **Create worklog folder** (if it doesn't exist)
   ```bash
   mkdir -p worklog
   ```

3. **Generate the log file** using the template below

4. **Commit and push**
   ```bash
   git add worklog/
   git commit -m "docs: add worklog for YYYY-MM-DD"
   git push
   ```

## Template

```markdown
# Daily Work Log — {Full Date}

## Release Summary

{One paragraph overview of what was accomplished}

### New Features

**{Feature Name}**
{2-3 sentence user-friendly description}

### Bug Fixes

- {Plain-language description of fix}

### Infrastructure

- {Infrastructure change}

---

## Technical Details

### Pull Requests Merged

| PR | Title |
|----|-------|
| #{number} | {title} |

### Commits

```
{commit hash} {commit message}
```

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `{filename}` | {brief purpose} |

### Environment Variables

**{App name} requires:**
- `{VAR_NAME}` = `{value}` — {purpose}

### Key Files Changed

**New files:**
- `{path}` — {purpose}

**Modified files:**
- `{path}` — {what changed}
```

## Guidelines

1. **Executive summary** should be written for non-technical users (customers, stakeholders)
2. **Feature descriptions** focus on user benefit, not implementation
3. **Bug fixes** describe what was broken in plain language
4. **Technical details** include everything a developer would need for reference
5. **Filename summary** should capture the 2-4 major themes of the day's work
