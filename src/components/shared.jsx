import { useState } from "react";
import { inputCls, labelCls, btnSecondary } from "../lib/styles";

export function Field({ label, value, onChange, unit, placeholder, disabled }) {
  return (
    <div>
      <label className={labelCls}>
        {label} {unit && <span className="text-gray-400 dark:text-gray-500 normal-case font-normal">({unit})</span>}
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

export function ResultsTable({ columns, rows, title }) {
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
        {title && <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</h3>}
        <div className="flex gap-2">
          <button onClick={copyToClipboard} className={btnSecondary}>
            {copied ? "✓ Copied" : "Copy"}
          </button>
          <button onClick={downloadCSV} className={btnSecondary}>
            ↓ CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              {columns.map((c) => (
                <th key={c} className="px-3 py-2 text-left font-semibold text-gray-600 dark:text-gray-300 whitespace-nowrap border-b border-gray-200 dark:border-gray-700 text-xs tracking-wide">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`${i % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/50"} hover:bg-blue-50/30 dark:hover:bg-blue-900/20`}>
                {columns.map((c) => (
                  <td key={c} className="px-3 py-2 font-mono text-gray-800 dark:text-gray-200 whitespace-nowrap border-b border-gray-100 dark:border-gray-800 text-xs">
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

export function MetaDisplay({ meta }) {
  if (!meta || !Object.keys(meta).length) return null;
  return (
    <div className="mt-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded p-3">
      <h4 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-wider">Computed Parameters</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
        {Object.entries(meta).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 text-xs">
            <span className="text-gray-500 dark:text-gray-400 truncate">{k}</span>
            <span className="text-gray-800 dark:text-gray-200 font-mono">
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
