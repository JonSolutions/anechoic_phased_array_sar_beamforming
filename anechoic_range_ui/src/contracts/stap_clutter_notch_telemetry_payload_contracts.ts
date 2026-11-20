/**
 * Domain: X-Band AESA Phased-Array Radar Space-Time Adaptive Processing (STAP), Ch
 * Module: frontend/gan_tr_module_lattice_telemetry_payload_contracts_11
 * Standard: IEEE-STD-149-1720-STANAG-4607-2026
 * Governing Law: CaponMVDRBeamformerWeights (coeff=4.2500e+01)
 */

export type AesaTrLatticeOperationalRegime =
  | "COLD_STANDBY"
  | "PRE_START_CHECK"
  | "CLOSED_LOOP_NOMINAL"
  | "HIGH_GRADIENT_DAMPING"
  | "DEGRADED_FALLBACK"
  | "INTERLOCK_SCRAM_LATCHED";

export interface AesaTrLatticePacket {
  readonly packetId: string;
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly active_vswr_ratio: number;
  readonly six_bit_phase_lsb_deg: number;
  readonly probe_corrected_gain_dbi: number;
  readonly monostatic_rcs_dbsm: number;
  readonly harmonicDistortion: number;
  readonly ambientStressFactor: number;
  readonly redundantChannelHealthy: boolean;
}

export interface AesaTrLatticeEval {
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
  readonly activeRegime: AesaTrLatticeOperationalRegime;
  readonly interlockTripped: boolean;
}

export const NOMINAL_SETPOINT_A_11: number = 1.350000;
export const NOMINAL_TOLERANCE_A_11: number = 0.020000;
export const NOMINAL_SETPOINT_B_11: number = 38.400000;
