import { useState } from "react";

export default function ReferenceSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-900">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <span>Formula Reference</span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-700 dark:text-gray-300 space-y-4 border-t border-gray-100 dark:border-gray-800 pt-4">
          {[
            { title: "Fluence from DPA", formula: "Φ = (DPA × n) / (DPI × 10⁸)", note: "n = atomic density [atoms/cm³], DPI = peak total vacancies [vac/(Å·ion)]" },
            { title: "Saturating at%", formula: "C = B × Φ  →  at% = C / (n + C) × 100", note: "B = peak ion distribution [1/cm] from RANGE.txt. Valid at high concentrations." },
            { title: "Beam flux (perpendicular)", formula: "flux = (I / A) × 10⁻⁹ × 6.242×10¹⁸ / q", note: "I = current [nA], A = (slit/10)² [cm²], q = charge state" },
            { title: "Irradiation time", formula: "t = Φ / flux  [seconds]", note: "" },
            { title: "Beam power density", formula: "P/A = (I × 10⁻⁹ × E × 10³) / A  [W/cm²]", note: "Useful for checking sample heating limits" },
            { title: "Raster current scaling", formula: "I_eff = I_chamber / (X_slit × Y_slit / slit²)", note: "Scales total chamber current to effective current through beam spot area" },
            { title: "Angle correction", formula: "flux_angled = flux_perp × cos(θ)", note: "θ = angle from surface normal. Reduces effective flux on tilted samples." },
          ].map(({ title, formula, note }) => (
            <div key={title}>
              <div className="font-semibold text-gray-800 dark:text-gray-200 text-xs uppercase tracking-wide mb-1">{title}</div>
              <div className="font-mono text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-1.5 inline-block">{formula}</div>
              {note && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
