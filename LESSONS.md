# IBIS Lessons Learned

Patterns, gotchas, and insights discovered during development. Referenced to avoid repeating mistakes.

---

## SRIM File Parsing

### Fortran-style exponents
SRIM output files use `D` instead of `E` for exponents (e.g., `1.234D+05`). All parsers must `.replace(/D/gi, "E")` before `parseFloat()`. This is already handled in the JSX parsers but easy to forget in new code.

### File encoding
SRIM files are Latin-1 encoded, not UTF-8. The `FileReader` in the upload handler uses `reader.readAsText(file, "latin1")`. Any new file reading code must preserve this.

### Data table detection
SRIM data tables start after a header line containing `"Ang."`, `"IONS"`, and column keywords. There's typically a separator line (dashes) after the header that must be skipped. The parsers skip 1-2 lines after detecting the header before reading data rows.

### Peak extraction vs full profile
The existing JSX parsers (`parseDPIPeak`, `parseBPeak`) extract only the **peak** value for the dose calculation. The Python notebooks also have full-profile parsers that return arrays for plotting. When implementing depth profile charts, new full-profile parsers will be needed — don't modify the existing peak-only parsers, add new functions alongside them.

---

## Physics

### Saturating vs dilute at% formula
- **Saturating** (used in app): `at% = C/(n+C) × 100` — correct at all concentrations
- **Dilute** (comparison only): `at% = C/n × 100` — only valid when C << n
- The tandem notebook has both; the implanter notebook uses saturating exclusively
- The JSX app uses saturating only, which is the correct general choice

### Implanter vs Tandem defaults
- Implanter: charge state q=1, energy in keV range (100-400 keV typical)
- Tandem: charge state q=2+, energy in MeV range (1-15 MeV typical)
- The mode toggle switches default beam parameters but shares SRIM state

---

## React / UI

### State persistence across mode switches
Implanter and tandem beam params are stored in separate state objects (`beamImpl`, `beamTandem`). Switching modes doesn't lose the other mode's values. SRIM parameters are shared across both modes (same target material).

---

## Notebook Cross-References

### Functions that exist in Python but not yet in JSX
- `plot_depth_profiles()` — twin-y depth profile chart (planned for recharts)
- `plot_vacancy_profile()` — vacancy breakdown (ions/recoils/total)
- `plot_vacancy_multi_energy()` — multi-folder energy comparison
- `plot_vacancy_with_fit()` — vacancy + linear fit in depth band
- `plot_triple_axis()` — DPA + at% + indenter force overlay
- `implanter_plan()` — exists as `CurrentSweepTab` in JSX (already ported)
