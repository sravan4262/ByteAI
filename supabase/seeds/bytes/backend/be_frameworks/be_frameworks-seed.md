# Backend Frameworks — Seed Reference

## Seed Config
subdomain: be_frameworks
domain: backend
tech_stacks: [express, fastify, hono, fastapi, django, flask, spring_boot, aspnet_core, gin, axum, rails, phoenix, nestjs, fiber]
byte_type_default: article

## Topics to Seed

1. Project Structure — MVC vs vertical slice, feature folders, layering conventions
2. Routing — defining routes, route parameters, grouping and prefixing
3. Middleware — request pipeline, global vs route-specific, ordering matters
4. Dependency Injection — built-in DI containers vs manual wiring, testability impact
5. ORM & Database — query builders vs full ORMs, N+1 prevention, migrations
6. Input Validation — schema validation at the boundary, sanitization, error responses
7. Authentication — JWT validation, session handling, auth middleware patterns
8. Error Handling — global error handlers, consistent error response format
9. Testing — unit vs integration, mocking HTTP, test database strategy
10. Security — CORS, rate limiting, security headers, injection prevention
11. Performance — connection pooling, async handlers, response compression
12. API Design — REST conventions, versioning strategy, OpenAPI generation
13. Serialization — request/response DTOs, camelCase vs snake_case, null handling
14. Configuration — env vars, settings classes, secrets management
15. Logging — structured logs, correlation IDs, request logging middleware
16. Background Jobs — task queues, scheduled jobs, worker process patterns
17. Dev Tooling — hot reload, code generation, scaffolding CLI
18. Monitoring — health check endpoints, metrics exposure, distributed tracing
19. Framework-specific — Django batteries-included, FastAPI auto-docs, NestJS decorators, Phoenix LiveView
