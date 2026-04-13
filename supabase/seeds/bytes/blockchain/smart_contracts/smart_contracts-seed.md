# Smart Contracts — Seed Reference

## Seed Config
subdomain: smart_contracts
domain: blockchain
tech_stacks: [solidity, hardhat, foundry, vyper]
byte_type_default: article

## Topics to Seed

1. Solidity Fundamentals — types, visibility, state variables, functions, modifiers
2. Contract Architecture — upgradeable patterns (proxy), libraries, interfaces, abstract contracts
3. Storage Layout — slots, packing, SLOAD/SSTORE cost, avoiding storage collisions
4. Gas Optimization — storage vs memory vs calldata, packing structs, avoiding loops
5. Hardhat — tasks, plugins, testing with ethers.js, local node, forking
6. Foundry — Forge tests in Solidity, fuzz testing, cast for interactions, anvil for local node
7. Testing Smart Contracts — unit tests, fork tests, invariant testing, fuzzing
8. Security Patterns — checks-effects-interactions, reentrancy guard, pull over push
9. Common Vulnerabilities — reentrancy, integer overflow, access control, oracle manipulation
10. Upgradeable Contracts — transparent proxy, UUPS, diamond pattern, storage collision risks
11. Events & Logs — why events, indexing, off-chain consumption, log-based state reconstruction
12. Access Control — Ownable, AccessControl (roles), multisig ownership
13. Vyper — Python-like syntax, no inheritance, overflow checks by default, security focus
14. Oracles — Chainlink price feeds, oracle manipulation attacks, TWAP
15. ERC Standards — ERC-20, ERC-721, ERC-1155, when to use each, extensions
16. Deployment & Verification — deployment scripts, Etherscan verification, CREATE2
17. Auditing — audit process, common audit findings, self-audit checklist
18. Formal Verification — what it is, Certora, Echidna, when it's worth the investment
