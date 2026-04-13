# Systems Languages — Seed Reference

## Seed Config
subdomain: sys_languages
domain: systems
tech_stacks: [c, cpp, rust_sys, assembly, zig]
byte_type_default: article

## Topics to Seed

1. Memory Model — stack vs heap, manual allocation, ownership, lifetimes
2. Pointers & References — raw pointers, smart pointers (C++), Rust references, borrow checker
3. Undefined Behavior — what it is, why it matters, how each language handles it
4. C Language — manual memory management, pointer arithmetic, undefined behavior traps
5. C++ — RAII, move semantics, templates, STL, modern C++ (11/14/17/20)
6. Rust Ownership — ownership, borrowing, lifetimes, why the borrow checker eliminates UB
7. Rust Safety — unsafe blocks, when they're needed, minimizing unsafe surface area
8. Assembly — registers, calling conventions, reading compiler output, debugging with asm
9. Zig — comptime, allocators, error unions, C interop, no hidden allocations
10. Concurrency — threads, mutexes, atomics, lock-free data structures, race conditions
11. Performance — zero-cost abstractions, profiling, SIMD, cache-friendly data layouts
12. Cross-compilation — targeting different architectures, toolchains, sysroots
13. FFI & Interop — calling C from Rust/Zig, C ABI, binding generation
14. Build Systems — make, cmake, cargo, zig build, reproducible builds
15. Debugging — GDB, LLDB, valgrind, address sanitizer, undefined behavior sanitizer
16. Linking — static vs dynamic libraries, symbol resolution, linker scripts
17. Error Handling — errno in C, exceptions in C++, Result in Rust, error unions in Zig
18. When to Choose — C vs C++ vs Rust vs Zig decision framework per use case
