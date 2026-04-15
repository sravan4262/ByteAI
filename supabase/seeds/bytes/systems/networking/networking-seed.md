# Networking — Seed Reference

## Seed Config
subdomain: networking
domain: systems
tech_stacks: [tcp_ip, quic]
byte_type_default: article

## Topics to Seed

1. OSI Model — layers, what lives at each layer, why it matters for debugging
2. TCP — three-way handshake, flow control, congestion control, TIME_WAIT
3. UDP — stateless, use cases (DNS, media, gaming), reliability built on top
4. IP — IPv4 vs IPv6, subnetting, routing, NAT, CIDR
5. DNS — resolution chain, TTL, record types, DNS over HTTPS, split horizon
6. TLS over TCP — handshake, session resumption, 0-RTT trade-offs
7. HTTP/1.1 vs HTTP/2 vs HTTP/3 — multiplexing, head-of-line blocking, QUIC
8. QUIC — UDP-based transport, connection migration, 0-RTT, loss recovery
9. DPDK — kernel bypass, poll-mode drivers, hugepages, ultra-low latency use cases
10. Socket Programming — blocking vs non-blocking, epoll/kqueue, io_uring
11. Load Balancing — L4 vs L7, algorithms, health checks, sticky sessions
12. Congestion Control — CUBIC, BBR, QUIC's approach, buffer bloat
13. Network Observability — tcpdump, Wireshark, ss/netstat, eBPF for networking
14. Firewalls & NAT — iptables/nftables, connection tracking, SNAT/DNAT
15. Service Mesh — sidecar proxy model, mTLS between services, observability
16. Zero-copy Networking — sendfile, splice, DMA, reducing CPU in data path
17. Latency vs Throughput — trade-offs, tuning kernel network stack
18. Debugging Network Issues — systematic approach, tools per OSI layer
