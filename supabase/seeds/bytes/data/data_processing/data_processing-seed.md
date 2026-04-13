# Data Processing — Seed Reference

## Seed Config
subdomain: data_processing
domain: data
tech_stacks: [spark, flink, dbt, airflow, prefect, dagster]
byte_type_default: article

## Topics to Seed

1. Batch vs Streaming — when to process in batches vs real-time, trade-offs
2. Apache Spark — RDDs vs DataFrames, transformations vs actions, lazy evaluation
3. Apache Flink — event time vs processing time, watermarks, stateful streaming
4. dbt — model types (table/view/incremental/snapshot), tests, macros, lineage
5. Apache Airflow — DAGs, operators, sensors, XCom, scheduling
6. Prefect — flows, tasks, deployments, work pools, modern Python-native orchestration
7. Dagster — assets, jobs, schedules, sensors, Software-Defined Assets
8. Pipeline Design — idempotency, retry logic, backfill strategy
9. Data Partitioning — processing in chunks, partition pruning, parallelism
10. Incremental Processing — processing only new/changed data, watermarking
11. Error Handling — dead letter queues, partial failure handling, alerting
12. Testing Pipelines — unit testing transforms, integration testing end-to-end
13. Orchestration Patterns — fan-out/fan-in, dynamic task mapping, conditional branches
14. Performance — Spark shuffle optimization, broadcast joins, resource sizing
15. Data Lineage — tracking data origins, impact analysis, documentation
16. Monitoring — pipeline SLAs, data freshness alerts, observability
17. Infrastructure — cluster sizing, spot/preemptible instances, cost optimization
18. Choosing an Orchestrator — Airflow vs Prefect vs Dagster decision framework
