import {
  ComposedChart, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ═══════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════

export function trimXDomain(depthArrays, valueArrays, tailFrac = 0.01, padFrac = 0.05) {
  let maxDepth = 0;
  for (let v = 0; v < valueArrays.length; v++) {
    const vals = valueArrays[v];
    const depths = depthArrays[v];
    const peak = Math.max(...vals);
    if (peak <= 0) continue;
    const threshold = peak * tailFrac;
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i] > threshold) {
        if (depths[i] > maxDepth) maxDepth = depths[i];
        break;
      }
    }
  }
  return maxDepth * (1 + padFrac);
}

export function mergeProfileData(profiles, n, fluence) {
  if (!profiles?.vacancy || !profiles?.range || !n || !fluence) return null;
  const { vacancy, range } = profiles;
  const len = Math.min(vacancy.depth_A.length, range.depth_A.length);
  if (!len) return null;
  const data = [];
  for (let i = 0; i < len; i++) {
    const depth_um = vacancy.depth_A[i] / 1e4;
    const totalVac = vacancy.vac_ions[i] + vacancy.vac_recoils[i];
    const dpa = (fluence * totalVac * 1e8) / n;
    const C = fluence * range.B_per_cm[i];
    const atPct = (C / (n + C)) * 100;
    data.push({ depth_um, dpa, atPct });
  }
  return data;
}

function fmtTick(v) {
  if (v === 0) return "0";
  if (Math.abs(v) >= 1e4 || (Math.abs(v) < 0.01 && v !== 0)) return v.toExponential(1);
  if (Math.abs(v) < 1) return v.toPrecision(2);
  return v.toFixed(1);
}

function fmtEnergy(keV) {
  return keV >= 1000 ? `${keV / 1000} MeV` : `${keV} keV`;
}

// ═══════════════════════════════════════════════════
// Journal Style Definitions
// ═══════════════════════════════════════════════════
// Okabe-Ito colorblind-safe palette (Nature-recommended)
const OI = {
  blue: "#0072B2", skyblue: "#56B4E9", green: "#009E73",
  vermillion: "#D55E00", orange: "#E69F00", purple: "#CC79A7",
};

export const JOURNAL_STYLES = {
  aps: {
    label: "APS (Phys. Rev.)",
    desc: "Helvetica, no grid, 1.2pt axes, ticks inward, units in parentheses",
    font: 'Helvetica, Arial, sans-serif',
    titleSize: 15, labelSize: 13, tickSize: 11, legendSize: 11,
    axisWidth: 1.2, lineWidth: 1.5, lineWidthBold: 1.8,
    grid: false,
    light: {
      bg: "#ffffff", axis: "#000", tick: "#000", tooltipBg: "#fff", tooltipBorder: "#ccc",
      total: "#000", recoils: "#555", ions: OI.blue,
      dpa: OI.blue, atPct: OI.vermillion,
      totalDash: "", recoilsDash: "8 4", ionsDash: "",
      dpaDash: "", atDash: "8 4",
    },
    dark: {
      bg: "#111827", axis: "#d1d5db", tick: "#d1d5db", tooltipBg: "#1f2937", tooltipBorder: "#4b5563",
      total: "#f3f4f6", recoils: "#9ca3af", ions: "#60a5fa",
      dpa: "#60a5fa", atPct: "#f87171",
      totalDash: "", recoilsDash: "8 4", ionsDash: "",
      dpaDash: "", atDash: "8 4",
    },
  },
  nature: {
    label: "Nature",
    desc: "Helvetica 5-7pt, thin 0.8pt axes, open frame, Okabe-Ito colors",
    font: 'Helvetica, Arial, sans-serif',
    titleSize: 14, labelSize: 12, tickSize: 10, legendSize: 10,
    axisWidth: 0.8, lineWidth: 1.2, lineWidthBold: 1.5,
    grid: false,
    light: {
      bg: "#ffffff", axis: "#333", tick: "#333", tooltipBg: "#fff", tooltipBorder: "#ddd",
      total: OI.vermillion, recoils: "#8c8c8c", ions: OI.skyblue,
      dpa: OI.blue, atPct: OI.vermillion,
      totalDash: "", recoilsDash: "6 3", ionsDash: "",
      dpaDash: "", atDash: "6 3",
    },
    dark: {
      bg: "#111827", axis: "#d1d5db", tick: "#d1d5db", tooltipBg: "#1f2937", tooltipBorder: "#4b5563",
      total: "#fb923c", recoils: "#9ca3af", ions: "#7dd3fc",
      dpa: "#7dd3fc", atPct: "#fb923c",
      totalDash: "", recoilsDash: "6 3", ionsDash: "",
      dpaDash: "", atDash: "6 3",
    },
  },
  science: {
    label: "Science (AAAS)",
    desc: "Times New Roman, B&W with dash patterns, box frame, 1pt lines",
    font: '"Times New Roman", Georgia, serif',
    titleSize: 15, labelSize: 13, tickSize: 11, legendSize: 11,
    axisWidth: 1.0, lineWidth: 1.2, lineWidthBold: 1.5,
    grid: false,
    light: {
      bg: "#ffffff", axis: "#000", tick: "#000", tooltipBg: "#fff", tooltipBorder: "#ccc",
      total: "#000", recoils: "#000", ions: "#000",
      dpa: OI.blue, atPct: OI.vermillion,
      totalDash: "", recoilsDash: "8 4", ionsDash: "2 2",
      dpaDash: "", atDash: "8 4",
    },
    dark: {
      bg: "#111827", axis: "#d1d5db", tick: "#d1d5db", tooltipBg: "#1f2937", tooltipBorder: "#4b5563",
      total: "#f3f4f6", recoils: "#f3f4f6", ions: "#f3f4f6",
      dpa: "#60a5fa", atPct: "#f87171",
      totalDash: "", recoilsDash: "8 4", ionsDash: "2 2",
      dpaDash: "", atDash: "8 4",
    },
  },
  elsevier: {
    label: "Elsevier (Acta Mat.)",
    desc: "Arial, light gray grid, 1.8pt colored lines, Okabe-Ito palette",
    font: 'Arial, Helvetica, sans-serif',
    titleSize: 15, labelSize: 13, tickSize: 11, legendSize: 11,
    axisWidth: 1.0, lineWidth: 1.8, lineWidthBold: 2.0,
    grid: true, gridColor: { light: "#e8e8e8", dark: "#2a2a4a" }, gridWidth: 0.6,
    light: {
      bg: "#ffffff", axis: "#333", tick: "#333", tooltipBg: "#fff", tooltipBorder: "#ddd",
      total: OI.vermillion, recoils: OI.green, ions: OI.blue,
      dpa: OI.blue, atPct: OI.vermillion,
      totalDash: "", recoilsDash: "8 4", ionsDash: "",
      dpaDash: "", atDash: "8 4",
    },
    dark: {
      bg: "#111827", axis: "#d1d5db", tick: "#d1d5db", tooltipBg: "#1f2937", tooltipBorder: "#4b5563",
      total: "#fb923c", recoils: "#34d399", ions: "#60a5fa",
      dpa: "#60a5fa", atPct: "#fb923c",
      totalDash: "", recoilsDash: "8 4", ionsDash: "",
      dpaDash: "", atDash: "8 4",
    },
  },
  ieee: {
    label: "IEEE",
    desc: "Times New Roman, B&W readable, 0.8pt axes, dash+marker differentiation",
    font: '"Times New Roman", Georgia, serif',
    titleSize: 14, labelSize: 12, tickSize: 10, legendSize: 10,
    axisWidth: 0.8, lineWidth: 1.0, lineWidthBold: 1.2,
    grid: false,
    light: {
      bg: "#ffffff", axis: "#000", tick: "#000", tooltipBg: "#fff", tooltipBorder: "#ccc",
      total: "#000", recoils: "#666", ions: "#000",
      dpa: "#000", atPct: "#666",
      totalDash: "", recoilsDash: "6 3", ionsDash: "2 2",
      dpaDash: "", atDash: "6 3",
    },
    dark: {
      bg: "#111827", axis: "#d1d5db", tick: "#d1d5db", tooltipBg: "#1f2937", tooltipBorder: "#4b5563",
      total: "#f3f4f6", recoils: "#9ca3af", ions: "#f3f4f6",
      dpa: "#f3f4f6", atPct: "#9ca3af",
      totalDash: "", recoilsDash: "6 3", ionsDash: "2 2",
      dpaDash: "", atDash: "6 3",
    },
  },
  springer: {
    label: "Springer (JMR)",
    desc: "Arial, bold 1.5pt axes, no grid, Okabe-Ito blue/orange/green",
    font: 'Arial, Helvetica, sans-serif',
    titleSize: 15, labelSize: 13, tickSize: 11, legendSize: 11,
    axisWidth: 1.5, lineWidth: 1.8, lineWidthBold: 2.0,
    grid: false,
    light: {
      bg: "#ffffff", axis: "#000", tick: "#000", tooltipBg: "#fff", tooltipBorder: "#ccc",
      total: OI.blue, recoils: OI.orange, ions: OI.green,
      dpa: OI.blue, atPct: OI.vermillion,
      totalDash: "", recoilsDash: "8 4", ionsDash: "",
      dpaDash: "", atDash: "8 4",
    },
    dark: {
      bg: "#111827", axis: "#d1d5db", tick: "#d1d5db", tooltipBg: "#1f2937", tooltipBorder: "#4b5563",
      total: "#60a5fa", recoils: "#fbbf24", ions: "#34d399",
      dpa: "#60a5fa", atPct: "#fb923c",
      totalDash: "", recoilsDash: "8 4", ionsDash: "",
      dpaDash: "", atDash: "8 4",
    },
  },
};

export const DEFAULT_JOURNAL = "aps";

function getStyle(journalStyle, dark) {
  const j = JOURNAL_STYLES[journalStyle] || JOURNAL_STYLES[DEFAULT_JOURNAL];
  const c = dark ? j.dark : j.light;
  const gc = j.grid ? (dark ? j.gridColor.dark : j.gridColor.light) : undefined;
  return { j, c, gc };
}

// ═══════════════════════════════════════════════════
// Vacancy Profile
// ═══════════════════════════════════════════════════
export function VacancyChart({ vacancy, meta, dark, journalStyle = DEFAULT_JOURNAL }) {
  if (!vacancy) return null;
  const { j, c, gc } = getStyle(journalStyle, dark);

  const data = vacancy.depth_A.map((d, i) => ({
    depth_um: d / 1e4,
    ions: vacancy.vac_ions[i],
    recoils: vacancy.vac_recoils[i],
    total: vacancy.vac_ions[i] + vacancy.vac_recoils[i],
  }));

  const trimDepth = trimXDomain(
    [data.map((d) => d.depth_um), data.map((d) => d.depth_um), data.map((d) => d.depth_um)],
    [data.map((d) => d.ions), data.map((d) => d.recoils), data.map((d) => d.total)]
  );
  const trimmed = data.filter((d) => d.depth_um <= trimDepth);

  const title = meta?.ion
    ? `${fmtEnergy(meta.energy_keV)} ${meta.ion} \u2192 ${meta.target}: Vacancy Profile`
    : null;

  return (
    <div>
      {title && (
        <p style={{ fontFamily: j.font, fontSize: j.titleSize, fontWeight: "bold", color: c.axis, marginBottom: 8, textAlign: "center" }}>
          {title}
        </p>
      )}
      <div style={{ background: c.bg, padding: "12px 4px 4px 0" }}>
        <ResponsiveContainer width="100%" height={380}>
          <LineChart data={trimmed} margin={{ top: 8, right: 24, left: 16, bottom: 48 }}>
            <XAxis
              dataKey="depth_um"
              stroke={c.axis}
              strokeWidth={j.axisWidth}
              tick={{ fill: c.tick, fontFamily: j.font, fontSize: j.tickSize }}
              tickLine={{ stroke: c.axis, strokeWidth: j.axisWidth * 0.7 }}
              tickFormatter={fmtTick}
              label={{ value: "Depth (\u00b5m)", position: "bottom", offset: 4, style: { fill: c.axis, fontFamily: j.font, fontSize: j.labelSize, fontWeight: "bold" } }}
            />
            <YAxis
              stroke={c.axis}
              strokeWidth={j.axisWidth}
              tick={{ fill: c.tick, fontFamily: j.font, fontSize: j.tickSize }}
              tickLine={{ stroke: c.axis, strokeWidth: j.axisWidth * 0.7 }}
              tickFormatter={fmtTick}
              label={{ value: "Vacancies (vac/\u00c5\u00b7ion)", angle: -90, position: "insideLeft", offset: 4, style: { fill: c.axis, fontFamily: j.font, fontSize: j.labelSize, fontWeight: "bold" } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 0, fontFamily: j.font, fontSize: j.tickSize, color: c.tick }}
              labelFormatter={(v) => `Depth: ${fmtTick(v)} \u00b5m`}
              formatter={(value, name) => [fmtTick(value), name]}
            />
            <Legend wrapperStyle={{ fontFamily: j.font, fontSize: j.legendSize }} verticalAlign="top" iconType="plainline" iconSize={20} />
            <Line type="monotone" dataKey="total" name="Total" stroke={c.total} dot={false} strokeWidth={j.lineWidthBold} strokeDasharray={c.totalDash || undefined} />
            <Line type="monotone" dataKey="recoils" name="Recoils" stroke={c.recoils} dot={false} strokeWidth={j.lineWidth} strokeDasharray={c.recoilsDash || undefined} />
            <Line type="monotone" dataKey="ions" name="Ions" stroke={c.ions} dot={false} strokeWidth={j.lineWidth} strokeDasharray={c.ionsDash || undefined} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Depth Profile (DPA + at%)
// ═══════════════════════════════════════════════════
export function DepthProfileChart({ profiles, n, fluence, meta, dark, journalStyle = DEFAULT_JOURNAL }) {
  const data = mergeProfileData(profiles, n, fluence);
  if (!data || !data.length) return null;
  const { j, c, gc } = getStyle(journalStyle, dark);

  const maxDpa = Math.max(...data.map((d) => d.dpa));
  const maxAt = Math.max(...data.map((d) => d.atPct));
  const trimDepth = trimXDomain(
    [data.map((d) => d.depth_um), data.map((d) => d.depth_um)],
    [data.map((d) => d.dpa), data.map((d) => d.atPct)]
  );
  const trimmed = data.filter((d) => d.depth_um <= trimDepth);

  const title = meta?.ion
    ? `${fmtEnergy(meta.energy_keV)} ${meta.ion} \u2192 ${meta.target}: DPA & Atomic Concentration`
    : null;

  return (
    <div>
      {title && (
        <p style={{ fontFamily: j.font, fontSize: j.titleSize, fontWeight: "bold", color: c.axis, marginBottom: 8, textAlign: "center" }}>
          {title}
        </p>
      )}
      <div style={{ background: c.bg, padding: "12px 4px 4px 0" }}>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={trimmed} margin={{ top: 8, right: 16, left: 16, bottom: 48 }}>
            <XAxis
              dataKey="depth_um"
              stroke={c.axis}
              strokeWidth={j.axisWidth}
              tick={{ fill: c.tick, fontFamily: j.font, fontSize: j.tickSize }}
              tickLine={{ stroke: c.axis, strokeWidth: j.axisWidth * 0.7 }}
              tickFormatter={fmtTick}
              label={{ value: "Depth (\u00b5m)", position: "bottom", offset: 4, style: { fill: c.axis, fontFamily: j.font, fontSize: j.labelSize, fontWeight: "bold" } }}
            />
            <YAxis
              yAxisId="left"
              stroke={c.dpa}
              strokeWidth={j.axisWidth}
              tick={{ fill: c.dpa, fontFamily: j.font, fontSize: j.tickSize }}
              tickLine={{ stroke: c.dpa, strokeWidth: j.axisWidth * 0.7 }}
              tickFormatter={fmtTick}
              domain={[0, maxDpa * 1.05]}
              label={{ value: "DPA", angle: -90, position: "insideLeft", offset: 8, style: { fill: c.dpa, fontFamily: j.font, fontSize: j.labelSize + 1, fontWeight: "bold" } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke={c.atPct}
              strokeWidth={j.axisWidth}
              tick={{ fill: c.atPct, fontFamily: j.font, fontSize: j.tickSize }}
              tickLine={{ stroke: c.atPct, strokeWidth: j.axisWidth * 0.7 }}
              tickFormatter={fmtTick}
              domain={[0, maxAt * 1.05]}
              label={{ value: "at%", angle: 90, position: "insideRight", offset: 8, style: { fill: c.atPct, fontFamily: j.font, fontSize: j.labelSize + 1, fontWeight: "bold" } }}
            />
            <Tooltip
              contentStyle={{ backgroundColor: c.tooltipBg, border: `1px solid ${c.tooltipBorder}`, borderRadius: 0, fontFamily: j.font, fontSize: j.tickSize, color: c.tick }}
              labelFormatter={(v) => `Depth: ${fmtTick(v)} \u00b5m`}
              formatter={(value, name) => [fmtTick(value), name]}
            />
            <Legend wrapperStyle={{ fontFamily: j.font, fontSize: j.legendSize }} verticalAlign="top" iconType="plainline" iconSize={20} />
            <Line yAxisId="left" type="monotone" dataKey="dpa" name="DPA" stroke={c.dpa} dot={false} strokeWidth={j.lineWidth} strokeDasharray={c.dpaDash || undefined} />
            <Line yAxisId="right" type="monotone" dataKey="atPct" name="at%" stroke={c.atPct} dot={false} strokeWidth={j.lineWidth} strokeDasharray={c.atDash || undefined} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontFamily: j.font, fontSize: 10, fontStyle: "italic", color: c.recoils, marginTop: 4, textAlign: "right", paddingRight: 8 }}>
        Scaled to {fluence.toExponential(2)} ions/cm²
      </p>
    </div>
  );
}

