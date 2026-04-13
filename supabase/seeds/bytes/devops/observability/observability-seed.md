# Observability — Seed Reference

## Seed Config
subdomain: observability
domain: devops
tech_stacks: [prometheus, grafana, datadog, sentry, opentelemetry, new_relic]
byte_type_default: article

## Topics to Seed

1. Three Pillars — logs, metrics, traces and why you need all three
2. Prometheus — metrics model, PromQL, scraping, recording rules, alerting rules
3. Grafana — dashboard design, data sources, alerting, variable templating
4. OpenTelemetry — vendor-neutral instrumentation, SDK setup, collector pipeline
5. Distributed Tracing — spans, trace context propagation, sampling strategies
6. Sentry — error capture, source maps, performance monitoring, session replay
7. Datadog — APM, log management, synthetics, unified platform trade-offs
8. Alerting — alert fatigue, actionable alerts, runbook links, severity levels
9. SLIs, SLOs, SLAs — defining what good looks like, error budgets
10. Log Management — structured logging, log levels, correlation IDs, retention
11. Metrics Design — naming conventions, cardinality explosion, counter vs gauge vs histogram
12. Dashboards — RED method (Rate, Errors, Duration), USE method for resources
13. On-call — incident response, postmortems, escalation policies
14. Cost of Observability — high cardinality metrics are expensive, sampling trade-offs
15. Synthetic Monitoring — uptime checks, multi-step API tests, SLA alerting
16. Profiling — continuous profiling, flame graphs, finding hotspots in production
17. Health Checks — liveness, readiness, dependency health, uptime monitoring
18. When to Use What — Prometheus+Grafana vs Datadog vs New Relic decision framework
