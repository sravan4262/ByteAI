# Containers & Kubernetes — Seed Reference

## Seed Config
subdomain: containers
domain: devops
tech_stacks: [docker, kubernetes, helm, podman, containerd]
byte_type_default: article

## Topics to Seed

1. Container Fundamentals — images vs containers, layers, copy-on-write filesystem
2. Dockerfile Best Practices — layer caching, multi-stage builds, minimal base images
3. Image Security — CVE scanning, non-root user, distroless images
4. Kubernetes Architecture — control plane vs worker nodes, etcd, API server
5. Pods & Deployments — pod lifecycle, replica sets, deployment strategies
6. Services & Networking — ClusterIP vs NodePort vs LoadBalancer, cluster DNS
7. ConfigMaps & Secrets — externalizing config, secrets encryption at rest
8. Resource Management — requests vs limits, QoS classes, avoiding OOMKill
9. Health Checks — liveness vs readiness vs startup probes
10. Helm — chart structure, values files, templating, release management
11. Storage in K8s — PersistentVolumes, storage classes, StatefulSets
12. Autoscaling — HPA, VPA, KEDA for event-driven scaling
13. RBAC & Namespaces — multi-tenancy, least privilege in cluster
14. Network Policies — pod-to-pod traffic rules, ingress controllers
15. Rolling Updates & Rollbacks — zero-downtime deployments, rollback strategy
16. Podman — rootless containers, daemonless architecture, Docker compatibility
17. Local Development — Docker Compose, kind, minikube, dev vs prod parity
18. Observability in K8s — logs, metrics, traces from pods
