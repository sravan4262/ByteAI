# Infrastructure as Code — Seed Reference

## Seed Config
subdomain: iac
domain: devops
tech_stacks: [terraform, bicep, pulumi, ansible, cdk]
byte_type_default: article

## Topics to Seed

1. IaC Philosophy — reproducibility, drift detection, auditability, why IaC matters
2. Terraform Fundamentals — providers, resources, state, plan/apply lifecycle
3. State Management — remote state, state locking, backend configuration
4. Modules — reusable modules, registry, versioning strategy
5. Workspaces & Environments — managing dev/staging/prod with the same codebase
6. Bicep — ARM template replacement, Azure-native, modules and parameters
7. Pulumi — real programming languages for IaC, type safety, testing support
8. Ansible — agentless config management, playbooks, idempotency
9. AWS CDK — constructs, stacks, L1/L2/L3 abstraction levels
10. Drift Detection — what happens when infra is changed manually, reconciliation
11. Secrets in IaC — never store secrets in state, vault/secrets manager integration
12. Testing IaC — terratest, checkov, tfsec, policy as code
13. Import Existing Resources — bringing existing infra under IaC management
14. Destroy Safety — preventing accidental destruction, lifecycle rules
15. Cost Estimation — infracost, estimating before apply
16. CI/CD Integration — automated plan on PR, apply on merge, drift alerts
17. Linting & Formatting — tflint, terraform fmt, consistent style
18. Choosing a Tool — Terraform vs Pulumi vs Bicep vs CDK decision framework
