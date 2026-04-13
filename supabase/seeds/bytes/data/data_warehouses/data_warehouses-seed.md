# Data Warehouses — Seed Reference

## Seed Config
subdomain: data_warehouses
domain: data
tech_stacks: [snowflake, bigquery, redshift, databricks]
byte_type_default: article

## Topics to Seed

1. Warehouse vs Database — OLAP vs OLTP, columnar vs row storage, analytical workloads
2. Snowflake — virtual warehouses, zero-copy cloning, time travel, data sharing
3. BigQuery — serverless model, slot reservations, partitioning, clustering, cost control
4. Redshift — distribution keys, sort keys, VACUUM, ANALYZE, RA3 nodes
5. Databricks — Delta Lake, Unity Catalog, notebooks, Spark integration, Photon engine
6. Data Modeling — star schema, snowflake schema, wide tables, dimensional modeling
7. ELT vs ETL — why modern warehouses favor ELT, dbt as the transformation layer
8. Partitioning & Clustering — partition pruning, query performance, partition strategy
9. Cost Management — query cost estimation, slot/credit consumption, materialized views
10. Data Quality — null handling, deduplication, constraint enforcement in warehouses
11. Access Control — role-based access, column-level security, row-level policies
12. Performance Optimization — result caching, materialized views, query optimization
13. Data Sharing — cross-account sharing, data marketplace, secure views
14. Incremental Loading — append vs upsert strategies, CDC, merge patterns
15. Semi-structured Data — JSON/Parquet handling, schema evolution, nested types
16. Monitoring — query history, cost dashboards, slow query alerts
17. Integration — connecting to dbt, Airflow, BI tools, reverse ETL
18. When to Use What — Snowflake vs BigQuery vs Redshift vs Databricks decision framework
