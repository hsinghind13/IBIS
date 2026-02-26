# IBIS Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    IBIS Web App                          │
│                  (Single Page App)                       │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  SRIM File   │  │  Beam Setup  │  │  Mode Toggle  │  │
│  │  Upload/Parse│  │  Panel       │  │  Impl/Tandem  │  │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘  │
│         │                │                   │          │
│         ▼                ▼                   ▼          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              PHY (Physics Engine)                │    │
│  │  fluence · atPercent · effectiveFlux · beamPower │    │
│  └──────────────────────┬──────────────────────────┘    │
│                         │                               │
│         ┌───────────────┼───────────────┐               │
│         ▼               ▼               ▼               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ DPA→Fluence│  │ Time→DPA   │  │ Fluence→   │        │
│  │ Tab        │  │ Tab        │  │ Time Tab   │        │
│  └────────────┘  └────────────┘  └────────────┘        │
│         │               │               │               │
│         ▼               ▼               ▼               │
│  ┌────────────────────────────────────────────┐         │
│  │ ResultsTable · MetaDisplay · CSV Export    │         │
│  └────────────────────────────────────────────┘         │
│                                                         │
│  ┌────────────┐                                         │
│  │ Current    │  (Implanter planning mode)               │
│  │ Sweep Tab  │                                         │
│  └────────────┘                                         │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App (root)
├── Header (mode toggle: Implanter / Tandem)
├── SrimPanel
│   ├── Drag-and-drop file upload
│   ├── SRIM file parsers (VACANCY.txt, RANGE.txt, E2RECOIL.txt)
│   └── Field × 4 (n, DPI, B peak, Depth at peak)
├── BeamPanel
│   ├── Field × 4 (current, charge state, slit, energy)
│   ├── Angled irradiation toggle → angle field
│   └── Raster scanning toggle → X/Y raster fields + I_eff readout
├── Calculator Tabs
│   ├── DpaToFluenceTab — DPA → Fluence, at%, Time
│   ├── TimeToDpaTab — Time → Fluence, DPA, at%
│   ├── FluenceToTimeTab — Fluence → Time, DPA, at%
│   └── CurrentSweepTab — Current sweep with power density limits
├── ReferenceSection (collapsible formula reference)
└── Footer
```

## Data Flow

```
SRIM Files (.txt) ──parse──► srim state {n, dpi, B, depthPeak}
                                    │
User Inputs ──────────────► beam state {current_nA, chargeState, slit_mm, ...}
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
                   getFlux(beam)          PHY.fluence()
                        │                  PHY.atPercent()
                        │                  PHY.beamPower()
                        ▼                       │
                   flux [ions/cm²·s]            │
                        │                       │
                        └───────────┬───────────┘
                                    ▼
                            ResultsTable rows
                            MetaDisplay params
```

## State Architecture

All state lives in `App()` via `useState`:
- `mode` — "implanter" | "tandem" (controls which beam defaults are active)
- `subTab` — "dpa" | "time" | "fluence" | "sweep"
- `srim` — {n, dpi, B, depthPeak} — shared across all tabs
- `beamImpl` — implanter beam params (persists when switching modes)
- `beamTandem` — tandem beam params (persists when switching modes)

Each calculator tab has its own local state for input fields and results.

## Physics Engine (`PHY` object)

| Method | Inputs | Output | Formula |
|---|---|---|---|
| `fluence(dpa, dpi, n)` | DPA target, peak vacancies, atomic density | Φ [ions/cm²] | Φ = (DPA × n) / (DPI × 10⁸) |
| `atPercent(B, fluence, n)` | Peak ion dist, fluence, atomic density | at% | C/(n+C) × 100 |
| `effectiveFlux(I, q, slit, angle, xR, yR)` | Current, charge, slit, angle, raster | flux, I_eff | (I/A) × 10⁻⁹ × 6.242e18 / q × cos(θ) |
| `beamPower(I, E, slit)` | Current, energy, slit | power, density | P = I×10⁻⁹ × E×10³ |

## SRIM Parsers

| Function | Input File | Extracts |
|---|---|---|
| `parseAtomicDensity(text)` | E2RECOIL.txt | n [atoms/cm³] from header regex |
| `parseDPIPeak(text)` | VACANCY.txt | Peak of (ions + recoils) column |
| `parseBPeak(text)` | RANGE.txt | Peak B [1/cm] and depth [Å] |
| `parseSrimMetadata(text)` | Any SRIM file | Ion name, energy, target composition |

## Reference Implementations (Python Notebooks)

The JSX physics and parsers are ports of two Jupyter notebooks:

| Notebook | Scope | Unique Features |
|---|---|---|
| `ImplanterCompute.ipynb` | Low-energy (keV) implanter | `implanter_plan()` with current sweep + power density limit, charge state defaults q=1 |
| `SRIMCompute.ipynb` | MeV tandem accelerator | Multi-energy comparison, vacancy linear fit, triple-axis plots, charge state defaults q=2 |

Both notebooks contain `plot_depth_profiles()` which produces twin-y DPA + at% vs depth charts — this is the reference for the planned recharts implementation.

## Planned Extensions (see TODO.md)

- Depth profile charts (recharts) — new "Depth Profiles" tab
- Input validation with inline errors
- Live flux readout in beam panel
- Sortable results tables
- Dark mode toggle (sun/moon icon button in header)
- Mobile responsiveness
