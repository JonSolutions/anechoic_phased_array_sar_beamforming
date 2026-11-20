/**
 * Domain: X-Band AESA Phased-Array Radar Space-Time Adaptive Processing (STAP), Ch
 * Module: frontend/planar_nf2ff_scanner_harmonic_perturbation_synth_14
 * Standard: IEEE-STD-149-1720-STANAG-4607-2026
 * Governing Law: SARRangeDopplerPhaseHistory (coeff=-1.3200e+01)
 */

export type SphericalWaveProbeOperationalRegime =
  | "COLD_STANDBY"
  | "PRE_START_CHECK"
  | "CLOSED_LOOP_NOMINAL"
  | "HIGH_GRADIENT_DAMPING"
  | "DEGRADED_FALLBACK"
  | "INTERLOCK_SCRAM_LATCHED";

export interface SphericalWaveProbePacket {
  
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly probe_corrected_gain_dbi: number;
  readonly quiet_zone_ripple_db: number;
  readonly monostatic_rcs_dbsm: number;
  readonly quadratic_phase_err_rad: number;
  readonly harmonicDistortion: number;
  