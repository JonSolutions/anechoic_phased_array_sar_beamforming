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
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly sinr_improvement_db: number;
  