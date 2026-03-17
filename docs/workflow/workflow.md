---
title: Workflow and Review Standard
type: reference
status: active
---

# Workflow and Review Standard

## Before coding

1. Clarify whether the task belongs to UI layout, R3F scene work, p5 sketch work, or shared configuration.
2. Preserve the project's rendering boundary.
3. Choose the smallest viable implementation.
4. Decide where tweakable constants should live.

## While coding

- keep files focused
- keep names descriptive
- prefer complete working implementations
- avoid TODO-driven scaffolding
- avoid half-migrated patterns

## After coding

Review against this checklist:

- Does R3F still own the 3D scene?
- Does p5 still own only its 2D layer?
- Are cleanup paths explicit?
- Is resize behavior handled?
- Are types readable?
- Is the visual result immediately usable?
- Would another engineer understand where to tweak motion, density, and color?

## Refactor trigger

Refactor only when one of these is true:

- repeated logic is clearly stable
- file size meaningfully harms readability
- scene and sketch responsibilities are bleeding together
- cleanup or state flow is becoming error-prone

## Preferred response format for implementation tasks

1. state the chosen approach in one short paragraph
2. provide complete files
3. note where customization lives
4. mention any cleanup or performance caveat
