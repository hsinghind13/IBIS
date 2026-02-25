# IBIS Changelog

All notable changes to this project will be documented in this file.

---

## [Unreleased]

### Added
- Project documentation: CLAUDE.md, ARCHITECTURE.md, SCRATCHPAD.md, LESSONS.md, TODO.md
- Git repository initialization

### Existing (pre-project-setup)
- `DoseCalculator.jsx` — Complete single-file React component (~790 lines) with:
  - PHY physics engine (fluence, at%, flux, beam power, angle/raster corrections)
  - SRIM file parsers (VACANCY.txt, RANGE.txt, E2RECOIL.txt)
  - Drag-and-drop file upload with auto-parsing
  - Implanter / Tandem mode toggle with separate beam defaults
  - 4 calculator tabs: DPA→Fluence, Time→DPA, Fluence→Time, Current Sweep
  - Results tables with copy-to-clipboard and CSV export
  - Collapsible formula reference section
  - Tailwind CSS styling
- `ImplanterCompute.ipynb` — Python reference for low-energy calculations
- `SRIMCompute.ipynb` — Python reference for tandem calculations + depth profile plots
- `Dose Calculator (3).xlsx` — Original Excel spreadsheet
