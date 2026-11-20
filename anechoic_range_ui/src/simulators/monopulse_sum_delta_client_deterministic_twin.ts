/**
 * Domain: X-Band AESA Phased-Array Radar Space-Time Adaptive Processing (STAP), Ch
 * Module: frontend/lfm_chirp_dechirp_sar_client_deterministic_twin_13
 * Standard: IEEE-STD-149-1720-STANAG-4607-2026
 * Governing Law: NearFieldToFarFieldHankel (coeff=3.8400e+01)
 */

export type PolarBackprojectorOperationalRegime =
  | "COLD_STANDBY"
  | "PRE_START_CHECK"
  | "CLOSED_LOOP_NOMINAL"
  | "HIGH_GRADIENT_DAMPING"
  | "DEGRADED_FALLBACK"
  | "INTERLOCK_SCRAM_LATCHED";

export interface PolarBackprojectorPacket {
  readonly packetId: string;
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly impulse_response_ipr_cm: number;
  readonly peak_sidelobe_pslr_db: number;
  