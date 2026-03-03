import { Field } from "./shared";

export default function BeamPanel({ beam, setBeam, mode }) {
  const set = (k) => (v) => setBeam({ ...beam, [k]: v });
  const isAngled = beam.useAngle;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Beam Setup</h3>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {mode === "implanter" ? "Low-energy (default q=1)" : "MeV-range (default q=2)"}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Beam current" unit="nA" value={beam.current_nA} onChange={set("current_nA")} placeholder="200" />
        <Field label="Charge state" value={beam.chargeState} onChange={set("chargeState")} placeholder={mode === "implanter" ? "1" : "2"} />
        <Field label="Slit size" unit="mm" value={beam.slit_mm} onChange={set("slit_mm")} placeholder="3" />
        <Field label="Beam energy" unit="keV" value={beam.energy_keV} onChange={set("energy_keV")} placeholder="200" />
      </div>

      {/* Angle/Raster toggle */}
      <div className="flex items-center gap-3 pt-1 border-t border-gray-100 dark:border-gray-800">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={!!beam.useAngle}
            onChange={(e) => setBeam({ ...beam, useAngle: e.target.checked })}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-400 dark:bg-gray-800"
          />
          Angled irradiation
        </label>
        {isAngled && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={!!beam.useRaster}
              onChange={(e) => setBeam({ ...beam, useRaster: e.target.checked })}
              className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-400 dark:bg-gray-800"
            />
            Raster scanning
          </label>
        )}
      </div>

      {isAngled && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded p-3">
          <Field label="Angle from normal" unit="°" value={beam.angle} onChange={set("angle")} placeholder="70" />
          {beam.useRaster && (
            <>
              <Field label="X raster slit" unit="mm" value={beam.xRaster} onChange={set("xRaster")} placeholder="7" />
              <Field label="Y raster slit" unit="mm" value={beam.yRaster} onChange={set("yRaster")} placeholder="5" />
              <div className="flex items-end">
                <div className="text-xs text-amber-700 dark:text-amber-400 font-mono pb-2">
                  {(() => {
                    const slit = parseFloat(beam.slit_mm);
                    const x = parseFloat(beam.xRaster);
                    const y = parseFloat(beam.yRaster);
                    const I = parseFloat(beam.current_nA);
                    if ([slit, x, y, I].some(isNaN)) return "";
                    const ratio = (x * y) / (slit * slit);
                    return `I_eff = ${(I / ratio).toFixed(1)} nA (÷${ratio.toFixed(1)})`;
                  })()}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
