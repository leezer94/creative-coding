---
title: Library Recognition and Documentation Policy
type: reference
status: active
---

# Library Recognition and Documentation Policy

## Purpose

This document tells the agent how to behave when a task touches a known library in the stack.

## Stack map

### Vite
Use Vite conventions for project structure, scripts, and lean configuration.
Do not introduce custom build complexity unless clearly required.

### React
Use functional components.
Keep state and effects explicit.
Prefer composition and prop-driven design.

### TypeScript
Favor strong prop typing, small public surfaces, and readable types.
Do not invent type-level cleverness unless it meaningfully improves safety.

### React Three Fiber
Treat R3F as the primary owner of:

- Canvas composition
- 3D scene graph
- meshes, lights, cameras, groups
- frame-driven 3D motion

Prefer idiomatic JSX scene composition.
Avoid imperative Three.js setup unless the task genuinely requires lower-level control.

### Three.js
When using lower-level Three.js primitives inside R3F:

- be explicit about lifecycle
- dispose custom resources when needed
- keep custom materials, textures, and geometries contained
- avoid leaking raw Three.js concerns into unrelated UI components

### p5.js
Treat p5 as a dedicated 2D sketch system.
Use instance mode.
Mount it inside a dedicated React component.
Always include setup, resize handling, and teardown.
Do not let p5 take over the application shell.

## Documentation priority order

When code may be version-sensitive or API-sensitive, use this order:

1. official library docs
2. project-local references in `docs/`
3. existing project code patterns
4. memory

## Required behavior on library-sensitive tasks

When asked to add, refactor, or debug behavior tied to a library:

1. name the library internally
2. choose the canonical pattern for that library
3. preserve project architecture boundaries
4. avoid mixing responsibilities between R3F and p5
5. mention version-sensitive assumptions when relevant

## Red flags

Pause and reconsider if a solution would:

- mix p5 rendering responsibility with R3F scene ownership
- introduce p5 global mode
- create unmanaged Three.js resources
- bypass React component boundaries without a real need
- add tools or packages before exhausting the current stack
