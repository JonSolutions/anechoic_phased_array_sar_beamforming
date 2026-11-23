/**
 * Domain: X-Band AESA Phased-Array Radar Space-Time Adaptive Processing (STAP), Ch
 * Module: frontend/mutual_coupling_s_mat_use_spectral_diagnostics_hook_18
 * Standard: IEEE-STD-149-1720-STANAG-4607-2026
 * Governing Law: SARRangeDopplerPhaseHistory (coeff=-1.3200e+01)
 */

export type FloquetUnitCellArrayOperationalRegime =
  | "COLD_STANDBY"
  | "PRE_START_CHECK"
  | "CLOSED_LOOP_NOMINAL"
  | "HIGH_GRADIENT_DAMPING"
  | "DEGRADED_FALLBACK"
  | "INTERLOCK_SCRAM_LATCHED";

export interface FloquetUnitCellArrayPacket {
  readonly packetId: string;
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly scan_blindness_angle_deg: number;
  readonly element_efficiency_pct: number;
  readonly migration_cell_frac: number;
  readonly sinr_improvement_db: number;
  readonly harmonicDistortion: number;
