import { useState, useEffect } from "react";
import { tabActive, tabInactive } from "./lib/styles";
import SrimPanel from "./components/SrimPanel";
import BeamPanel from "./components/BeamPanel";
import ReferenceSection from "./components/ReferenceSection";
import { DpaToFluenceTab, TimeToDpaTab, FluenceToTimeTab, CurrentSweepTab } from "./components/tabs";

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
  const [profiles, setProfiles] = useState({ vacancy: null, range: null });
  const [srimMeta, setSrimMeta] = useState(null);
  const [dark, setDark] = useState(() => localStorage.getItem("ibis-theme") === "dark");
  const [chartStyle, setChartStyle] = useState(() => localStorage.getItem("ibis-chart-style") || "aps");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ibis-theme", dark ? "dark" : "light");
  }, [dark]);

  // If switching to tandem while on sweep tab, go back to dpa
  useEffect(() => {
    if (mode === "tandem" && subTab === "sweep") setSubTab("dpa");
  }, [mode, subTab]);

  const beam = mode === "implanter" ? beamImpl : beamTandem;
  const setBeam = mode === "implanter" ? setBeamImpl : setBeamTandem;

  const subTabs = [
    { id: "dpa", label: "DPA → Fluence/Time" },
    { id: "time", label: "Time → DPA" },
    { id: "fluence", label: "Fluence → Time" },
    ...(mode === "implanter" ? [{ id: "sweep", label: "Current Sweep" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 border-b border-gray-200/80 dark:border-gray-700/80 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50/50 dark:to-black/10 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* UTK Power T + TIBML */}
            <div className="flex flex-col items-center flex-shrink-0">
              <svg viewBox="0 0 40 40" className="w-16 h-16" aria-label="University of Tennessee">
                <rect width="40" height="40" rx="2" fill="#FF8200" />
                <path d="M8 7 h24 v5 h-3 v-2 h-7 v18 h3 v2 h4 v3 h-18 v-3 h4 v-2 h3 v-18 h-7 v2 h-3 z" fill="#fff" />
              </svg>
              <span className="text-xs font-bold tracking-[0.15em] text-gray-500 dark:text-gray-300 mt-1" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>TIBML</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">IBIS — Ion Beam Irradiation Simulator</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">SRIM-based fluence, DPA, at%, and irradiation time planner</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="p-1.5 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M10 2a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 2zM10 15a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 15zM10 7a3 3 0 100 6 3 3 0 000-6zM15.657 5.404a.75.75 0 10-1.06-1.06l-1.061 1.06a.75.75 0 001.06 1.06l1.06-1.06zM6.464 14.596a.75.75 0 10-1.06-1.06l-1.06 1.06a.75.75 0 001.06 1.06l1.06-1.06zM18 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 0118 10zM5 10a.75.75 0 01-.75.75h-1.5a.75.75 0 010-1.5h1.5A.75.75 0 015 10zM14.596 15.657a.75.75 0 001.06-1.06l-1.06-1.061a.75.75 0 10-1.06 1.06l1.06 1.06zM5.404 6.464a.75.75 0 001.06-1.06l-1.06-1.06a.75.75 0 10-1.06 1.06l1.06 1.06z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 01.26.77 7 7 0 009.958 7.967.75.75 0 011.067.853A8.5 8.5 0 116.647 1.921a.75.75 0 01.808.083z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            {/* Mode toggle */}
            <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
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
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <SrimPanel srim={srim} setSrim={setSrim} setProfiles={setProfiles} setSrimMeta={setSrimMeta} profiles={profiles} srimMeta={srimMeta} dark={dark} chartStyle={chartStyle} setChartStyle={setChartStyle} />
        <BeamPanel beam={beam} setBeam={setBeam} mode={mode} />

        {/* Sub tabs */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t shadow-sm px-1 pt-1">
          {subTabs.map((t) => (
            <button key={t.id} className={subTab === t.id ? tabActive : tabInactive} onClick={() => setSubTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Calculator content */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 border-t-0 rounded-b shadow-sm p-5 -mt-4">
          {subTab === "dpa" && <DpaToFluenceTab srim={srim} beam={beam} />}
          {subTab === "time" && <TimeToDpaTab srim={srim} beam={beam} />}
          {subTab === "fluence" && <FluenceToTimeTab srim={srim} beam={beam} />}
          {subTab === "sweep" && mode === "implanter" && <CurrentSweepTab srim={srim} beam={beam} />}
        </div>

        <ReferenceSection />

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-2 pb-4">
          Formulas validated against Implanter & Tandem compute notebooks · Angle/raster logic from dose calculator spreadsheet
        </p>
      </div>
    </div>
  );
}
