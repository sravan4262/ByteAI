# Web3 Tools — Seed Reference

## Seed Config
subdomain: web3_tools
domain: blockchain
tech_stacks: [ipfs, the_graph, wagmi, ethers_js, viem]
byte_type_default: article

## Topics to Seed

1. IPFS — content addressing, DHT, pinning, IPFS vs Filecoin, CIDs
2. The Graph — subgraphs, indexing blockchain events, GraphQL queries, hosted vs decentralized
3. ethers.js — providers, signers, contract interaction, event listening
4. wagmi — React hooks for Ethereum, connector system, TanStack Query integration
5. viem — TypeScript-first, lightweight, low-level, replacing ethers in modern stacks
6. Wallet Connection — WalletConnect, MetaMask, Coinbase Wallet, wallet abstraction
7. Reading On-chain Data — eth_call, getLogs, event filtering, batch requests
8. Writing Transactions — signing, gas estimation, nonce management, transaction monitoring
9. ENS — name resolution, avatar, records, reverse resolution
10. IPFS Pinning — Pinata, web3.storage, NFT.Storage, self-hosted nodes
11. Contract ABIs — what ABIs are, encoding/decoding, generating typed ABIs
12. Multicall — batching contract reads, reducing RPC calls, gas savings
13. Event Indexing — why you can't rely on full node getLogs for production, subgraph vs custom indexer
14. RPC Management — rate limits, fallback providers, Alchemy vs Infura vs QuickNode
15. Testing with Tools — forking mainnet, Hardhat/Foundry test environment, mocking contracts
16. Frontend Web3 UX — pending states, failed tx handling, gas estimation errors
17. Security — private key never in frontend, signature phishing, approvals management
18. Choosing a Library — ethers.js vs viem vs web3.js, migration considerations
