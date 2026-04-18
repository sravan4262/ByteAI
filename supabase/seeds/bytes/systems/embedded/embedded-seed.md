# Embedded Systems — Seed Reference

## Seed Config
subdomain: embedded
domain: systems
tech_stacks: [arduino, esp32]
byte_type_default: article

## Topics to Seed

1. Embedded Fundamentals — microcontroller vs microprocessor, bare metal vs RTOS
2. Hardware Abstraction — GPIO, UART, SPI, I2C, PWM — what they are and when to use them
3. Arduino — setup/loop model, libraries, shields, hardware vs software serial
4. ESP32 — dual-core, WiFi/BT built-in, FreeRTOS integration, power modes
5. Raspberry Pi — Linux on embedded, GPIO via Python/C, choosing Pi vs microcontroller
6. FreeRTOS — tasks, queues, semaphores, mutexes, interrupt service routines
7. Zephyr RTOS — device tree, Kconfig, west tool, multi-platform support
8. Memory Constraints — RAM/flash limitations, stack sizing, heap fragmentation
9. Interrupts — ISR design, interrupt priorities, avoiding blocking in ISRs
10. Power Management — sleep modes, wake sources, battery life optimization
11. Real-time Constraints — deadlines, jitter, priority inversion, watchdog timers
12. Peripheral Communication — reading sensors, driving actuators, protocol selection
13. Bootloaders — what they do, OTA update mechanisms, secure boot
14. Debugging Embedded — JTAG/SWD, logic analyzers, printf debugging limitations
15. Networking on Embedded — MQTT, CoAP, HTTP on constrained devices
16. Testing Embedded — hardware-in-the-loop, unit testing on host, mocking hardware
17. Safety-Critical Systems — MISRA C, functional safety, certification considerations
18. Choosing a Platform — Arduino vs ESP32 vs Raspberry Pi vs STM32 decision framework
