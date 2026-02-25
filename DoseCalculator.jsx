import { useState, useCallback } from "react";

// ═══════════════════════════════════════════════════
// PHYSICS ENGINE (ported from Python notebooks + Excel)
// ═══════════════════════════════════════════════════

const PHY = {
  fluence(dpa, dpi, n) {
    return (dpa * n) / (dpi * 1e8);
  },
  atPercent(B, fluence, n) {
    const C = B * fluence;
    return (C / (n + C)) * 100.0;
  },
  /**
   * Compute effective beam flux accounting for optional angle and raster.
   * @param {number} current_nA - beam current in nA (chamber current if raster)
   * @param {number} chargeState
   * @param {number} slit_mm - beam slit (square)
   * @param {number} angleDeg - irradiation angle from normal (0 = perpendicular)
   * @param {number|null} xRaster_mm - X raster slit (null = no raster)
   * @param {number|null} yRaster_mm - Y raster slit (null = no raster)
   */
  effectiveFlux(current_nA, chargeState, slit_mm, angleDeg = 0, xRaster_mm = null, yRaster_mm = null) {
    let I_eff = current_nA;
    // Raster current scaling: chamber current / (raster_area / beam_area)
    if (xRaster_mm && yRaster_mm) {
      const rasterRatio = (xRaster_mm * yRaster_mm) / (slit_mm * slit_mm);
      I_eff = current_nA / rasterRatio;
    }
    const area = (slit_mm / 10.0) ** 2;
    let flux = (I_eff / area) * 1e-9 * 6.242e18 / chargeState;
    // Angle correction: flux_angled = flux_perp / (1/cos θ)
    if (angleDeg > 0 && angleDeg < 90) {
      flux = flux * Math.cos((angleDeg * Math.PI) / 180);
    }
    return { flux, I_eff };
  },
  beamPower(current_nA, energy_keV, slit_mm) {
    const area = (slit_mm / 10.0) ** 2;
    const power = current_nA * 1e-9 * energy_keV * 1e3;
    return { power, area, density: power / area };
  },
  fmtHMS(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "—";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds - h * 3600 - m * 60;
    return `${h}h ${m}m ${s.toFixed(1)}s`;
  },
  fmtSci(val, digits = 4) {
    if (val === 0) return "0";
    if (!isFinite(val)) return "—";
    return val.toExponential(digits);
  },
};

// ═══════════════════════════════════════════════════
// SRIM FILE PARSERS (ported from Python)
// ═══════════════════════════════════════════════════

function parseAtomicDensity(text) {
  const m = text.match(/Density\s*=\s*([0-9.+\-Ee]+)\s*atoms\/cm3/);
  return m ? parseFloat(m[1]) : null;
}

function parseDPIPeak(text) {
  const lines = text.split("\n");
  let dataStarted = false;
  let mx = null;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!dataStarted && s.includes("Ang.") && s.includes("IONS") && s.includes("RECOILS")) {
      dataStarted = true;
      i++;
      continue;
    }
    if (!dataStarted) continue;
    if (!s || ";*-".includes(s[0])) {
      if (mx !== null) break;
      continue;
    }
    const nums = s.match(/[-+]?\d+(?:\.\d*)?(?:[EeDd][+-]?\d+)?/g);
    if (nums && nums.length >= 3) {
      const y = parseFloat(nums[1].replace(/D/gi, "E")) + parseFloat(nums[2].replace(/D/gi, "E"));
      if (mx === null || y > mx) mx = y;
    }
  }
  return mx;
}

function parseBPeak(text) {
  const lines = text.split("\n");
  let start = null;
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i].toLowerCase();
    if (L.includes("ang.") && L.includes("ions") && L.includes("distribution")) {
      start = i + 2;
      break;
    }
  }
  if (start === null) return { B: null, depth: null };
  let maxB = -Infinity, maxDepth = 0;
  for (let i = start; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) break;
    const nums = s.match(/[-+]?\d+(?:\.\d*)?(?:[EeDd][+-]?\d+)?/g);
    if (nums && nums.length >= 2) {
      const depth = parseFloat(nums[0].replace(/D/gi, "E"));
      const bVal = parseFloat(nums[1].replace(/D/gi, "E"));
      if (bVal > maxB) { maxB = bVal; maxDepth = depth; }
    }
  }
  return { B: maxB === -Infinity ? null : maxB, depth: maxDepth };
}

function parseSrimMetadata(text) {
  const mIon = text.match(/Ion\s*=\s*(\w+)\s+Energy\s*=\s*(\d+)\s*keV/);
  const ion = mIon ? mIon[1] : null;
  const energy = mIon ? parseInt(mIon[2]) : null;
  const elements = [];
  const re = /Layer\s*#\s*\d+-\s*(\w+)\s*=\s*[\d.]+\s+Atomic Percent/g;
  let m;
  while ((m = re.exec(text)) !== null) elements.push(m[1]);
  return { ion, energy_keV: energy, target: elements.join("") || "Target" };
}

// ═══════════════════════════════════════════════════
// STYLE CONSTANTS
// ═══════════════════════════════════════════════════

const inputCls = "w-full bg-gray-50 border border-gray-300 text-sm px-3 py-2 rounded focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none font-mono";
const labelCls = "block text-xs font-semibold text-gray-600 mb-1 tracking-wide uppercase";
const btnPrimary = "px-5 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors";
const btnSecondary = "px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 bg-white hover:bg-gray-50 transition-colors";
const tabActive = "px-4 py-2.5 text-sm font-semibold border-b-2 border-blue-600 text-blue-700 cursor-pointer";
const tabInactive = "px-4 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 cursor-pointer border-b-2 border-transparent hover:border-gray-300";

// ═══════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════

function Field({ label, value, onChange, unit, placeholder, disabled }) {
  return (
    <div>
      <label className={labelCls}>
        {label} {unit && <span className="text-gray-400 normal-case font-normal">({unit})</span>}
      </label>
      <input
        type="number"
        step="any"
        className={`${inputCls} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

function ResultsTable({ columns, rows, title }) {
  const [copied, setCopied] = useState(false);
  if (!rows || !rows.length) return null;

  const toTSV = () => {
    const header = columns.join("\t");
    const body = rows.map((r) => columns.map((c) => r[c] ?? "").join("\t")).join("\n");
    return header + "\n" + body;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(toTSV()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadCSV = () => {
    const header = columns.join(",");
    const body = rows.map((r) => columns.map((c) => `"${r[c] ?? ""}"`).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "results").replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        {title && <h3 className="text-sm font-semibold text-gray-700">{title}</h3>}
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className={btnSecondary}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <button onClick={downloadCSV} className={btnSecondary}>
            ↓ CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto border border-gray-200 rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap border-b border-gray-200 text-xs tracking-wide">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-blue-50/30`}>
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2 font-mono text-gray-800 whitespace-nowrap border-b border-gray-100 text-xs">
                    {r[c]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetaDisplay({ meta }) {
  if (!meta || !Object.keys(meta).length) return null;
  return (
    <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
      <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2 tracking-wider">Computed Parameters</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
        {Object.entries(meta).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 text-xs">
            <span className="text-gray-500 truncate">{k}</span>
            <span className="text-gray-800 font-mono">
              {typeof v === "number"
                ? Math.abs(v) > 1e4 || (Math.abs(v) < 0.01 && v !== 0)
                  ? v.toExponential(4)
                  : v.toFixed(4)
                : v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceSection() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
      >
        <span>Formula Reference</span>
        <span className="text-gray-400 text-xs">{open ? "▲ collapse" : "▼ expand"}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-gray-700 space-y-4 border-t border-gray-100 pt-4">
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
              <div className="font-semibold text-gray-800 text-xs uppercase tracking-wide mb-1">{title}</div>
              <div className="font-mono text-sm bg-gray-50 rounded px-3 py-1.5 inline-block">{formula}</div>
              {note && <div className="text-xs text-gray-500 mt-1">{note}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SRIM PARAMETER PANEL
// ═══════════════════════════════════════════════════

function SrimPanel({ srim, setSrim }) {
  const [uploadStatus, setUploadStatus] = useState("");
  const [parsedMeta, setParsedMeta] = useState(null);

  const handleFiles = useCallback((files) => {
    const fileList = Array.from(files);
    let status = [];
    let newSrim = { ...srim };

    const readFile = (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, text: reader.result });
        reader.readAsText(file, "latin1");
      });

    Promise.all(fileList.map(readFile)).then((results) => {
      let metaInfo = null;
      for (const { name, text } of results) {
        const upper = name.toUpperCase();
        if (upper.includes("E2RECOIL")) {
          const n = parseAtomicDensity(text);
          if (n) { newSrim.n = n.toExponential(4); status.push(`n = ${n.toExponential(3)}`); }
          metaInfo = metaInfo || parseSrimMetadata(text);
        }
        if (upper.includes("VACANCY")) {
          const dpi = parseDPIPeak(text);
          if (dpi) { newSrim.dpi = dpi; status.push(`DPI = ${dpi.toExponential(3)}`); }
          metaInfo = metaInfo || parseSrimMetadata(text);
        }
        if (upper.includes("RANGE")) {
          const { B, depth } = parseBPeak(text);
          if (B) { newSrim.B = B; newSrim.depthPeak = depth; status.push(`B = ${B.toExponential(3)}`); }
          metaInfo = metaInfo || parseSrimMetadata(text);
        }
      }
      setSrim(newSrim);
      setParsedMeta(metaInfo);
      setUploadStatus(status.length ? `Parsed: ${status.join(", ")}` : "No recognized SRIM parameters found.");
    });
  }, [srim, setSrim]);

  return (
    <div className="bg-white border border-gray-200 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SRIM Parameters</h3>
        {parsedMeta?.ion && (
          <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-mono">
            {parsedMeta.energy_keV >= 1000 ? `${parsedMeta.energy_keV / 1000} MeV` : `${parsedMeta.energy_keV} keV`}{" "}
            {parsedMeta.ion} → {parsedMeta.target}
          </span>
        )}
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center text-gray-500 text-sm cursor-pointer hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file"; input.multiple = true; input.accept = ".txt";
          input.onchange = () => handleFiles(input.files);
          input.click();
        }}
      >
        Drop SRIM files here or click to browse
        <span className="block text-xs text-gray-400 mt-0.5">VACANCY.txt · RANGE.txt · E2RECOIL.txt</span>
      </div>
      {uploadStatus && (
        <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded px-2 py-1 font-mono">{uploadStatus}</p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="n" unit="atoms/cm³" value={srim.n} onChange={(v) => setSrim({ ...srim, n: v })} placeholder="9.611e22" />
        <Field label="DPI" unit="vac/(Å·ion)" value={srim.dpi} onChange={(v) => setSrim({ ...srim, dpi: v })} placeholder="0.0407" />
        <Field label="B peak" unit="1/cm" value={srim.B} onChange={(v) => setSrim({ ...srim, B: v })} placeholder="6.57e4" />
        <Field label="Depth at peak" unit="Å" value={srim.depthPeak} onChange={(v) => setSrim({ ...srim, depthPeak: v })} placeholder="7300" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// BEAM SETUP PANEL (with integrated angle/raster)
// ═══════════════════════════════════════════════════

function BeamPanel({ beam, setBeam, mode }) {
  const set = (k) => (v) => setBeam({ ...beam, [k]: v });
  const isAngled = beam.useAngle;

  return (
    <div className="bg-white border border-gray-200 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Beam Setup</h3>
        <span className="text-xs text-gray-400">
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
      <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
          <input
            type="checkbox"
            checked={!!beam.useAngle}
            onChange={(e) => setBeam({ ...beam, useAngle: e.target.checked })}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
          />
          Angled irradiation
        </label>
        {isAngled && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
            <input
              type="checkbox"
              checked={!!beam.useRaster}
              onChange={(e) => setBeam({ ...beam, useRaster: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
            />
            Raster scanning
          </label>
        )}
      </div>

      {isAngled && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-amber-50/50 border border-amber-200 rounded p-3">
          <Field label="Angle from normal" unit="°" value={beam.angle} onChange={set("angle")} placeholder="70" />
          {beam.useRaster && (
            <>
              <Field label="X raster slit" unit="mm" value={beam.xRaster} onChange={set("xRaster")} placeholder="7" />
              <Field label="Y raster slit" unit="mm" value={beam.yRaster} onChange={set("yRaster")} placeholder="5" />
              <div className="flex items-end">
                <div className="text-xs text-amber-700 font-mono pb-2">
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

// ═══════════════════════════════════════════════════
// Helper: get effective flux from beam state
// ═══════════════════════════════════════════════════

function getFlux(beam) {
  const I = parseFloat(beam.current_nA);
  const q = parseFloat(beam.chargeState);
  const slit = parseFloat(beam.slit_mm);
  const angle = beam.useAngle ? parseFloat(beam.angle) || 0 : 0;
  const xR = beam.useRaster ? parseFloat(beam.xRaster) : null;
  const yR = beam.useRaster ? parseFloat(beam.yRaster) : null;
  if ([I, q, slit].some(isNaN)) return null;
  return PHY.effectiveFlux(I, q, slit, angle, xR, yR);
}

function getBeamMeta(beam) {
  const I = parseFloat(beam.current_nA);
  const E = parseFloat(beam.energy_keV);
  const slit = parseFloat(beam.slit_mm);
  const fluxInfo = getFlux(beam);
  if (!fluxInfo) return {};
  const meta = {
    "Effective current [nA]": fluxInfo.I_eff,
    "Flux [ions/(cm²·s)]": fluxInfo.flux,
    "Slit area [cm²]": (slit / 10) ** 2,
  };
  if (beam.useAngle) {
    const angle = parseFloat(beam.angle) || 0;
    meta["Angle [°]"] = angle;
    meta["cos(θ)"] = Math.cos((angle * Math.PI) / 180);
  }
  if (!isNaN(E) && !isNaN(I)) {
    const pwr = PHY.beamPower(fluxInfo.I_eff, E, slit);
    meta["Power [W]"] = pwr.power;
    meta["Power density [W/cm²]"] = pwr.density;
  }
  return meta;
}

// ═══════════════════════════════════════════════════
// CALCULATOR TABS
// ═══════════════════════════════════════════════════

function DpaToFluenceTab({ srim, beam }) {
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

function TimeToDpaTab({ srim, beam }) {
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

function FluenceToTimeTab({ srim, beam }) {
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

function CurrentSweepTab({ srim, beam }) {
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

// ═══════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════

export default function App() {
  const [mode, setMode] = useState("implanter");
  const [subTab, setSubTab] = useState("dpa");
  const [srim, setSrim] = useState({ n: "", dpi: "", B: "", depthPeak: "" });
  const [beamImpl, setBeamImpl] = useState({
    current_nA: "200", chargeState: "1", slit_mm: "3", energy_keV: "200",
    useAngle: false, angle: "", useRaster: false, xRaster: "", yRaster: "",
  });
  const [beamTandem, setBeamTandem] = useState({
    current_nA: "275", chargeState: "2", slit_mm: "3", energy_keV: "3000",
    useAngle: false, angle: "", useRaster: false, xRaster: "", yRaster: "",
  });

  const beam = mode === "implanter" ? beamImpl : beamTandem;
  const setBeam = mode === "implanter" ? setBeamImpl : setBeamTandem;

  const subTabs = [
    { id: "dpa", label: "DPA → Fluence/Time" },
    { id: "time", label: "Time → DPA" },
    { id: "fluence", label: "Fluence → Time" },
    { id: "sweep", label: "Current Sweep" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 tracking-tight">Ion Irradiation Dose Calculator</h1>
            <p className="text-xs text-gray-500 mt-0.5">SRIM-based fluence, DPA, at%, and irradiation time planner</p>
          </div>
          {/* Mode toggle */}
          <div className="flex rounded-md overflow-hidden border border-gray-300">
            {[
              { id: "implanter", label: "Implanter" },
              { id: "tandem", label: "Tandem" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                  mode === t.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <SrimPanel srim={srim} setSrim={setSrim} />
        <BeamPanel beam={beam} setBeam={setBeam} mode={mode} />

        {/* Sub tabs */}
        <div className="flex gap-0 border-b border-gray-200 bg-white rounded-t px-1 pt-1">
          {subTabs.map((t) => (
            <button key={t.id} className={subTab === t.id ? tabActive : tabInactive} onClick={() => setSubTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Calculator content */}
        <div className="bg-white border border-gray-200 border-t-0 rounded-b p-5 -mt-4">
          {subTab === "dpa" && <DpaToFluenceTab srim={srim} beam={beam} />}
          {subTab === "time" && <TimeToDpaTab srim={srim} beam={beam} />}
          {subTab === "fluence" && <FluenceToTimeTab srim={srim} beam={beam} />}
          {subTab === "sweep" && <CurrentSweepTab srim={srim} beam={beam} />}
        </div>

        <ReferenceSection />

        <p className="text-center text-xs text-gray-400 pt-2 pb-4">
          Formulas validated against Implanter & Tandem compute notebooks · Angle/raster logic from dose calculator spreadsheet
        </p>
      </div>
    </div>
  );
}
