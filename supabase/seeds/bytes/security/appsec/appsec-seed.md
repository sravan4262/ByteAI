# Application Security — Seed Reference

## Seed Config
subdomain: appsec
domain: security
tech_stacks: [owasp, burp_suite, snyk, sonarqube, semgrep]
byte_type_default: article

## Topics to Seed

1. OWASP Top 10 — injection, broken auth, XSS, IDOR, security misconfig and the rest
2. SQL Injection — parameterized queries, ORMs as defense, testing for injection
3. XSS — reflected vs stored vs DOM-based, CSP headers, output encoding
4. Authentication Flaws — weak passwords, credential stuffing, MFA, session management
5. IDOR & Access Control — always validate server-side, never trust client for authorization
6. Security Misconfigurations — default credentials, exposed debug endpoints, verbose errors
7. Secrets Management — never commit secrets, rotation, detection with truffleHog/gitleaks
8. Dependency Vulnerabilities — CVE scanning, Snyk, npm audit, update strategies
9. SAST — static analysis with Semgrep, SonarQube, integrating in CI pipeline
10. DAST — dynamic testing with Burp Suite, ZAP, testing running applications
11. Burp Suite — intercepting proxy, repeater, scanner, active vs passive scanning
12. Snyk — developer-first security, fix PRs, container scanning, IaC scanning
13. SonarQube — code quality + security, quality gates, hotspots vs issues
14. Semgrep — rule writing, community rules, custom patterns, CI integration
15. Threat Modeling — STRIDE, identifying trust boundaries, attack surface mapping
16. Security Headers — CSP, HSTS, X-Frame-Options, Referrer-Policy
17. Logging for Security — what to log, what not to log (PII), SIEM integration
18. Shift Left Security — integrating security checks early in the development lifecycle
