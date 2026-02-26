# IBIS Decision Log

Chronological record of design and implementation decisions. Each entry captures the context, options considered, and rationale. Referenced by ARCHITECTURE.md and SCRATCHPAD.md.

---

## DEC-001: Project Documentation Structure
**Date**: 2025-02-25
**Context**: Setting up project for multi-session development
**Decision**: 6 root-level markdown files (CLAUDE.md, ARCHITECTURE.md, SCRATCHPAD.md, LESSONS.md, CHANGELOG.md, TODO.md) + DECISIONS.md
**Rationale**: Full engineering docs preferred over lightweight setup. Root location chosen over docs/ subdirectory for discoverability.

## DEC-002: No Presets Dropdown
**Date**: 2025-02-25
**Context**: Originally planned a presets dropdown for common beam configurations (200 keV He→SiC, 3 MeV Si→SiC)
**Decision**: Removed from scope entirely
**Rationale**: User decided presets are not needed.

## DEC-003: Split Into Modules
**Date**: 2025-02-25
**Context**: DoseCalculator.jsx is ~790 lines and will grow with charts, validation, dark mode
**Decision**: Split from the start into `src/lib/physics.js`, `src/lib/parsers.js`, and `src/components/*.jsx`
**Rationale**: Cleaner separation of concerns. Physics and parsers are pure logic with no React dependency — easier to test and reuse.

## DEC-004: Dark Mode — Sun/Moon Icon Button
**Date**: 2025-02-25
**Context**: Needed to choose between icon button, labeled toggle switch, or other approaches
**Decision**: Simple sun/moon icon button in the header top-right
**Rationale**: Clean, minimal, universally understood. State via useState, no localStorage.

## DEC-005: Phase Order
**Date**: 2025-02-25
**Context**: Multiple features requested — needed implementation priority
**Decision**: Setup → Depth Profile Charts → UI Polish → Responsive/Dark Mode
**Rationale**: Charts are the biggest value-add and depend on the project being set up first. UI polish and theming are incremental improvements that can land last.

## DEC-006: Scratchpad as Living Document
**Date**: 2025-02-25
**Context**: SCRATCHPAD.md could be Claude-maintained or user-maintained
**Decision**: Living document — Claude updates it during development
**Rationale**: Keeps working memory current without manual overhead.

## DEC-007: Session Workflow Commands
**Date**: 2025-02-25
**Context**: Needed project management commands to keep docs in sync as work progresses
**Decision**: Three custom commands — `/checkpoint`, `/debrief`, `/arch-sync`. No `/status` or `/focus`.
**Rationale**: Checkpoint and debrief handle the start/end of work chunks. Arch-sync handles drift after refactors. Status and focus were deemed unnecessary — user will direct work naturally.
