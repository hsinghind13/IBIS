import { useState, useRef, useCallback, useEffect } from "react";
import {
  ComposedChart, LineChart, Line, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

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
// Chart Download (SVG → Canvas → PNG)
// ═══════════════════════════════════════════════════
// legendItems: [{ label, color, dash, strokeWidth }]
// If not passed, legend is extracted from the DOM to match on-screen order.

function extractLegendFromDOM(containerEl) {
  const items = [];
  const legendEls = containerEl.querySelectorAll(".recharts-legend-item");
  legendEls.forEach(li => {
    const lineEl = li.querySelector("line");
    const spanEl = li.querySelector("span");
    if (spanEl) {
      items.push({
        label: spanEl.textContent,
        color: lineEl?.getAttribute("stroke") || spanEl.style.color || "#000",
        dash: lineEl?.getAttribute("stroke-dasharray") || "",
        strokeWidth: parseFloat(lineEl?.getAttribute("stroke-width")) || 1.5,
      });
    }
  });
  return items;
}

function downloadChartPng(containerEl, filename, bgColor, fontFamily, titleColor, legendItems, legendFontSize) {
  if (!containerEl) return;

  // Find the largest SVG (the recharts chart), skip tiny icon SVGs
  const allSvgs = containerEl.querySelectorAll("svg");
  let svg = null;
  let maxArea = 0;
  allSvgs.forEach(s => {
    const r = s.getBoundingClientRect();
    const area = r.width * r.height;
    if (area > maxArea) { maxArea = area; svg = s; }
  });
  if (!svg) return;

  const titleEl = containerEl.querySelector("[data-chart-title]");
  const captionEl = containerEl.querySelector("[data-chart-caption]");
  const titleText = titleEl?.textContent || "";
  const captionText = captionEl?.textContent || "";

  const rect = svg.getBoundingClientRect();
  const w = rect.width;
  const h = rect.height;

  const titleH = titleText ? 44 : 0;
  const captionH = captionText ? 28 : 0;
  const pad = 12;
  const totalH = titleH + h + captionH + pad;

  // Clone SVG and set explicit pixel dimensions + viewBox
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", w);
  clone.setAttribute("height", totalH);
  clone.setAttribute("viewBox", `0 0 ${w} ${totalH}`);

  // Inline computed styles on all text elements (fonts don't survive serialization)
  const origTexts = svg.querySelectorAll("text");
  const cloneTexts = clone.querySelectorAll("text");
  origTexts.forEach((orig, i) => {
    if (!cloneTexts[i]) return;
    const cs = window.getComputedStyle(orig);
    cloneTexts[i].setAttribute("font-family", cs.fontFamily);
    cloneTexts[i].setAttribute("font-size", cs.fontSize);
    cloneTexts[i].setAttribute("font-weight", cs.fontWeight);
  });

  const ns = "http://www.w3.org/2000/svg";

  // Wrap existing chart content in a <g> shifted down for title
  const g = document.createElementNS(ns, "g");
  g.setAttribute("transform", `translate(0, ${titleH})`);
  while (clone.firstChild) g.appendChild(clone.firstChild);

  // Background
  const bgRect = document.createElementNS(ns, "rect");
  bgRect.setAttribute("width", w);
  bgRect.setAttribute("height", totalH);
  bgRect.setAttribute("fill", bgColor);
  clone.appendChild(bgRect);

  // Title
  if (titleText) {
    const t = document.createElementNS(ns, "text");
    t.setAttribute("x", w / 2);
    t.setAttribute("y", 30);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("font-family", fontFamily);
    t.setAttribute("font-size", "20");
    t.setAttribute("font-weight", "bold");
    t.setAttribute("fill", titleColor || "#000");
    t.textContent = titleText;
    clone.appendChild(t);
  }

  // Chart content (after bg and title so it renders on top)
  clone.appendChild(g);

  // Legend — read from DOM to preserve on-screen order, fall back to passed items
  const resolvedLegend = extractLegendFromDOM(containerEl);
  const finalLegend = resolvedLegend.length ? resolvedLegend : legendItems;
  if (finalLegend && finalLegend.length) {
    const legendItemsRef = finalLegend;
    const fontSize = legendFontSize || 12;
    const lineLen = 24;
    const gap = 8;
    const itemSpacing = 16;

    // Measure total legend width to center it
    // Approximate: lineLen + gap + label char width + itemSpacing
    const charWidth = fontSize * 0.6;
    let totalLegendW = 0;
    legendItemsRef.forEach((item, i) => {
      totalLegendW += lineLen + gap + item.label.length * charWidth;
      if (i < legendItemsRef.length - 1) totalLegendW += itemSpacing;
    });

    const legendY = titleH + 18;
    let lx = (w - totalLegendW) / 2;
    const legendG = document.createElementNS(ns, "g");

    legendItemsRef.forEach((item, i) => {
      // Line sample
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", lx);
      line.setAttribute("y1", legendY);
      line.setAttribute("x2", lx + lineLen);
      line.setAttribute("y2", legendY);
      line.setAttribute("stroke", item.color);
      line.setAttribute("stroke-width", item.strokeWidth || 1.5);
      if (item.dash) line.setAttribute("stroke-dasharray", item.dash);
      legendG.appendChild(line);

      // Label
      const text = document.createElementNS(ns, "text");
      text.setAttribute("x", lx + lineLen + gap);
      text.setAttribute("y", legendY + fontSize * 0.35);
      text.setAttribute("font-family", fontFamily);
      text.setAttribute("font-size", fontSize);
      text.setAttribute("fill", titleColor || "#000");
      text.textContent = item.label;
      legendG.appendChild(text);

      lx += lineLen + gap + item.label.length * charWidth + itemSpacing;
    });

    clone.appendChild(legendG);
  }

  // Caption
  if (captionText) {
    const c = document.createElementNS(ns, "text");
    c.setAttribute("x", w - 16);
    c.setAttribute("y", totalH - 8);
    c.setAttribute("text-anchor", "end");
    c.setAttribute("font-family", fontFamily);
    c.setAttribute("font-size", "11");
    c.setAttribute("font-style", "italic");
    c.setAttribute("fill", titleColor || "#888");
    c.textContent = captionText;
    clone.appendChild(c);
  }

  // Serialize → Image → Canvas → PNG at 2x for retina
  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const scale = 2;
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = totalH * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, w, totalH);
    canvas.toBlob((pngBlob) => {
      const a = document.createElement("a");
      a.download = filename;
      a.href = URL.createObjectURL(pngBlob);
      a.click();
      URL.revokeObjectURL(a.href);
    }, "image/png");
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function downloadChartPdf(containerEl, filename, bgColor) {
  if (!containerEl) return;
  html2canvas(containerEl, {
    backgroundColor: bgColor,
    scale: 2,
    useCORS: true,
    logging: false,
  }).then((canvas) => {
    const imgData = canvas.toDataURL("image/png");
    const imgW = canvas.width;
    const imgH = canvas.height;
    const orientation = imgW > imgH ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "px", format: [imgW, imgH] });
    pdf.addImage(imgData, "PNG", 0, 0, imgW, imgH);
    pdf.save(filename);
  });
}

function DownloadButton({ onPng, onPdf, dark }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const itemCls = `w-full text-left px-3 py-1.5 text-xs transition-colors ${
    dark
      ? "text-gray-300 hover:bg-gray-700"
      : "text-gray-600 hover:bg-gray-100"
  }`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-1 text-xs rounded border transition-colors inline-flex items-center gap-1 ${
          dark
            ? "border-gray-600 text-gray-300 hover:bg-gray-700"
            : "border-gray-300 text-gray-600 hover:bg-gray-100"
        }`}
      >
        Download
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className={`absolute right-0 bottom-full mb-1 rounded border shadow-lg z-10 min-w-[120px] overflow-hidden ${
          dark ? "bg-gray-800 border-gray-600" : "bg-white border-gray-300"
        }`}>
          <button className={itemCls} onClick={() => { setOpen(false); onPng(); }}>PNG image</button>
          <button className={itemCls} onClick={() => { setOpen(false); onPdf(); }}>PDF document</button>
        </div>
      )}
    </div>
  );
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
    titleSize: 20, labelSize: 17, tickSize: 14, legendSize: 11,
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
    desc: "Helvetica, thin 0.8pt axes, open frame, Okabe-Ito colors",
    font: 'Helvetica, Arial, sans-serif',
    titleSize: 19, labelSize: 16, tickSize: 13, legendSize: 13,
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
    titleSize: 20, labelSize: 17, tickSize: 14, legendSize: 14,
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
    titleSize: 20, labelSize: 17, tickSize: 14, legendSize: 14,
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
    titleSize: 19, labelSize: 16, tickSize: 13, legendSize: 13,
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
    titleSize: 20, labelSize: 17, tickSize: 14, legendSize: 14,
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
  const chartRef = useRef(null);

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

  const handleDownload = useCallback(() => {
    const name = meta?.ion
      ? `vacancy_${meta.ion}_${meta.target}_${meta.energy_keV}keV_${journalStyle}.png`
      : `vacancy_profile_${journalStyle}.png`;
    const legend = [
      { label: "Total", color: c.total, dash: c.totalDash, strokeWidth: j.lineWidthBold },
      { label: "Recoils", color: c.recoils, dash: c.recoilsDash, strokeWidth: j.lineWidth },
      { label: "Ions", color: c.ions, dash: c.ionsDash, strokeWidth: j.lineWidth },
    ];
    downloadChartPng(chartRef.current, name, c.bg, j.font, c.axis, legend, j.legendSize);
  }, [c, j, meta, journalStyle]);

  return (
    <div>
      <div ref={chartRef}>
        {title && (
          <p data-chart-title style={{ fontFamily: j.font, fontSize: j.titleSize, fontWeight: "bold", color: c.axis, marginBottom: 8, textAlign: "center" }}>
            {title}
          </p>
        )}
        <div style={{ background: c.bg, padding: "12px 4px 4px 0" }}>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={trimmed} margin={{ top: 8, right: 24, left: 24, bottom: 48 }}>
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
                label={{ value: "Vacancies (vac/\u00c5\u00b7ion)", angle: -90, position: "center", dx: -20, style: { fill: c.axis, fontFamily: j.font, fontSize: j.labelSize, fontWeight: "bold", textAnchor: "middle" } }}
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
      <div className="flex justify-end mt-2">
        <DownloadButton
          onPng={handleDownload}
          onPdf={() => {
            const name = meta?.ion
              ? `vacancy_${meta.ion}_${meta.target}_${meta.energy_keV}keV_${journalStyle}.pdf`
              : `vacancy_profile_${journalStyle}.pdf`;
            downloadChartPdf(chartRef.current, name, c.bg);
          }}
          dark={dark}
        />
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
  const chartRef = useRef(null);

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

  const handleDownload = useCallback(() => {
    const name = meta?.ion
      ? `depth_profile_${meta.ion}_${meta.target}_${meta.energy_keV}keV_${journalStyle}.png`
      : `depth_profile_${journalStyle}.png`;
    const legend = [
      { label: "DPA", color: c.dpa, dash: c.dpaDash, strokeWidth: j.lineWidth },
      { label: "at%", color: c.atPct, dash: c.atDash, strokeWidth: j.lineWidth },
    ];
    downloadChartPng(chartRef.current, name, c.bg, j.font, c.axis, legend, j.legendSize);
  }, [c, j, meta, journalStyle]);

  return (
    <div>
      <div ref={chartRef}>
        {title && (
          <p data-chart-title style={{ fontFamily: j.font, fontSize: j.titleSize, fontWeight: "bold", color: c.axis, marginBottom: 8, textAlign: "center" }}>
            {title}
          </p>
        )}
        <div style={{ background: c.bg, padding: "12px 4px 4px 0" }}>
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={trimmed} margin={{ top: 8, right: 24, left: 24, bottom: 48 }}>
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
                label={{ value: "DPA", angle: -90, position: "center", dx: -20, style: { fill: c.dpa, fontFamily: j.font, fontSize: j.labelSize + 1, fontWeight: "bold", textAnchor: "middle" } }}
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
                label={{ value: "at%", angle: 90, position: "center", dx: 20, style: { fill: c.atPct, fontFamily: j.font, fontSize: j.labelSize + 1, fontWeight: "bold", textAnchor: "middle" } }}
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
        <p data-chart-caption style={{ fontFamily: j.font, fontSize: 10, fontStyle: "italic", color: c.recoils, paddingLeft: 8, marginTop: 8 }}>
          Scaled to {fluence.toExponential(2)} ions/cm²
        </p>
      </div>
      <div className="flex justify-end mt-2">
        <DownloadButton
          onPng={handleDownload}
          onPdf={() => {
            const name = meta?.ion
              ? `depth_profile_${meta.ion}_${meta.target}_${meta.energy_keV}keV_${journalStyle}.pdf`
              : `depth_profile_${journalStyle}.pdf`;
            downloadChartPdf(chartRef.current, name, c.bg);
          }}
          dark={dark}
        />
      </div>
    </div>
  );
}
