/**
 * Domain: X-Band AESA Phased-Array Radar Space-Time Adaptive Processing (STAP), Ch
 * Module: frontend/stap_clutter_notch_breaker_policy_definitions_12
 * Standard: IEEE-STD-149-1720-STANAG-4607-2026
 * Governing Law: MonostaticRadarRangeEquation (coeff=2.4800e+01)
 */

export type StapAdaptiveWeightOperationalRegime =
  | "COLD_STANDBY"
  | "PRE_START_CHECK"
  | "CLOSED_LOOP_NOMINAL"
  | "HIGH_GRADIENT_DAMPING"
  | "DEGRADED_FALLBACK"
  | "INTERLOCK_SCRAM_LATCHED";

export interface StapAdaptiveWeightPacket {
  readonly packetId: string;
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly sinr_improvement_db: number;
  readonly clutter_ridge_slope_beta: number;
  readonly pfa_false_alarm_log10: number;
  readonly scan_blindness_angle_deg: number;
  readonly harmonicDistortion: number;
  readonly ambientStressFactor: number;
  readonly redundantChannelHealthy: boolean;
}

export interface StapAdaptiveWeightEval {
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
  readonly activeRegime: StapAdaptiveWeightOperationalRegime;
  readonly interlockTripped: boolean;
  