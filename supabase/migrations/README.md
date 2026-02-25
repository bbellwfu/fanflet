# Database Migrations

Migrations in this directory are applied by the **Database Migrations** workflow on push to `main`/`develop`, and may also be applied via Supabase MCP or local `supabase db push`. They must be **idempotent**.

## Rule: All migrations must be idempotent

Every migration must be safe to run **more than once** without failing. The same migration can be applied via CI, via MCP, or re-run after a partial failure; objects may already exist. Non-idempotent migrations cause CI failures and deployment ambiguity.

## Required patterns

| Object | Non-idempotent (avoid) | Idempotent (use) |
|--------|------------------------|------------------|
| Table | `CREATE TABLE public.foo (...)` | `CREATE TABLE IF NOT EXISTS public.foo (...)` |
| Policy | `CREATE POLICY "name" ON ...` | `DROP POLICY IF EXISTS "name" ON table;` then `CREATE POLICY "name" ...` |
| Index | `CREATE INDEX idx_name ON ...` | `CREATE INDEX IF NOT EXISTS idx_name ON ...` |
| Column | `ALTER TABLE t ADD COLUMN c ...` | `ALTER TABLE t ADD COLUMN IF NOT EXISTS c ...` |
| Constraint | `ALTER TABLE t ADD CONSTRAINT ...` | `DROP CONSTRAINT IF EXISTS name ON t;` then `ADD CONSTRAINT ...` |

## Examples

### Table and RLS

```sql
CREATE TABLE IF NOT EXISTS public.example (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL
);

ALTER TABLE public.example ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read" ON public.example;
CREATE POLICY "Allow read"
  ON public.example FOR SELECT
  TO authenticated USING (true);
```

### Index

```sql
CREATE INDEX IF NOT EXISTS idx_example_name ON public.example(name);
```

### New column on existing table

```sql
ALTER TABLE public.fanflets ADD COLUMN IF NOT EXISTS new_col text DEFAULT 'x';
```

## Checklist for new migrations

- [ ] `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
- [ ] Every `CREATE POLICY` is preceded by `DROP POLICY IF EXISTS "SameName" ON table;`
- [ ] `CREATE INDEX` / `CREATE UNIQUE INDEX` → `CREATE INDEX IF NOT EXISTS` / `CREATE UNIQUE INDEX IF NOT EXISTS`
- [ ] `ADD COLUMN` → `ADD COLUMN IF NOT EXISTS` (PostgreSQL 9.5+)
- [ ] New constraints → `DROP CONSTRAINT IF EXISTS` then add

CI runs `.github/scripts/check-migrations-idempotent.sh` when migrations change; the job fails if a migration uses non-idempotent patterns.
