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
            {/* IBIS Atomic Emblem */}
            <div className="flex-shrink-0">
              <svg width="64" height="64" viewBox="0 0 300 300" fill="none" aria-label="IBIS mascot — ibis bird in atomic emblem">
                {/* Orbit behind badge */}
                <ellipse cx="150" cy="150" rx="142" ry="40" transform="rotate(-30 150 150)" stroke={dark ? "#56B4E9" : "#0072B2"} strokeWidth="3.5" opacity={dark ? "0.7" : "0.45"}/>
                {/* Badge fill + ring */}
                <circle cx="150" cy="150" r="120" fill={dark ? "#0f172a" : "white"} opacity={dark ? "0.92" : "0.94"}/>
                <circle cx="150" cy="150" r="120" fill="none" stroke="#FF8200" strokeWidth="5"/>
                {/* Orbits in front — these cross over the ring and are fully visible */}
                <ellipse cx="150" cy="150" rx="142" ry="40" transform="rotate(25 150 150)" stroke={dark ? "#56B4E9" : "#0072B2"} strokeWidth="3.5" opacity={dark ? "0.7" : "0.45"}/>
                <ellipse cx="150" cy="150" rx="142" ry="40" transform="rotate(-5 150 150)" stroke={dark ? "#56B4E9" : "#0072B2"} strokeWidth="2.5" opacity={dark ? "0.5" : "0.3"}/>
                {/* Electron dots on orbit paths */}
                <circle cx="14" cy="125" r="7" fill={dark ? "#56B4E9" : "#0072B2"} opacity={dark ? "0.8" : "0.5"}/>
                <circle cx="286" cy="172" r="7" fill={dark ? "#56B4E9" : "#0072B2"} opacity={dark ? "0.8" : "0.5"}/>
                <circle cx="195" cy="290" r="6" fill={dark ? "#56B4E9" : "#0072B2"} opacity={dark ? "0.65" : "0.4"}/>
                <g transform="translate(82, 55)">
                  <path d="M 60 82 Q 86 58, 92 76 Q 100 96, 86 122 Q 70 142, 44 138 Q 18 133, 12 114 Q 6 96, 24 82 Q 38 72, 60 82 Z" fill="#FF8200"/>
                  {/* Elegant trailing wing */}
                  <path d="M 48 84 Q 28 72, 5 68 Q -15 66, -35 74 Q -15 70, 8 74 Q 28 78, 46 84 Z" fill="#FF8200"/>
                  <path d="M 5 68 Q -20 60, -45 62 Q -55 64, -60 72 Q -48 66, -30 68 Q -10 70, 8 74 Z" fill="#E5750A"/>
                  <path d="M 0 72 Q -25 65, -50 68 Q -62 72, -65 80 Q -52 74, -35 72 Q -12 72, 4 76 Z" fill="#D97706"/>
                  <path d="M -5 76 Q -28 72, -52 76 Q -64 80, -66 90 Q -54 82, -38 78 Q -16 76, 0 80 Z" fill="#E5750A"/>
                  <path d="M -8 82 Q -30 78, -50 84 Q -60 88, -62 96 Q -52 90, -36 86 Q -18 82, -4 84 Z" fill="#CC6A00"/>
                  <path d="M -60 72 Q -70 68, -76 72" stroke="#D97706" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <path d="M -65 80 Q -75 78, -80 82" stroke="#CC6A00" strokeWidth="2" strokeLinecap="round" fill="none"/>
                  <path d="M -66 90 Q -76 88, -80 92" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
                  {/* Tail */}
                  <path d="M 14 120 Q -2 142, -6 162" stroke="#E5750A" strokeWidth="6" strokeLinecap="round" fill="none"/>
                  <path d="M 74 74 C 82 48, 80 26, 72 10 C 70 4, 72 -4, 77 -10" fill="none" stroke="#FF8200" strokeWidth="24" strokeLinecap="round"/>
                  <ellipse cx="79" cy="-14" rx="21" ry="18" fill="#FF8200"/>
                  <circle cx="86" cy="-17" r="9" fill="white" stroke={dark ? "none" : "#d1d5db"} strokeWidth="0.5"/>
                  <circle cx="88" cy="-17" r="5.5" fill={dark ? "#0f172a" : "#1a1a2e"}/>
                  <circle cx="90" cy="-19.5" r="2" fill="white"/>
                  <path d="M 97 -10 Q 118 -24, 142 -10 Q 152 -2, 154 8 Q 154 14, 148 14 Q 140 4, 130 -2 Q 112 -10, 97 -3 Z" fill="#2d1b0e" stroke={dark ? "#8B5E3C" : "#5C3D2E"} strokeWidth="2.5"/>
                  <line x1="46" y1="134" x2="36" y2="170" stroke="#CC6A00" strokeWidth="8" strokeLinecap="round"/>
                  <line x1="64" y1="132" x2="56" y2="170" stroke="#CC6A00" strokeWidth="8" strokeLinecap="round"/>
                </g>
              </svg>
            </div>
            {/* UTK Power T + TIBML */}
            <div className="flex flex-col items-center flex-shrink-0">
              <svg viewBox="0 0 40 40" className="w-10 h-10" aria-label="University of Tennessee">
                <rect width="40" height="40" rx="2" fill="#FF8200" />
                <path d="M8 7 h24 v5 h-3 v-2 h-7 v18 h3 v2 h4 v3 h-18 v-3 h4 v-2 h3 v-18 h-7 v2 h-3 z" fill="#fff" />
              </svg>
              <span className="text-[10px] font-bold tracking-[0.15em] text-gray-500 dark:text-gray-300 mt-0.5" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>TIBML</span>
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

        <div className="flex justify-center pt-3 pb-1">
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLScmW5gQ5fPfRUkH5BBUYrkmfH8Y4NorO-LD2xOEKM7SS-ODcQ/viewform"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            Report a Bug
          </a>
        </div>
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-1 pb-4">
          Formulas validated against Implanter & Tandem compute notebooks · Angle/raster logic from dose calculator spreadsheet
        </p>
      </div>
    </div>
  );
}
