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
  readonly angle_off_boresight_mrad: number;
  readonly sfdr_spurious_free_db: number;
  readonly harmonicDistortion: number;
  readonly ambientStressFactor: number;
  readonly redundantChannelHealthy: boolean;
}

export interface PolarBackprojectorEval {
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
  readonly activeRegime: PolarBackprojectorOperationalRegime;
  readonly interlockTripped: boolean;
}

export const NOMINAL_SETPOINT_A_13: number = -13.200000;
export const NOMINAL_TOLERANCE_A_13: number = 0.150000;
export const NOMINAL_SETPOINT_B_13: number = -34.000000;
export const PRIMARY_LAW_COEFF_13: number = 3.84000000e+01;
export const SECONDARY_LAW_COEFF_13: number = 4.25000000e+01;

export class PolarBackprojectorDeterministicSimulatorM13S1 {
  private readonly nodeId: string;
  private readonly dtSec: number;
  private readonly setpoint: number;
  private readonly tolerance: number;
  private stateX: [number, number, number, number];
  private covDiag: [number, number, number, number];
  private readonly windowHistory: number[] = [];
