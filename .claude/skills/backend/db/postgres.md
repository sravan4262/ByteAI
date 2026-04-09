---
name: postgres-byteai
description: Comprehensive PostgreSQL + pgvector guide for ByteAI — table-first schema design, EF Core Fluent configuration, indexing, RLS, pgvector HNSW, hybrid search, and query patterns.
---

# PostgreSQL & Database Patterns — ByteAI

## ByteAI Database Rules (Non-Negotiable)

ByteAI is **table-first**. Tables are defined as SQL files in `supabase/tables/`. EF Core reads — it never creates or alters tables.

- **NEVER** run `dotnet ef migrations add` or `dotnet ef database update`
- **NEVER** call `Database.MigrateAsync()` or `Database.EnsureCreatedAsync()` in `Program.cs`
- Schema changes → new `supabase/tables/<table>.sql` → `supabase db push`
- `AppDbContext` only wires `IEntityTypeConfiguration<T>` via `ApplyConfigurationsFromAssembly()`

---

## Table SQL Convention (`supabase/tables/<table>.sql`)

Every table file must follow this template:

```sql
-- supabase/tables/bytes.sql
CREATE TABLE IF NOT EXISTS bytes (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           text NOT NULL CHECK (char_length(title) <= 200),
    body            text NOT NULL CHECK (char_length(body) <= 2000),
    code_snippet    text,
    language        text,
    tags            text[] NOT NULL DEFAULT '{}',
    like_count      integer NOT NULL DEFAULT 0,
    comment_count   integer NOT NULL DEFAULT 0,
    bookmark_count  integer NOT NULL DEFAULT 0,
    view_count      integer NOT NULL DEFAULT 0,
    embedding       vector(384),
    search_vector   tsvector GENERATED ALWAYS AS (
                        to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
                    ) STORED,
    type            text NOT NULL DEFAULT 'byte',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS ix_bytes_author_id     ON bytes (author_id);
CREATE INDEX IF NOT EXISTS ix_bytes_search_vector ON bytes USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS ix_bytes_embedding     ON bytes USING hnsw (embedding vector_cosine_ops);

COMMENT ON TABLE bytes IS 'Core content unit — a short tech post';
```

**Mandatory rules:**
- `uuid` primary keys with `gen_random_uuid()` default
- `timestamptz` (never `timestamp`) for all datetime columns
- `created_at` and `updated_at` with `now()` defaults
- GIN index on `tsvector` columns (full-text search)
- HNSW index on `vector` columns (pgvector cosine search)
- `COMMENT ON TABLE` for documentation

---

## EF Core Fluent Configuration

Each entity gets a dedicated `IEntityTypeConfiguration<T>` in `ByteAI.Core/Entities/Configurations/`. Config must **exactly match** the SQL schema — column names, types, constraints.

```csharp
// ByteAI.Core/Entities/Configurations/ByteConfiguration.cs
public sealed class ByteConfiguration : IEntityTypeConfiguration<Byte>
{
    public void Configure(EntityTypeBuilder<Byte> builder)
    {
        builder.ToTable("bytes");

        builder.HasKey(b => b.Id);
        builder.Property(b => b.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
        builder.Property(b => b.AuthorId).HasColumnName("author_id").IsRequired();
        builder.Property(b => b.Title).HasColumnName("title").HasMaxLength(200).IsRequired();
        builder.Property(b => b.Body).HasColumnName("body").IsRequired();
        builder.Property(b => b.Tags).HasColumnName("tags").HasColumnType("text[]");
        builder.Property(b => b.Embedding).HasColumnName("embedding").HasColumnType("vector(384)");
        builder.Property(b => b.SearchVector).HasColumnName("search_vector").HasColumnType("tsvector");
        builder.Property(b => b.CreatedAt).HasColumnName("created_at").HasDefaultValueSql("now()");
        builder.Property(b => b.UpdatedAt).HasColumnName("updated_at").HasDefaultValueSql("now()");

        builder.HasIndex(b => b.AuthorId).HasDatabaseName("ix_bytes_author_id");
        builder.HasIndex(b => b.SearchVector)
            .HasMethod("GIN")
            .HasDatabaseName("ix_bytes_search_vector");
    }
}
```

```csharp
// AppDbContext — only wires configurations, nothing else
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Byte> Bytes => Set<Byte>();
    // ... all entity sets

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
        modelBuilder.HasPostgresExtension("vector");
    }
}
```

**For vector columns on User entity:**
```csharp
builder.Property(u => u.InterestEmbedding)
    .HasColumnName("interest_embedding")
    .HasColumnType("vector(384)");
```

---

## pgvector Patterns

### Registration (Program.cs)
```csharp
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(
        builder.Configuration.GetConnectionString("Postgres"),
        npgsql => npgsql.UseVector()));
```

### Semantic Search (Cosine Distance)
```csharp
// Order by cosine similarity to a query embedding
var results = await _db.Bytes
    .Where(b => b.Embedding != null)
    .OrderBy(b => b.Embedding!.CosineDistance(queryEmbedding))
    .Take(limit)
    .AsNoTracking()
    .ToListAsync(ct);
```

### Personalized Feed (User Interest Embedding)
```csharp
// If user has interest embedding, use it; else fall back to recency
IQueryable<Byte> query = user.InterestEmbedding != null
    ? _db.Bytes
        .Where(b => b.Embedding != null)
        .OrderBy(b => b.Embedding!.CosineDistance(user.InterestEmbedding))
    : _db.Bytes.OrderByDescending(b => b.CreatedAt);
```

### Hybrid Search (Full-Text + Vector + RRF)
```csharp
// 1. Full-text results
var ftResults = await _db.Bytes
    .Where(b => EF.Functions.ToTsVector("english", b.Title + " " + b.Body)
        .Matches(EF.Functions.PhraseToTsQuery("english", query)))
    .AsNoTracking()
    .ToListAsync(ct);

// 2. Vector results
var vectorResults = await _db.Bytes
    .Where(b => b.Embedding != null)
    .OrderBy(b => b.Embedding!.CosineDistance(queryEmbedding))
    .Take(limit * 2)
    .AsNoTracking()
    .ToListAsync(ct);

// 3. Reciprocal Rank Fusion (k=60)
var scores = new Dictionary<Guid, double>();
foreach (var (b, rank) in ftResults.Select((b, i) => (b, i)))
    scores[b.Id] = scores.GetValueOrDefault(b.Id) + 1.0 / (60 + rank + 1);
foreach (var (b, rank) in vectorResults.Select((b, i) => (b, i)))
    scores[b.Id] = scores.GetValueOrDefault(b.Id) + 1.0 / (60 + rank + 1);

var merged = scores
    .OrderByDescending(kv => kv.Value)
    .Take(limit)
    .Select(kv => allBytes.First(b => b.Id == kv.Key))
    .ToList();
```

---

## Indexing Reference

| Query Pattern | Index Type | SQL |
|---|---|---|
| `WHERE col = value` | B-tree | `CREATE INDEX ON t (col)` |
| `WHERE a = x AND b > y` | Composite | `CREATE INDEX ON t (a, b)` |
| `WHERE tsv @@ query` | GIN | `CREATE INDEX ON t USING GIN (col)` |
| `WHERE jsonb @> '{}'` | GIN | `CREATE INDEX ON t USING GIN (col)` |
| Vector cosine search | HNSW | `CREATE INDEX ON t USING hnsw (col vector_cosine_ops)` |
| Time-series ranges | BRIN | `CREATE INDEX ON t USING brin (col)` |

**Rules:**
- Equality columns before range columns in composite indexes
- Use `INCLUDE` for covering indexes to avoid heap fetches
- Use partial indexes for filtered subsets (e.g., `WHERE deleted_at IS NULL`)

```sql
-- Covering index (avoids heap lookup)
CREATE INDEX ON users (email) INCLUDE (display_name, avatar_url);

-- Partial index (smaller, faster for active users)
CREATE INDEX ON bytes (author_id) WHERE archived = false;

-- Composite: equality first, then range
CREATE INDEX ON follows (follower_id, created_at);
```

---

## Data Type Rules

| Use Case | Correct Type | Avoid |
|---|---|---|
| Primary keys | `uuid` | `bigint`, `serial` |
| Strings (any length) | `text` | `varchar(255)` |
| Timestamps | `timestamptz` | `timestamp` |
| Embeddings | `vector(384)` | `float[]`, `jsonb` |
| Flags | `boolean` | `int`, `varchar` |
| Counters | `integer` | `bigint` (overkill for MVP) |
| JSON payload | `jsonb` | `json`, `text` |

---

## Common Query Patterns

### Cursor Pagination (O(1) vs OFFSET O(n))
```csharp
// EF Core cursor pagination — always use this for feeds
var bytes = await _db.Bytes
    .Where(b => b.CreatedAt < cursor)
    .OrderByDescending(b => b.CreatedAt)
    .Take(pageSize)
    .AsNoTracking()
    .ToListAsync(ct);
```

```sql
-- SQL equivalent
SELECT * FROM bytes
WHERE created_at < $cursor
ORDER BY created_at DESC
LIMIT 20;
```

### UPSERT
```sql
INSERT INTO user_follows (follower_id, following_id)
VALUES ($1, $2)
ON CONFLICT (follower_id, following_id) DO NOTHING;
```

### Queue / Skip-Locked
```sql
UPDATE notifications SET read = true
WHERE id = (
  SELECT id FROM notifications
  WHERE user_id = $userId AND read = false
  ORDER BY created_at LIMIT 1
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```

---

## Row Level Security (RLS)

ByteAI uses Supabase RLS as a defense-in-depth layer. The API validates ownership in code first; RLS is a secondary safeguard.

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see and update their own profile
CREATE POLICY "users_self_select" ON users FOR SELECT
    USING (id = current_setting('app.current_user_id')::uuid);

CREATE POLICY "users_self_update" ON users FOR UPDATE
    USING (id = current_setting('app.current_user_id')::uuid);

-- Bytes are readable by all, but only writable by the author
CREATE POLICY "bytes_select_all" ON bytes FOR SELECT USING (true);
CREATE POLICY "bytes_author_write" ON bytes FOR ALL
    USING (author_id = current_setting('app.current_user_id')::uuid);
```

**RLS policy optimization:** Always wrap `auth.uid()` in a `SELECT` to avoid per-row re-evaluation:
```sql
-- Fast
CREATE POLICY policy ON orders USING ((SELECT auth.uid()) = user_id);
-- Slow (re-evaluated for every row)
CREATE POLICY policy ON orders USING (auth.uid() = user_id);
```

---

## Anti-Pattern Detection

```sql
-- Find unindexed foreign keys
SELECT conrelid::regclass, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Find slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;

-- Check table bloat
SELECT relname, n_dead_tup, last_vacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

---

## Configuration Baseline

```sql
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET idle_in_transaction_session_timeout = '30s';
ALTER SYSTEM SET statement_timeout = '30s';

CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS vector;

REVOKE ALL ON SCHEMA public FROM public;

SELECT pg_reload_conf();
```

---

## Supabase Local Dev

```bash
# Start local Supabase stack
supabase start

# Push schema changes to local
supabase db push

# Reset local DB to clean state
supabase db reset

# Generate TypeScript types from schema
supabase gen types typescript --local > UI/lib/types/database.types.ts
```
