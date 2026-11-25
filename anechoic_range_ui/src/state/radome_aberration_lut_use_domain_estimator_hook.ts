/**
 * Domain: X-Band AESA Phased-Array Radar Space-Time Adaptive Processing (STAP), Ch
 * Module: frontend/monopulse_sum_delta_use_domain_estimator_hook_16
 * Standard: IEEE-STD-149-1720-STANAG-4607-2026
 * Governing Law: MonostaticRadarRangeEquation (coeff=2.4800e+01)
 */

export type BaylissTaylorWeightingOperationalRegime =
  | "COLD_STANDBY"
  | "PRE_START_CHECK"
  | "CLOSED_LOOP_NOMINAL"
  | "HIGH_GRADIENT_DAMPING"
  | "DEGRADED_FALLBACK"
  | "INTERLOCK_SCRAM_LATCHED";

export interface BaylissTaylorWeightingPacket {
  readonly packetId: string;
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly angle_off_boresight_mrad: number;
  readonly null_depth_db: number;
  readonly sfdr_spurious_free_db: number;
  readonly boresight_error_slope: number;
  readonly harmonicDistortion: number;
  readonly ambientStressFactor: number;
  readonly redundantChannelHealthy: boolean;
}

export interface BaylissTaylorWeightingEval {
  readonly nodeId: string;
  readonly epochMs: number;
  readonly posteriorEstimate: number;
  readonly posteriorVelocity: number;
  readonly innovationResidual: number;
  readonly kalmanGain: number;
  readonly mahalanobisDistance: number;
  readonly helmholtzEnergy: number;
  readonly controlActuationEffort: number;
