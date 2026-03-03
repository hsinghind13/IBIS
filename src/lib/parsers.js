// ═══════════════════════════════════════════════════
// SRIM FILE PARSERS (ported from Python)
// ═══════════════════════════════════════════════════

// Standard atomic masses (g/mol) by symbol
const ATOMIC_MASSES = {
  H: 1.008, He: 4.003, Li: 6.941, Be: 9.012, B: 10.81, C: 12.011,
  N: 14.007, O: 15.999, F: 18.998, Ne: 20.180, Na: 22.990, Mg: 24.305,
  Al: 26.982, Si: 28.086, P: 30.974, S: 32.065, Cl: 35.453, Ar: 39.948,
  K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996,
  Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693, Cu: 63.546, Zn: 65.38,
  Ga: 69.723, Ge: 72.630, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798,
  Rb: 85.468, Sr: 87.62, Y: 88.906, Zr: 91.224, Nb: 92.906, Mo: 95.95,
  Ru: 101.07, Rh: 102.91, Pd: 106.42, Ag: 107.87, Cd: 112.41,
  In: 114.82, Sn: 118.71, Sb: 121.76, Te: 127.60, I: 126.90, Xe: 131.29,
  Cs: 132.91, Ba: 137.33, La: 138.91, Ce: 140.12, Pr: 140.91, Nd: 144.24,
  Sm: 150.36, Eu: 151.96, Gd: 157.25, Tb: 158.93, Dy: 162.50,
  Ho: 164.93, Er: 167.26, Tm: 168.93, Yb: 173.05, Lu: 174.97,
  Hf: 178.49, Ta: 180.95, W: 183.84, Re: 186.21, Os: 190.23, Ir: 192.22,
  Pt: 195.08, Au: 196.97, Hg: 200.59, Tl: 204.38, Pb: 207.2, Bi: 208.98,
  Th: 232.04, U: 238.03,
};

// Full element names → symbols for Layer format parsing
const ELEMENT_NAMES = {
  hydrogen: "H", helium: "He", lithium: "Li", beryllium: "Be", boron: "B",
  carbon: "C", nitrogen: "N", oxygen: "O", fluorine: "F", neon: "Ne",
  sodium: "Na", magnesium: "Mg", aluminum: "Al", aluminium: "Al",
  silicon: "Si", phosphorus: "P", sulfur: "S", sulphur: "S",
  chlorine: "Cl", argon: "Ar", potassium: "K", calcium: "Ca",
  scandium: "Sc", titanium: "Ti", vanadium: "V", chromium: "Cr",
  manganese: "Mn", iron: "Fe", cobalt: "Co", nickel: "Ni",
  copper: "Cu", zinc: "Zn", gallium: "Ga", germanium: "Ge",
  arsenic: "As", selenium: "Se", bromine: "Br", krypton: "Kr",
  rubidium: "Rb", strontium: "Sr", yttrium: "Y", zirconium: "Zr",
  niobium: "Nb", molybdenum: "Mo", ruthenium: "Ru", rhodium: "Rh",
  palladium: "Pd", silver: "Ag", cadmium: "Cd", indium: "In",
  tin: "Sn", antimony: "Sb", tellurium: "Te", iodine: "I",
  xenon: "Xe", cesium: "Cs", barium: "Ba", lanthanum: "La",
  cerium: "Ce", praseodymium: "Pr", neodymium: "Nd",
  samarium: "Sm", europium: "Eu", gadolinium: "Gd", terbium: "Tb",
  dysprosium: "Dy", holmium: "Ho", erbium: "Er", thulium: "Tm",
  ytterbium: "Yb", lutetium: "Lu", hafnium: "Hf", tantalum: "Ta",
  tungsten: "W", rhenium: "Re", osmium: "Os", iridium: "Ir",
  platinum: "Pt", gold: "Au", mercury: "Hg", thallium: "Tl",
  lead: "Pb", bismuth: "Bi", thorium: "Th", uranium: "U",
};

const NA = 6.02214076e23;

function nameToSymbol(name) {
  if (ATOMIC_MASSES[name]) return name;
  const sym = ELEMENT_NAMES[name.toLowerCase()];
  if (sym) return sym;
  const cap = name.charAt(0).toUpperCase() + name.slice(1, 2).toLowerCase();
  if (ATOMIC_MASSES[cap]) return cap;
  if (ATOMIC_MASSES[cap.charAt(0)]) return cap.charAt(0);
  return null;
}

export function parseAtomicDensity(text) {
  const m = text.match(/Density\s*=\s*([0-9.+\-Ee]+)\s*atoms\/cm3/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Parse target composition + mass density from SRIM file header.
 * Returns { elements, massDensity_gcc, calculatedN } or null.
 * Tries composition table format first, falls back to Layer format.
 */
export function parseTargetComposition(text) {
  const elements = [];

  // Try composition table format (SRIM-2013+):
  //  ======= Target  Composition ========
  //     Atom   Atom   Atomic   Mass
  //     Name   Numb   Perc.    Perc.
  //     ----   ----   -----    -----
  //     Si     14    050.00   046.74
  //  ====================================
  const lines = text.split("\n");
  let inTable = false;
  let dashSeen = false;
  for (const line of lines) {
    if (/Target\s+Composition/i.test(line)) { inTable = true; dashSeen = false; continue; }
    if (!inTable) continue;
    if (/----/.test(line)) { dashSeen = true; continue; }
    if (!dashSeen) continue;
    if (/={4,}/.test(line.trim()) || !line.trim()) break;
    const m = line.trim().match(/^([A-Z][a-z]?)\s+(\d+)\s+(\d+\.?\d*)/);
    if (m) elements.push({ symbol: m[1], atomicPct: parseFloat(m[3]) });
  }

  // Fallback: Layer format
  if (!elements.length) {
    const re = /Layer\s*#\s*\d+-\s*(\w+)\s*=\s*([\d.]+)\s+Atomic Percent/gi;
    let m;
    while ((m = re.exec(text)) !== null) {
      const sym = nameToSymbol(m[1]);
      if (sym) elements.push({ symbol: sym, atomicPct: parseFloat(m[2]) });
    }
  }

  if (!elements.length) return null;

  // Parse mass density (g/cm³) — look for "X g/cm3" pattern
  let massDensity = null;
  const mdMatch = text.match(/=\s*([0-9.]+[Ee][+-]?\d+)\s*g\/cm3/i);
  if (mdMatch) massDensity = parseFloat(mdMatch[1]);

  // Calculate n = ρ × Nₐ / M_avg
  let calculatedN = null;
  if (massDensity && massDensity > 0) {
    let M_avg = 0;
    let allFound = true;
    for (const el of elements) {
      const mass = ATOMIC_MASSES[el.symbol];
      if (!mass) { allFound = false; break; }
      M_avg += (el.atomicPct / 100) * mass;
    }
    if (allFound && M_avg > 0) {
      calculatedN = (massDensity * NA) / M_avg;
    }
  }

  return { elements, massDensity, calculatedN };
}

export function parseDPIPeak(text) {
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

export function parseBPeak(text) {
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

export function parseVacancyProfile(text) {
  // Loose parsing matching Python notebooks: try every line, skip on failure
  const fnum = (s) => { const v = parseFloat(s.replace(/D/gi, "E")); if (isNaN(v)) throw 0; return v; };
  const depth_A = [], vac_ions = [], vac_recoils = [];
  for (const line of text.split("\n")) {
    const p = line.trim().split(/\s+/);
    if (p.length >= 3) {
      try { depth_A.push(fnum(p[0])); vac_ions.push(fnum(p[1])); vac_recoils.push(fnum(p[2])); }
      catch { continue; }
    }
  }
  return depth_A.length ? { depth_A, vac_ions, vac_recoils } : null;
}

export function parseRangeProfile(text) {
  // Loose parsing matching Python notebooks: try every line, skip on failure
  // Only need 2 columns (depth + B), some SRIM versions omit the 3rd column
  const fnum = (s) => { const v = parseFloat(s.replace(/D/gi, "E")); if (isNaN(v)) throw 0; return v; };
  const depth_A = [], B_per_cm = [];
  for (const line of text.split("\n")) {
    const p = line.trim().split(/\s+/);
    if (p.length >= 2) {
      try { depth_A.push(fnum(p[0])); B_per_cm.push(fnum(p[1])); }
      catch { continue; }
    }
  }
  return depth_A.length ? { depth_A, B_per_cm } : null;
}

export function parseSrimMetadata(text) {
  // Match "Ion = Ni  Energy = 200 keV" or "Energy = 200.00 keV" or "Energy = 2.00E+02 keV"
  const mIon = text.match(/Ion\s*=\s*(\w+)\s+Energy\s*=\s*([\d.]+(?:[Ee][+-]?\d+)?)\s*keV/);
  if (!mIon) return null; // no valid header found — lets || fallback try next file
  const ion = mIon[1];
  const energy = Math.round(parseFloat(mIon[2]));
  const elements = [];
  const re = /Layer\s*#\s*\d+-\s*(\w+)\s*=\s*[\d.]+\s+Atomic Percent/g;
  let m;
  while ((m = re.exec(text)) !== null) elements.push(m[1]);
  return { ion, energy_keV: energy, target: elements.join("") || "Target" };
}
