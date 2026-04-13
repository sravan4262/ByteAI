# Databases — Seed Reference

## Seed Config
subdomain: data_databases
domain: data
tech_stacks: [postgresql_de, cassandra, dynamodb, elasticsearch, clickhouse, timescaledb]
byte_type_default: article

## Topics to Seed

1. Database Selection — OLTP vs OLAP, relational vs document vs wide-column vs search
2. PostgreSQL — ACID transactions, indexes, JSONB, partitioning, extensions (pgvector)
3. Cassandra — partition key design, wide rows, eventual consistency, data modeling for queries
4. DynamoDB — single table design, partition key + sort key, GSI/LSI, capacity modes
5. Elasticsearch — inverted index, mapping, analyzers, query DSL, aggregations
6. ClickHouse — columnar storage, materialized views, MergeTree engine, OLAP queries
7. TimescaleDB — hypertables, continuous aggregates, compression, time-series queries
8. Indexing Strategy — B-tree vs hash vs GIN vs BRIN, covering indexes, partial indexes
9. Query Optimization — EXPLAIN ANALYZE, slow query log, N+1, query planning
10. Data Modeling — normalization vs denormalization, schema design for access patterns
11. Transactions & ACID — isolation levels, optimistic vs pessimistic locking
12. Replication — leader/follower, multi-leader, leaderless, consistency trade-offs
13. Sharding — horizontal partitioning, shard key selection, hot spots
14. Backup & Recovery — point-in-time recovery, backup strategies, RTO vs RPO
15. Connection Pooling — PgBouncer, connection limits, pool sizing
16. Security — encryption at rest/transit, row-level security, least privilege
17. Migrations — zero-downtime migrations, backward compatibility, tooling
18. Monitoring — slow queries, connection counts, replication lag, storage growth
