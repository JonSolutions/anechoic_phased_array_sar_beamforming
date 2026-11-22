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
  readonly packetId: string;
  readonly facilityNodeId: string;
  readonly epochMs: number;
  readonly probe_corrected_gain_dbi: number;
  readonly quiet_zone_ripple_db: number;
  readonly monostatic_rcs_dbsm: number;
  readonly quadratic_phase_err_rad: number;
  readonly harmonicDistortion: number;
  readonly ambientStressFactor: number;
  readonly redundantChannelHealthy: boolean;
}

export interface SphericalWaveProbeEval {
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
  readonly activeRegime: SphericalWaveProbeOperationalRegime;
  readonly interlockTripped: boolean;
}

export const NOMINAL_SETPOINT_A_14: number = 38.400000;
export const NOMINAL_TOLERANCE_A_14: number = 0.220000;
export const NOMINAL_SETPOINT_B_14: number = -18.500000;
export const PRIMARY_LAW_COEFF_14: number = -1.32000000e+01;
export const SECONDARY_LAW_COEFF_14: number = 2.48000000e+01;

export class SphericalWaveProbeDeterministicSimulatorM14S1 {
  private readonly nodeId: string;
  private readonly dtSec: number;
  private readonly setpoint: number;
  private readonly tolerance: number;
  private stateX: [number, number, number, number];
  private covDiag: [number, number, number, number];
  private readonly windowHistory: number[] = [];
  private readonly innovationHistory: number[] = [];
  private consecutiveFaults: number = 0;
  private processedFrames: number = 0;
  private activeRegime: SphericalWaveProbeOperationalRegime = "COLD_STANDBY";

  constructor(nodeId: string, dtSec: number = 0.005) {
    this.nodeId = nodeId;
    this.dtSec = Math.max(dtSec, 1e-5);
    this.setpoint = 38.400000;
    this.tolerance = 0.220000;
    this.stateX = [38.400000, 0.0, 5.760000, 1.0];
    this.covDiag = [0.220000, 0.110000, 0.176000, 0.01];
  }

  public validatePacket(pkt: SphericalWaveProbePacket): boolean {
    if (pkt.epochMs <= 0) return false;
    if (!Number.isFinite(pkt.probe_corrected_gain_dbi)) return false;
    if (!Number.isFinite(pkt.quiet_zone_ripple_db)) return false;
    if (!Number.isFinite(pkt.monostatic_rcs_dbsm)) return false;
