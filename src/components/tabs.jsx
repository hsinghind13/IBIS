import { useState } from "react";
import { PHY, getFlux, getBeamMeta } from "../lib/physics";
import { inputCls, labelCls, btnPrimary } from "../lib/styles";
import { ResultsTable, MetaDisplay, Field } from "./shared";

export function DpaToFluenceTab({ srim, beam }) {
  const [dpaInput, setDpaInput] = useState("1, 10, 100");
  const [results, setResults] = useState({ rows: [], meta: {} });

  const compute = () => {
    const n = parseFloat(srim.n);
    const dpi = parseFloat(srim.dpi);
    const B = parseFloat(srim.B);
    const fluxInfo = getFlux(beam);
    if ([n, dpi, B].some(isNaN) || !fluxInfo) return;

    const dpas = dpaInput.split(",").map((s) => parseFloat(s.trim())).filter((v) => !isNaN(v));
    const rows = dpas.map((dpa) => {
      const fluence = PHY.fluence(dpa, dpi, n);
      const at = PHY.atPercent(B, fluence, n);
      const time_s = fluence / fluxInfo.flux;
      return {
        DPA: dpa,
        "Fluence [ions/cm²]": PHY.fmtSci(fluence),
        "at%": at.toFixed(4),
        "Time [s]": time_s.toFixed(1),
        "Time [h:m:s]": PHY.fmtHMS(time_s),
      };
    });

    setResults({
      rows,
      meta: { "n [atoms/cm³]": n, "DPI": dpi, "B peak [1/cm]": B, ...getBeamMeta(beam) },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Target DPA values (comma-separated)</label>
        <input type="text" className={inputCls} value={dpaInput} onChange={(e) => setDpaInput(e.target.value)} placeholder="1, 10, 100" />
      </div>
      <button onClick={compute} className={btnPrimary}>Compute</button>
      <ResultsTable columns={["DPA", "Fluence [ions/cm²]", "at%", "Time [s]", "Time [h:m:s]"]} rows={results.rows} title="DPA → Fluence & Time" />
      <MetaDisplay meta={results.meta} />
    </div>
  );
}

export function TimeToDpaTab({ srim, beam }) {
  const [timeInput, setTimeInput] = useState("300, 3600, 36000");
  const [results, setResults] = useState({ rows: [], meta: {} });

  const compute = () => {
    const n = parseFloat(srim.n);
    const dpi = parseFloat(srim.dpi);
    const B = parseFloat(srim.B);
    const fluxInfo = getFlux(beam);
    if ([n, dpi, B].some(isNaN) || !fluxInfo) return;

    const times = timeInput.split(",").map((s) => parseFloat(s.trim())).filter((v) => !isNaN(v));
    const rows = times.map((t) => {
      const fluence = fluxInfo.flux * t;
      const dpa = (fluence * dpi * 1e8) / n;
      const at = PHY.atPercent(B, fluence, n);
      return {
        "Time [s]": t,
        "Time [h:m:s]": PHY.fmtHMS(t),
        "Fluence [ions/cm²]": PHY.fmtSci(fluence),
        DPA: dpa.toFixed(4),
        "at%": at.toFixed(4),
      };
    });

    setResults({
      rows,
      meta: { "n [atoms/cm³]": n, "DPI": dpi, "B peak [1/cm]": B, ...getBeamMeta(beam) },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Irradiation times in seconds (comma-separated)</label>
        <input type="text" className={inputCls} value={timeInput} onChange={(e) => setTimeInput(e.target.value)} placeholder="300, 3600, 36000" />
      </div>
      <button onClick={compute} className={btnPrimary}>Compute</button>
      <ResultsTable columns={["Time [s]", "Time [h:m:s]", "Fluence [ions/cm²]", "DPA", "at%"]} rows={results.rows} title="Time → DPA" />
      <MetaDisplay meta={results.meta} />
    </div>
  );
}

export function FluenceToTimeTab({ srim, beam }) {
  const [fluenceInput, setFluenceInput] = useState("7e14, 5e16, 1e17");
  const [results, setResults] = useState({ rows: [], meta: {} });

  const compute = () => {
    const n = parseFloat(srim.n);
    const dpi = parseFloat(srim.dpi);
    const B = parseFloat(srim.B);
    const fluxInfo = getFlux(beam);
    if (!fluxInfo) return;

    const fluences = fluenceInput.split(",").map((s) => parseFloat(s.trim())).filter((v) => !isNaN(v));
    const rows = fluences.map((phi) => {
      const t = phi / fluxInfo.flux;
      const hasSrim = !isNaN(n) && !isNaN(dpi) && !isNaN(B);
      const dpa = hasSrim ? (phi * dpi * 1e8) / n : null;
      const at = hasSrim ? PHY.atPercent(B, phi, n) : null;
      return {
        "Fluence [ions/cm²]": PHY.fmtSci(phi),
        "Time [s]": t.toFixed(1),
        "Time [h:m:s]": PHY.fmtHMS(t),
        DPA: dpa !== null ? dpa.toFixed(4) : "—",
        "at%": at !== null ? at.toFixed(4) : "—",
      };
    });

    setResults({ rows, meta: getBeamMeta(beam) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Target fluences [ions/cm²] (comma-separated)</label>
        <input type="text" className={inputCls} value={fluenceInput} onChange={(e) => setFluenceInput(e.target.value)} placeholder="7e14, 5e16, 1e17" />
      </div>
      <button onClick={compute} className={btnPrimary}>Compute</button>
      <ResultsTable columns={["Fluence [ions/cm²]", "Time [s]", "Time [h:m:s]", "DPA", "at%"]} rows={results.rows} title="Fluence → Time" />
      <MetaDisplay meta={results.meta} />
    </div>
  );
}

export function CurrentSweepTab({ srim, beam }) {
  const [dpaInput, setDpaInput] = useState("1, 10, 100");
  const [currentRange, setCurrentRange] = useState("1, 2, 5, 10, 20, 30, 40, 50");
  const [maxPD, setMaxPD] = useState("30");
  const [results, setResults] = useState({ rows: [], doseRows: [], columns: [], meta: {} });

  const compute = () => {
    const n = parseFloat(srim.n);
    const dpi = parseFloat(srim.dpi);
    const B = parseFloat(srim.B);
    const q = parseFloat(beam.chargeState);
    const slit = parseFloat(beam.slit_mm);
    const E = parseFloat(beam.energy_keV);
    const limit = parseFloat(maxPD);
    const angle = beam.useAngle ? parseFloat(beam.angle) || 0 : 0;
    const xR = beam.useRaster ? parseFloat(beam.xRaster) : null;
    const yR = beam.useRaster ? parseFloat(beam.yRaster) : null;

    if ([n, dpi, B, q, slit, E].some(isNaN)) return;

    const dpas = dpaInput.split(",").map((s) => parseFloat(s.trim())).filter((v) => !isNaN(v));
    const currents_uA = currentRange.split(",").map((s) => parseFloat(s.trim())).filter((v) => !isNaN(v));

    const fluences = dpas.map((d) => PHY.fluence(d, dpi, n));
    const doseRows = dpas.map((d, i) => ({
      DPA: d,
      "Fluence [ions/cm²]": PHY.fmtSci(fluences[i]),
      "at%": PHY.atPercent(B, fluences[i], n).toFixed(4),
    }));

    const sweepCols = ["Current [µA]", "Power [W]", "P density [W/cm²]"];
    dpas.forEach((d) => sweepCols.push(`${d} DPA`));
    if (!isNaN(limit)) sweepCols.push("Status");

    const rows = currents_uA.map((I_uA) => {
      const I_nA = I_uA * 1000;
      const { flux, I_eff } = PHY.effectiveFlux(I_nA, q, slit, angle, xR, yR);
      const pwr = PHY.beamPower(I_eff, E, slit);
      const row = {
        "Current [µA]": I_uA,
        "Power [W]": pwr.power.toFixed(2),
        "P density [W/cm²]": pwr.density.toFixed(1),
      };
      dpas.forEach((d, i) => {
        row[`${d} DPA`] = PHY.fmtHMS(fluences[i] / flux);
      });
      if (!isNaN(limit)) {
        row["Status"] = pwr.density > limit ? "⚠ OVER" : "✓";
      }
      return row;
    });

    setResults({
      rows, doseRows, columns: sweepCols,
      meta: { "n [atoms/cm³]": n, "DPI": dpi, "B peak [1/cm]": B, "Energy [keV]": E, "Slit [mm]": slit, "Charge state": q },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Target DPA values</label>
          <input type="text" className={inputCls} value={dpaInput} onChange={(e) => setDpaInput(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Current range (µA, comma-sep)</label>
          <input type="text" className={inputCls} value={currentRange} onChange={(e) => setCurrentRange(e.target.value)} />
        </div>
        <Field label="Max power density" unit="W/cm²" value={maxPD} onChange={setMaxPD} placeholder="30" />
      </div>
      <button onClick={compute} className={btnPrimary}>Compute Sweep</button>
      <ResultsTable columns={["DPA", "Fluence [ions/cm²]", "at%"]} rows={results.doseRows} title="Dose Targets" />
      <ResultsTable columns={results.columns} rows={results.rows} title="Current Sweep" />
      <MetaDisplay meta={results.meta} />
    </div>
  );
}
