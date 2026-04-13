# API Protocols — Seed Reference

## Seed Config
subdomain: api_protocols
domain: backend
tech_stacks: [rest, graphql, grpc, trpc, websockets, openapi]
byte_type_default: article

## Topics to Seed

1. REST — resource naming, HTTP verbs, status codes, idempotency
2. GraphQL — schema design, resolvers, N+1 with DataLoader, subscriptions
3. gRPC — protobuf schemas, streaming types, when to use over REST
4. tRPC — end-to-end type safety, procedure types, React Query integration
5. WebSockets — connection lifecycle, heartbeat, reconnection, rooms
6. OpenAPI — spec-first vs code-first, generating clients, documentation
7. API Versioning — URL vs header versioning, backward compatibility strategy
8. Authentication — OAuth2, JWT in headers, API keys, mTLS
9. Rate Limiting — per endpoint, per user, sliding window vs token bucket
10. Pagination — cursor vs offset, total counts, infinite scroll patterns
11. Filtering & Sorting — query param conventions, GraphQL args, protobuf fields
12. Caching — HTTP cache headers, CDN, ETag and conditional requests
13. Error Handling — consistent error format across protocols, problem+json
14. Idempotency — safe vs idempotent methods, idempotency keys for mutations
15. Security — input validation, CSRF, injection, GraphQL introspection risks
16. Testing — contract testing, mocking, integration tests per protocol
17. Performance — payload size, compression, connection reuse, multiplexing
18. Choosing a Protocol — REST vs GraphQL vs gRPC decision framework
