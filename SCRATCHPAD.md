# IBIS Scratchpad

Working notes, design decisions, and in-progress thinking. Updated as work progresses.

---

## Current Status
- **Phase**: Pre-development — documentation and project scaffolding
- **Next step**: Vite + React + Tailwind project setup, then wire DoseCalculator.jsx as main app

---

## Design Decisions

### Depth Profile Charts (recharts)
**Context**: The Python notebooks (`plot_depth_profiles()`) produce twin-y matplotlib charts: DPA vs Depth on left axis, ion at% vs Depth on right axis. Need to replicate in React.

**Approach**:
- Parse full depth-profile data from VACANCY.txt and RANGE.txt (not just peaks)
- Full-profile parsers already exist in Python — need JS ports that return arrays instead of just peak values
- Use recharts `ComposedChart` with `<Line>` for DPA, another `<Line>` on `yAxisId="right"` for at%
- User provides a fluence value to scale the profiles (just like `scale_phi` in Python)
- Auto-trim x-axis using the `tail_frac` logic from Python (cut where signal < 1% of peak)
- Place in a new "Depth Profiles" tab alongside the existing calculator tabs

**Key formulas (from Python)**:
```
DPA(depth)  = scale_phi × (Vac_Ions + Vac_Recoils) × 1e8 / n_atoms
at%(depth)  = C / (n + C) × 100   where C = scale_phi × B(depth)
```

### Dark Mode
- Toggle in header, state via `useState`
- Add `dark` class to root `<div>`, use Tailwind's `dark:` variants
- No localStorage persistence needed (per user request)

---

### File Structure
**Decision**: Split into modules from the start.
- `src/lib/physics.js` — PHY object (fluence, atPercent, effectiveFlux, beamPower, formatters)
- `src/lib/parsers.js` — SRIM file parsers (peak-only + full-profile for charts)
- `src/components/` — React components split by panel/tab
- Main `App.jsx` stays as the orchestrator with state and layout

### Presets
**Decision**: No presets dropdown — removed from scope.

## Open Questions
- Should depth profile parsing happen in a Web Worker to avoid blocking UI on large files?
- For the current sweep tab, should power density limit also be available as a horizontal line on a chart?
- What mobile breakpoint makes sense — just `md:` (768px) or also `sm:` (640px)?

---

## Debugging Notes
(Empty — will be populated as issues arise during development)
