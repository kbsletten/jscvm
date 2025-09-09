       _______ _______    ____  ___
      / / ___// ____/ |  / /  |/  /
 __  / /\__ \/ /    | | / / /|_/ /
/ /_/ /___/ / /___  | |/ / /  / /
\____//____/\____/  |___/_/  /_/

An abstract C Virtual Machine implemented in JavaScript. This project aims to
enable better educational tools for developers interested in learning to
program in C.

Goals
 * Implement the C89/C90 standard
 * Allow configurable execution environment
   * 16-bit
   * 32-bit
   * 64-bit (long = 32 bit and long = 64 bit)
 * Implement a configurable C abstract machine
   * Break on undefined/unspecified behavior
   * Implement undefined/unspecified behavior non-deterministically
   * Emulate specific platform behavior

Non-Goals
 * Compilation to WASM
 * High-performance
