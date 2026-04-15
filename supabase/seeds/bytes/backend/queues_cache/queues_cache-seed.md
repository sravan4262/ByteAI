# Queues & Cache — Seed Reference

## Seed Config
subdomain: queues_cache
domain: backend
tech_stacks: [redis, kafka, rabbitmq, bullmq]
byte_type_default: article

## Topics to Seed

1. Why Queues — decoupling, async processing, load leveling
2. Why Caching — reducing DB load, latency, cache-aside pattern
3. Message Delivery Guarantees — at-least-once vs at-most-once vs exactly-once
4. Idempotency — designing consumers to safely handle duplicate messages
5. Dead Letter Queues — poison message handling, retry strategies with backoff
6. Redis as Cache — TTL, eviction policies, cache-aside vs write-through vs write-behind
7. Redis as Queue — pub/sub vs streams vs lists, persistence trade-offs
8. Kafka — partitions, consumer groups, offset management, log compaction
9. RabbitMQ — exchanges, routing keys, acknowledgements, prefetch count
10. BullMQ — job priorities, rate limiting, repeatable jobs, job dependencies
11. Celery — task routing, beat scheduler, result backends, task chaining
12. NATS — JetStream, subject-based routing, at-least-once delivery
13. Backpressure — what happens when consumers lag, preventing memory blowout
14. Ordering — when order matters, partitioning strategy for ordered processing
15. Scaling — horizontal consumer scaling, partition count, rebalancing
16. Monitoring — queue depth alerts, consumer lag, dead letter queue alerts
17. Testing — testing consumers in isolation, mocking brokers in tests
18. Security — broker authentication, TLS, network isolation
19. When to Use What — Redis vs Kafka vs RabbitMQ decision framework
