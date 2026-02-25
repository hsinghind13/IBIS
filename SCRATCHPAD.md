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

### Presets System
**Context**: Common experimental setups that should pre-fill SRIM params + beam params.

**Candidates**:
- 200 keV He → SiC (implanter): n=9.611e22, DPI=0.04068, B=6.570e4, q=1, slit=3mm
- 3 MeV Si → SiC (tandem): n=9.611e22, DPI=0.5451, B=4.350e4, q=2, slit=3mm
- More to be added from user's notebook examples

**Implementation**: Simple dropdown in header or SRIM panel. Selecting a preset calls `setSrim()` + `setBeam()` with hardcoded values.

### Dark Mode
- Toggle in header, state via `useState`
- Add `dark` class to root `<div>`, use Tailwind's `dark:` variants
- No localStorage persistence needed (per user request)

---

## Open Questions
- Should depth profile parsing happen in a Web Worker to avoid blocking UI on large files?
- For the current sweep tab, should power density limit also be available as a horizontal line on a chart?
- What mobile breakpoint makes sense — just `md:` (768px) or also `sm:` (640px)?

---

## Debugging Notes
(Empty — will be populated as issues arise during development)
