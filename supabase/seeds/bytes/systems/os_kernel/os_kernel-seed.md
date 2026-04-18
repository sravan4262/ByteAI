# OS & Kernel — Seed Reference

## Seed Config
subdomain: os_kernel
domain: systems
tech_stacks: [linux_kernel, ebpf]
byte_type_default: article

## Topics to Seed

1. Kernel Architecture — monolithic vs microkernel vs hybrid, Linux vs BSD design
2. System Calls — kernel/user space boundary, syscall overhead, vDSO
3. Process Management — process vs thread, scheduling algorithms, CFS
4. Memory Management — virtual memory, paging, TLB, mmap, OOM killer
5. File Systems — VFS abstraction, ext4, btrfs, ZFS, journaling, copy-on-write
6. Linux Kernel — modules, kernel config, building, Kconfig/Makefile system
7. eBPF — architecture, programs and maps, BCC/bpftool, safe kernel programming
8. eBPF Use Cases — observability, networking (XDP), security (seccomp), tracing
9. FreeBSD — differences from Linux, jails, ZFS integration, Ports collection
10. WebAssembly — WASM runtime model, sandboxing, WASI for system access
11. WASM Beyond Browser — server-side WASM, Wasmtime, Wasmer, plugin systems
12. Device Drivers — character vs block vs network drivers, kernel module development
13. Networking Stack — socket API, TCP/IP in kernel, netfilter, XDP
14. Concurrency in Kernel — spinlocks, RCU, memory barriers, atomic operations
15. Debugging Kernel — kgdb, ftrace, perf, crash dumps, KASAN
16. Security Mechanisms — namespaces, cgroups, capabilities, seccomp, SELinux
17. Performance Tuning — kernel parameters, CPU affinity, NUMA, huge pages
18. Containerization Internals — how namespaces and cgroups power containers
