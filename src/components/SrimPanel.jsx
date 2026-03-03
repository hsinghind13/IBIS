import { useState, useCallback } from "react";
import { parseAtomicDensity, parseDPIPeak, parseBPeak, parseSrimMetadata, parseVacancyProfile, parseRangeProfile, parseTargetComposition } from "../lib/parsers";
import { Field } from "./shared";
import { VacancyChart, DepthProfileChart, JOURNAL_STYLES } from "./charts";

const DEFAULT_SCALE_PHI = 1e16;

const srimTabActive = "px-3 py-1.5 text-xs font-semibold border-b-2 border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-400 cursor-pointer";
const srimTabInactive = "px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer border-b-2 border-transparent";

export default function SrimPanel({ srim, setSrim, setProfiles, setSrimMeta, profiles, srimMeta, dark, chartStyle, setChartStyle }) {
  const [parsedMeta, setParsedMeta] = useState(null);
  const [composition, setComposition] = useState(null);
  const [chartView, setChartView] = useState("vacancy");

  const isSrimFile = (name) => {
    const upper = name.toUpperCase();
    return upper.includes("E2RECOIL") || upper.includes("VACANCY") || upper.includes("RANGE");
  };

  const processFiles = useCallback((files) => {
    const relevant = files.filter((f) => isSrimFile(f.name));
    if (!relevant.length) return;
    let newSrim = { ...srim };

    const readFile = (file) =>
      new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, text: reader.result });
        reader.readAsText(file, "latin1");
      });

    Promise.all(relevant.map(readFile)).then((results) => {
      let metaInfo = null;
      let vacancyProfile = null;
      let rangeProfile = null;
      let comp = null;
      let directN = null;

      for (const { name, text } of results) {
        const upper = name.toUpperCase();
        if (upper.includes("E2RECOIL")) {
          directN = parseAtomicDensity(text);
          comp = comp || parseTargetComposition(text);
          metaInfo = metaInfo || parseSrimMetadata(text);
        }
        if (upper.includes("VACANCY")) {
          const dpi = parseDPIPeak(text);
          if (dpi) newSrim.dpi = dpi;
          vacancyProfile = parseVacancyProfile(text);
          comp = comp || parseTargetComposition(text);
          metaInfo = metaInfo || parseSrimMetadata(text);
        }
        if (upper.includes("RANGE")) {
          const { B, depth } = parseBPeak(text);
          if (B) { newSrim.B = B; newSrim.depthPeak = depth; }
          rangeProfile = parseRangeProfile(text);
          comp = comp || parseTargetComposition(text);
          metaInfo = metaInfo || parseSrimMetadata(text);
        }
      }

      // Atomic density: prefer composition-based, fall back to direct
      if (comp?.calculatedN) {
        newSrim.n = comp.calculatedN.toExponential(4);
      } else if (directN) {
        newSrim.n = directN.toExponential(4);
      }

      setComposition(comp);
      setSrim(newSrim);
      setParsedMeta(metaInfo);
      setSrimMeta(metaInfo);
      setProfiles({ vacancy: vacancyProfile, range: rangeProfile });
    });
  }, [srim, setSrim, setProfiles, setSrimMeta]);

  const collectDropEntries = (dataTransfer) => {
    const items = dataTransfer.items;
    if (!items) return Promise.resolve(Array.from(dataTransfer.files));

    const readEntries = (dirReader) =>
      new Promise((resolve) => {
        const all = [];
        const read = () =>
          dirReader.readEntries((entries) => {
            if (!entries.length) return resolve(all);
            all.push(...entries);
            read();
          });
        read();
      });

    const traverse = (entry) => {
      if (entry.isFile) return new Promise((r) => entry.file((f) => r([f])));
      if (entry.isDirectory) {
        return readEntries(entry.createReader()).then((entries) =>
          Promise.all(entries.map(traverse)).then((arrs) => arrs.flat())
        );
      }
      return Promise.resolve([]);
    };

    const entries = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }
    if (!entries.length) return Promise.resolve(Array.from(dataTransfer.files));
    return Promise.all(entries.map(traverse)).then((arrs) => arrs.flat());
  };

  const hasVacancy = !!profiles?.vacancy;
  const hasDepth = !!profiles?.vacancy && !!profiles?.range && !!srim.n;
  const hasAnyChart = hasVacancy || hasDepth;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SRIM Parameters</h3>
        {parsedMeta?.ion && (
          <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded font-mono">
            {parsedMeta.energy_keV >= 1000 ? `${parsedMeta.energy_keV / 1000} MeV` : `${parsedMeta.energy_keV} keV`}{" "}
            {parsedMeta.ion} → {parsedMeta.target}
          </span>
        )}
      </div>

      <div
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center text-gray-500 dark:text-gray-400 text-sm cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-all"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); collectDropEntries(e.dataTransfer).then(processFiles); }}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file"; input.multiple = true; input.accept = ".txt";
          input.setAttribute("webkitdirectory", "");
          input.onchange = () => processFiles(Array.from(input.files));
          input.click();
        }}
      >
        Drop SRIM folder or files here, or click to browse folder
        <span className="block text-xs text-gray-400 dark:text-gray-500 mt-0.5">Auto-finds VACANCY.txt · RANGE.txt · E2RECOIL.txt</span>
      </div>

      {/* Parameter fields with source descriptions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Field label="Atomic density (n)" unit="atoms/cm³" value={srim.n} onChange={(v) => setSrim({ ...srim, n: v })} />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {composition?.calculatedN
              ? `ρ·Nₐ/M_avg from E2RECOIL.txt`
              : "From E2RECOIL.txt header"}
          </p>
        </div>
        <div>
          <Field label="DPI" unit="vac/(Å·ion)" value={srim.dpi} onChange={(v) => setSrim({ ...srim, dpi: v })} />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Peak(ions+recoils) from VACANCY.txt</p>
        </div>
        <div>
          <Field label="B peak" unit="1/cm" value={srim.B} onChange={(v) => setSrim({ ...srim, B: v })} />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Peak ion distribution from RANGE.txt</p>
        </div>
        <div>
          <Field label="Depth at peak" unit="Å" value={srim.depthPeak} onChange={(v) => setSrim({ ...srim, depthPeak: v })} />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Depth of B peak from RANGE.txt</p>
        </div>
      </div>

      {/* Atomic density derivation */}
      {composition?.calculatedN && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 font-mono">
          <span className="font-semibold">n = ρ × Nₐ / M_avg</span>
          <span className="mx-2">|</span>
          ρ = {composition.massDensity?.toFixed(4)} g/cm³
          <span className="mx-2">|</span>
          {composition.elements.map((e) => `${e.symbol} ${e.atomicPct}%`).join(", ")}
          <span className="mx-2">→</span>
          n = {composition.calculatedN.toExponential(4)} atoms/cm³
        </div>
      )}

      {/* Chart toggle: Vacancy Profile / Depth Profile */}
      {hasAnyChart && (
        <div className="border border-gray-200 dark:border-gray-700 rounded">
          <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-1 pt-1">
            <div className="flex gap-0 flex-1">
              {hasVacancy && (
                <button
                  className={chartView === "vacancy" ? srimTabActive : srimTabInactive}
                  onClick={() => setChartView("vacancy")}
                >
                  Vacancy Profile
                </button>
              )}
              {hasDepth && (
                <button
                  className={chartView === "depth" ? srimTabActive : srimTabInactive}
                  onClick={() => setChartView("depth")}
                >
                  Atomic Conc.
                </button>
              )}
            </div>
            <select
              value={chartStyle}
              onChange={(e) => { setChartStyle(e.target.value); localStorage.setItem("ibis-chart-style", e.target.value); }}
              className="text-[11px] mr-1 mb-0.5 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {Object.entries(JOURNAL_STYLES).map(([key, s]) => (
                <option key={key} value={key}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="p-4">
            {chartView === "vacancy" && hasVacancy && (
              <VacancyChart vacancy={profiles.vacancy} meta={srimMeta} dark={dark} journalStyle={chartStyle} />
            )}
            {chartView === "depth" && hasDepth && (
              <DepthProfileChart
                profiles={profiles}
                n={parseFloat(srim.n)}
                fluence={DEFAULT_SCALE_PHI}
                meta={srimMeta}
                dark={dark}
                journalStyle={chartStyle}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
