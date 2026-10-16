# Build your own operating system

**Goal.** A small x86 kernel that boots in QEMU from an image you build, prints to screen and serial, handles timer and keyboard interrupts, manages physical and virtual memory with paging, and runs a user-mode program that calls back into the kernel through a system call.

**Why.** No roadmap.sh node fits this one; it builds the skills under every systems project after it: the boot process, privilege levels, interrupt handling, page tables and the system-call boundary. Resources: ostep for the concepts and mit-6-1810 for a working reference kernel (xv6) to compare against.

**Scope.** MVP: Multiboot2 header and a GRUB-built ISO, VGA text and serial output, GDT and IDT, CPU exception handlers, remapped PIC, PIT timer, PS/2 keyboard driver, a physical frame allocator from the memory map, paging with a higher-half kernel, a kernel heap, a TSS and a switch to ring 3, an `int 0x80` system call for write and exit. Stretch: a round-robin scheduler with two user processes, an ELF loader, a RAM-disk file system.

**Architecture.** GRUB loads the kernel and hands over the memory map. Early assembly sets up a stack and calls the C entry point. The kernel initialises descriptor tables, then interrupts, then memory (frame allocator, page tables, heap). Device drivers sit behind interrupt handlers. The process layer builds a user address space, copies in the program, and returns to ring 3 with iret; system calls trap back into a dispatcher.

```
GRUB ─▶ boot.s ─▶ kmain ─▶ GDT/IDT ─▶ PIC/PIT/keyboard
                              │
                  frames ─▶ paging ─▶ heap
                              │
           user program (ring 3) ⇄ int 0x80 ⇄ syscall table
```

**Stack.** C and NASM or GAS assembly, an i686-elf or x86_64-elf cross-compiler, GRUB and xorriso for the ISO, QEMU with `-d int -no-reboot` and gdb attached for debugging, make.

**Milestones.** Boot, VGA and serial output (6 h) · GDT, IDT and exception handlers (7 h) · PIC, timer and keyboard interrupts (6 h) · frame allocator, paging and heap (10 h) · TSS, ring 3 and system calls (8 h) · tests and write-up (3 h). Total 40 h.

**Done when.** `make run` builds the ISO from source and boots it in QEMU to a prompt. Typed keys echo on screen. A deliberate access to an unmapped address triggers a page fault that prints the faulting address from CR2. A user program prints through the write system call and exits cleanly, and a privileged instruction executed in ring 3 raises a general protection fault that the kernel reports and survives. A scripted QEMU run checks the serial log for all of this.

**Measure and report.** Time from QEMU start to the prompt; kernel image size; timer accuracy against wall-clock over 60 s; system-call round-trip in cycles measured with rdtsc; free frames before and after a heap stress test.

**Pitfalls.** Triple faults that reboot silently (run with `-no-reboot` and log interrupts). Forgetting the end-of-interrupt to the PIC, so only one keypress ever arrives. Enabling paging without identity-mapping the code that is running. Leaving the TSS kernel-stack pointer unset, so the first interrupt from ring 3 faults. A cross-compiler that is not a cross-compiler, pulling in host libraries.

**References.** ostep, mit-6-1810, m16, cs162, cmu-15-213, build-your-own-x.

**Write-up.** A boot GIF in QEMU, a memory-layout diagram (physical and virtual), the list of interrupts and system calls implemented, the measurements, and what a scheduler and a file system would need.
