# IBIS — Ion Beam Irradiation Simulator

## Project Overview
Single-page React web app for planning ion irradiation experiments. Computes fluence, DPA, at%, irradiation time, and beam heating from SRIM simulation output files. Used by researchers operating low-energy implanters and MeV-range tandem accelerators.

## Tech Stack
- **Framework**: React 18+ (Vite bundler)
- **Styling**: Tailwind CSS v3
- **Charts**: recharts (planned)
- **Language**: JavaScript (no TypeScript)
- **Deployment**: Static SPA — no backend, no routing

## Key Conventions
- All physics calculations live in the `PHY` object at the top of `DoseCalculator.jsx` — **never modify the math without explicit user approval**
- SRIM parsers (`parseAtomicDensity`, `parseDPIPeak`, `parseBPeak`, `parseSrimMetadata`) are ported from the Python notebooks and validated against them — treat as frozen unless specifically asked to change
- Component naming: PascalCase React components, camelCase functions/variables
- Tailwind utility classes inline — no CSS modules, no styled-components
- All state management via `useState` — no Redux, no Context (single-component app)

## File Map (source of truth: ARCHITECTURE.md)
- `DoseCalculator.jsx` — Single ~790-line React component: physics engine, SRIM parsers, UI panels, calculator tabs
- `ImplanterCompute.ipynb` — Python reference notebook for low-energy implanter calculations
- `SRIMCompute.ipynb` — Python reference notebook for MeV tandem calculations + depth profile plots
- `Dose Calculator (3).xlsx` — Original Excel spreadsheet (historical reference)

## Project Documentation
- `CLAUDE.md` — This file. Project instructions for Claude Code sessions.
- `ARCHITECTURE.md` — System design, component hierarchy, data flow, API tables
- `DECISIONS.md` — Chronological log of design decisions with context and rationale
- `SCRATCHPAD.md` — Living working notes, current status, open questions
- `LESSONS.md` — Patterns, gotchas, debugging insights
- `TODO.md` — Phased feature roadmap with checkboxes
- `CHANGELOG.md` — Change history

## Workflow Commands
- `/checkpoint` — After finishing a work chunk: update TODO, CHANGELOG, DECISIONS, SCRATCHPAD, ARCHITECTURE, LESSONS to reflect current state
- `/debrief` — End-of-session: full doc sweep + handoff summary for the next session
- `/arch-sync` — Re-read source code and update ARCHITECTURE.md to match reality after refactors

## Physics Domain Quick Reference
- **DPA** = displacements per atom (radiation damage metric)
- **DPI** = peak total vacancies [vac/(Å·ion)] from VACANCY.txt
- **n** = atomic density [atoms/cm³] from E2RECOIL.txt
- **B** = peak ion distribution [1/cm] from RANGE.txt
- **Fluence** Φ = (DPA × n) / (DPI × 10⁸)  [ions/cm²]
- **at%** = C/(n+C) × 100 where C = B × Φ  (saturating formula)
- **Flux** = (I/A) × 10⁻⁹ × 6.242×10¹⁸ / q  [ions/(cm²·s)]

## SRIM File Formats
Three text files from SRIM Monte Carlo simulations:
- `VACANCY.txt` — depth vs vacancy production (ions + recoils columns)
- `RANGE.txt` — depth vs ion distribution (B column)
- `E2RECOIL.txt` — contains atomic density in header

## Development Commands
```bash
npm run dev      # Start Vite dev server
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

## Rules
- Do NOT modify physics formulas without explicit approval
- Do NOT introduce TypeScript — this is a JS project
- Do NOT add routing — single-page app only
- Do NOT add a backend — all computation is client-side
- Keep Tailwind classes inline — no external CSS unless absolutely necessary
- Prefer editing existing files over creating new ones
