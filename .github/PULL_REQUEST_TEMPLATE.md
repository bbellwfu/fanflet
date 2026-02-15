## What does this PR do?

<!-- Brief description of the change and why it's needed -->

## Type of change

- [ ] Feature (new functionality)
- [ ] Fix (bug fix)
- [ ] Refactor (code improvement, no behavior change)
- [ ] Chore (dependencies, config, CI)
- [ ] Docs (documentation only)

## Ship Checklist

### Code Quality
- [ ] TypeScript strict — no `any`, proper error types
- [ ] Zod validation on any new API inputs
- [ ] Loading and error states for async operations
- [ ] Destructive actions have confirmation dialogs

### Security
- [ ] RLS policies created/updated for any new or modified tables (SELECT, INSERT, UPDATE, DELETE)
- [ ] No service role key or secrets exposed in client code
- [ ] Error responses are generic (no stack traces or SQL errors leaked)
- [ ] New environment variables documented in `.env.example`

### Architecture
- [ ] Server Components used by default; `"use client"` only where necessary
- [ ] Supabase SSR patterns followed (server client vs. browser client)
- [ ] No hardcoded URLs — uses centralized config

### Testing
- [ ] Tested locally (happy path + edge cases)
- [ ] Verified on Vercel preview deployment (if applicable)

## Screenshots (if UI change)

<!-- Paste screenshots or delete this section -->
