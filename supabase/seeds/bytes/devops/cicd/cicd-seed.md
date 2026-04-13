# CI / CD — Seed Reference

## Seed Config
subdomain: cicd
domain: devops
tech_stacks: [github_actions, gitlab_ci, argocd, jenkins, circleci]
byte_type_default: article

## Topics to Seed

1. Pipeline Design — lint → test → build → deploy stages, fail fast principle
2. GitHub Actions — workflows, jobs, steps, reusable workflows, marketplace actions
3. GitLab CI — stages, artifacts, cache, runners, include templates
4. ArgoCD — GitOps model, sync policies, app of apps pattern
5. Jenkins — pipeline as code, Jenkinsfile, shared libraries, agent config
6. Secrets in CI — never hardcode, vault integration, environment secrets
7. Caching — dependency caching, Docker layer caching, cache invalidation
8. Parallelization — matrix builds, parallel jobs, test sharding
9. Build Artifacts — versioning, storing, promoting across environments
10. Environment Promotion — dev → staging → prod gates, approval workflows
11. Rollback Strategy — automated rollback on failed deploy
12. Preview Environments — ephemeral environments per PR, teardown on merge
13. Security Scanning — SAST, dependency scanning, container scanning in pipeline
14. GitOps — declarative deployments, git as single source of truth
15. Self-hosted Runners — when to use, maintenance overhead, security
16. Pipeline Performance — measuring and optimizing slow pipelines
17. Monorepo CI — affected detection, selective runs, turborepo/nx integration
18. Notifications — failure alerts, status badges, incident escalation
