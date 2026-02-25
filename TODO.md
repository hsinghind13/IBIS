# IBIS — Feature Roadmap

Ordered by implementation priority. Check items off as completed.

---

## Phase 1: Project Setup
- [ ] Initialize Vite + React + Tailwind CSS project
- [ ] Wire DoseCalculator.jsx into src/ as main App component
- [ ] Verify dev server runs and existing UI renders correctly

## Phase 2: Depth Profile Charts
- [ ] Write full-profile VACANCY.txt parser (returns depth[] + vacancy[] arrays)
- [ ] Write full-profile RANGE.txt parser (returns depth[] + B[] arrays)
- [ ] Store raw file text in state so depth profiles can be recomputed with different fluences
- [ ] Add "Depth Profiles" tab to calculator tabs
- [ ] Implement twin-y recharts ComposedChart (DPA left axis, at% right axis)
- [ ] Add fluence input field for scaling depth profiles
- [ ] Auto-trim x-axis using tail_frac logic (cut where signal < 1% of peak)

## Phase 3: UI Polish
- [ ] Input validation with inline error messages on Compute buttons
- [ ] Live flux readout in BeamPanel (updates as user types)
- [ ] Sortable results tables (click column header to sort asc/desc)
- [ ] Presets dropdown (200 keV He→SiC, 3 MeV Si→SiC, user-configurable)

## Phase 4: Responsiveness & Theming
- [ ] Mobile-responsive layouts (grid stacking on small screens)
- [ ] Dark mode toggle with Tailwind dark: variants
- [ ] Review touch targets and font sizes for mobile

## Future Ideas (not committed)
- [ ] Export depth profile chart as PNG/SVG
- [ ] Multi-energy overlay chart (compare different SRIM runs)
- [ ] Vacancy breakdown chart (ions vs recoils vs total)
- [ ] Save/load session state (JSON export/import)
- [ ] PWA support for offline use
