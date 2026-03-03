// ═══════════════════════════════════════════════════
// PHYSICS ENGINE (ported from Python notebooks + Excel)
// ═══════════════════════════════════════════════════

export const PHY = {
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

export function getFlux(beam) {
  const I = parseFloat(beam.current_nA);
  const q = parseFloat(beam.chargeState);
  const slit = parseFloat(beam.slit_mm);
  const angle = beam.useAngle ? parseFloat(beam.angle) || 0 : 0;
  const xR = beam.useRaster ? parseFloat(beam.xRaster) : null;
  const yR = beam.useRaster ? parseFloat(beam.yRaster) : null;
  if ([I, q, slit].some(isNaN)) return null;
  return PHY.effectiveFlux(I, q, slit, angle, xR, yR);
}

export function getBeamMeta(beam) {
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
