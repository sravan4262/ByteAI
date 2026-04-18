# Cryptography — Seed Reference

## Seed Config
subdomain: cryptography
domain: security
tech_stacks: [jwt, oauth2]
byte_type_default: article

## Topics to Seed

1. Cryptography Fundamentals — symmetric vs asymmetric, hashing vs encryption
2. TLS — handshake, certificates, cipher suites, TLS 1.2 vs 1.3
3. Certificate Management — CA, self-signed vs CA-signed, renewal automation (Let's Encrypt)
4. JWT — structure (header.payload.signature), signing algorithms (HS256 vs RS256), validation
5. JWT Pitfalls — alg:none attack, expiry enforcement, storing tokens safely
6. OAuth 2.0 — authorization code flow, PKCE, implicit flow deprecation, scopes
7. OpenID Connect — ID token vs access token, userinfo endpoint, discovery
8. Password Hashing — bcrypt vs Argon2 vs scrypt, never SHA-256 for passwords
9. Hashing vs Encryption — when to hash (passwords), when to encrypt (reversible data)
10. Key Management — generation, storage, rotation, HSMs
11. HTTPS — HSTS, certificate transparency, mixed content issues
12. Token Storage — httpOnly cookies vs localStorage, XSS vs CSRF trade-offs
13. mTLS — mutual authentication, client certificates, service mesh use cases
14. CORS — preflight, allowed origins, credentials flag, security implications
15. API Authentication — API keys vs OAuth tokens vs JWTs, use cases per pattern
16. Cryptographic Agility — designing systems to swap algorithms when they're broken
17. Common Mistakes — MD5/SHA1 for passwords, ECB mode, rolling your own crypto
18. Compliance — FIPS 140-2, PCI-DSS cryptography requirements
