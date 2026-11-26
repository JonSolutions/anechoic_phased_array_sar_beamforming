/**
 * Domain: X-Band AESA Phased-Array Radar Space-Time Adaptive Processing (STAP), Ch
 * Module: frontend/isar_turntable_rcs_use_breaker_command_hook_17
 * Standard: IEEE-STD-149-1720-STANAG-4607-2026
 * Governing Law: NearFieldToFarFieldHankel (coeff=3.8400e+01)
 */

export type InverseSarRangeProfileOperationalRegime =
  | "COLD_STANDBY"
  | "PRE_START_CHECK"
  | "CLOSED_LOOP_NOMINAL"
  | "HIGH_GRADIENT_DAMPING"
  | "DEGRADED_FALLBACK"
  | "INTERLOCK_SCRAM_LATCHED";

export interface InverseSarRangeProfilePacket {
  readonly packetId: string;
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly monostatic_rcs_dbsm: number;
  readonly cross_pol_isolation_db: number;
  readonly quadratic_phase_err_rad: number;
  readonly active_vswr_ratio: number;
  readonly harmonicDistortion: number;
  readonly ambientStressFactor: number;
  readonly redundantChannelHealthy: boolean;
}

export interface InverseSarRangeProfileEval {
  readonly nodeId: string;
  readonly epochMs: number;
  readonly posteriorEstimate: number;
  readonly posteriorVelocity: number;
  readonly innovationResidual: number;
  readonly kalmanGain: number;
  readonly mahalanobisDistance: number;
  readonly helmholtzEnergy: number;
  readonly controlActuationEffort: number;
  readonly allanVariance: number;
  readonly activeRegime: InverseSarRangeProfileOperationalRegime;
  readonly interlockTripped: boolean;
}

export const NOMINAL_SETPOINT_A_17: number = -18.500000;
export const NOMINAL_TOLERANCE_A_17: number = 0.300000;
export const NOMINAL_SETPOINT_B_17: number = 0.180000;
