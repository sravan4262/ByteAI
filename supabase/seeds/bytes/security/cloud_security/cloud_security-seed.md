# Cloud Security — Seed Reference

## Seed Config
subdomain: cloud_security
domain: security
tech_stacks: [iam, zero_trust, vault, waf]
byte_type_default: article

## Topics to Seed

1. IAM Fundamentals — identity vs principal, authentication vs authorization
2. Least Privilege — start with no permissions, grant what's needed, regular access review
3. IAM Policies — allow vs deny, condition keys, policy evaluation logic
4. Service Accounts & Roles — machine identities, workload identity federation, no long-lived keys
5. Zero Trust Architecture — never trust, always verify, microsegmentation
6. Network Security — security groups, NACLs, private subnets, bastion hosts
7. HashiCorp Vault — secret engines, dynamic secrets, lease TTL, auth methods
8. WAF — rule sets, rate limiting, bot protection, tuning false positives
9. Secrets Rotation — automated rotation, zero-downtime rotation, audit trails
10. Cloud Security Posture — CSPM tools, detecting misconfigurations at scale
11. Encryption — KMS, customer-managed keys, envelope encryption
12. Audit Logging — CloudTrail/Cloud Audit Logs, what to capture, retention
13. Container Security — pod security standards, runtime security with Falco
14. Compliance as Code — policy as code with OPA, cloud guardrails
15. Incident Response — isolation playbooks, forensics, blast radius containment
16. Federated Identity — SSO, SAML, OIDC, cross-account access patterns
17. Data Classification — tagging sensitive data, enforcing access based on classification
18. Security Benchmarks — CIS benchmarks, cloud provider security best practices
