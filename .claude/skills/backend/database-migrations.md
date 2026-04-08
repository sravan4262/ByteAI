---
name: database-migrations
description: Database migration best practices for ByteAI — EF Core (PostgreSQL) for User/Search/Notification services, raw SQL patterns for zero-downtime changes, and pgvector schema management.
origin: ECC (adapted for ByteAI — EF Core + PostgreSQL)
---

# Database Migration Patterns

Safe, reversible database schema changes for production systems.

## When to Activate

- Creating or altering database tables
- Adding/removing columns or indexes
- Running data migrations (backfill, transform)
- Planning zero-downtime schema changes
- Setting up migration tooling for a new service

## Core Principles

1. **Every change is a migration** — never alter production databases manually
2. **Migrations are forward-only in production** — rollbacks use new forward migrations
3. **Schema and data migrations are separate** — never mix DDL and DML in one migration
4. **Test migrations against production-sized data** — a migration that works on 100 rows may lock on 10M
5. **Migrations are immutable once deployed** — never edit a migration that has run in production

## Migration Safety Checklist

Before applying any migration:

- [ ] Migration has both Up and Down, or is explicitly marked irreversible
- [ ] No full table locks on large tables (use concurrent operations)
- [ ] New columns have defaults or are nullable (never add NOT NULL without default)
- [ ] Indexes created concurrently (not inline with ALTER TABLE on existing data)
- [ ] Data backfill is a separate migration from schema change
- [ ] Tested against a copy of production data
- [ ] Rollback plan documented

---

## EF Core (ByteAI — User / Search / Notification services)

### Workflow

```bash
# Set the working service
cd src/Services/ByteAI.UserService

# Create migration from model changes
dotnet ef migrations add AddUserAvatarUrl \
  --project ByteAI.UserService.csproj \
  --startup-project ByteAI.UserService.csproj

# Review generated migration before applying
# Always check Up() and Down() methods

# Apply pending migrations in development
dotnet ef database update

# Apply in production (CI/CD — no interactive prompts)
dotnet ef database update --connection "$PROD_DB_CONNECTION_STRING"

# List applied migrations
dotnet ef migrations list

# Rollback last migration (dev only)
dotnet ef database update PreviousMigrationName
```

### Entity Example

```csharp
// Domain/Entities/User.cs
public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }    // nullable = safe to add
    public bool IsActive { get; set; } = true;
    public int Level { get; set; } = 1;
    public int Xp { get; set; } = 0;
    public string[] TechStack { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

// Infrastructure/Persistence/UserDbContext.cs
public class UserDbContext : DbContext
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Username).HasMaxLength(50).IsRequired();
            entity.Property(u => u.TechStack).HasColumnType("text[]");
            entity.HasIndex(u => u.Username).IsUnique();
        });
    }
}
```

### Generated Migration Example

```csharp
// Migrations/20240115000001_AddUserAvatarUrl.cs
public partial class AddUserAvatarUrl : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // GOOD: nullable column — no table lock, no rewrite
        migrationBuilder.AddColumn<string>(
            name: "avatar_url",
            table: "users",
            type: "text",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "avatar_url",
            table: "users");
    }
}
```

### Custom SQL in EF Core Migration (for concurrent index)

EF Core cannot generate `CONCURRENTLY` — use raw SQL for these:

```csharp
public partial class AddEmailIndexConcurrently : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // GOOD: non-blocking concurrent index on existing data
        migrationBuilder.Sql(
            "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email);",
            suppressTransaction: true // CONCURRENTLY cannot run inside a transaction
        );
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("DROP INDEX CONCURRENTLY IF EXISTS idx_users_email;",
            suppressTransaction: true);
    }
}
```

### Data Migration (Backfill — separate migration)

```csharp
// ALWAYS separate schema change (migration N) from data backfill (migration N+1)
public partial class BackfillNormalizedUsernames : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Batch update — avoids locking all rows at once
        migrationBuilder.Sql("""
            DO $$
            DECLARE batch_size INT := 5000; rows_updated INT;
            BEGIN
              LOOP
                UPDATE users
                SET normalized_username = LOWER(username)
                WHERE id IN (
                  SELECT id FROM users
                  WHERE normalized_username IS NULL
                  LIMIT batch_size
                  FOR UPDATE SKIP LOCKED
                );
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                EXIT WHEN rows_updated = 0;
                COMMIT;
              END LOOP;
            END $$;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Data migration — no meaningful rollback
    }
}
```

---

## PostgreSQL Patterns (applies to all services)

### Adding a Column Safely

```sql
-- GOOD: Nullable column, no lock
ALTER TABLE users ADD COLUMN avatar_url TEXT;

-- GOOD: Column with default (Postgres 11+ is instant, no rewrite)
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- BAD: NOT NULL without default on existing table (full table rewrite + lock)
ALTER TABLE users ADD COLUMN role TEXT NOT NULL;
```

### Adding an Index Without Downtime

```sql
-- BAD: Blocks writes on large tables
CREATE INDEX idx_users_email ON users (email);

-- GOOD: Non-blocking, allows concurrent writes
-- Cannot run inside a transaction block
CREATE INDEX CONCURRENTLY idx_users_email ON users (email);
```

### pgvector Index (Search Service)

```sql
-- Create vector column for embeddings (384-dim from all-MiniLM-L6-v2)
ALTER TABLE bytes_search_index ADD COLUMN embedding vector(384);

-- HNSW index for fast approximate nearest neighbor search
-- Use CONCURRENTLY on existing data
CREATE INDEX CONCURRENTLY idx_bytes_embedding_hnsw
  ON bytes_search_index
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Renaming a Column (Zero-Downtime — Expand-Contract)

```sql
-- Step 1: Add new column (migration 001)
ALTER TABLE users ADD COLUMN display_name TEXT;

-- Step 2: Backfill (migration 002 — data migration)
UPDATE users SET display_name = username WHERE display_name IS NULL;

-- Step 3: Update application to read/write BOTH columns
-- Deploy new application version

-- Step 4: Drop old column once all services are updated (migration 003)
ALTER TABLE users DROP COLUMN username;
```

### Large Data Migrations

```sql
-- BAD: Updates all rows in one transaction (locks table)
UPDATE users SET normalized_email = LOWER(email);

-- GOOD: Batch update with progress
DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
BEGIN
  LOOP
    UPDATE users
    SET normalized_email = LOWER(email)
    WHERE id IN (
      SELECT id FROM users
      WHERE normalized_email IS NULL
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED
    );
    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RAISE NOTICE 'Updated % rows', rows_updated;
    EXIT WHEN rows_updated = 0;
    COMMIT;
  END LOOP;
END $$;
```

---

## Zero-Downtime Migration Strategy (Expand-Contract)

For critical production changes:

```
Phase 1: EXPAND
  - Add new column/table (nullable or with default)
  - Deploy: app writes to BOTH old and new
  - Backfill existing data

Phase 2: MIGRATE
  - Deploy: app reads from NEW, writes to BOTH
  - Verify data consistency

Phase 3: CONTRACT
  - Deploy: app only uses NEW
  - Drop old column/table in separate migration
```

### Timeline Example

```
Day 1: Migration adds new_status column (nullable)
Day 1: Deploy app v2 — writes to both status and new_status
Day 2: Run backfill migration for existing rows
Day 3: Deploy app v3 — reads from new_status only
Day 7: Migration drops old status column
```

---

## Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|---|---|---|
| Manual SQL in production | No audit trail, unrepeatable | Always use migration files |
| Editing deployed migrations | Causes drift between environments | Create new migration instead |
| NOT NULL without default | Locks table, rewrites all rows | Add nullable, backfill, then add constraint |
| Inline index on large table | Blocks writes during build | CREATE INDEX CONCURRENTLY + suppressTransaction: true |
| Schema + data in one migration | Hard to rollback, long transactions | Separate migrations |
| Dropping column before removing code | Application errors on missing column | Remove code first, drop column next deploy |
