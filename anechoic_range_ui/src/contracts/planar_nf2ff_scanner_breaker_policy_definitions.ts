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
}

export const NOMINAL_SETPOINT_A_12: number = 42.500000;
export const NOMINAL_TOLERANCE_A_12: number = 0.450000;
export const NOMINAL_SETPOINT_B_12: number = -6.000000;
export const PRIMARY_LAW_COEFF_12: number = 2.48000000e+01;
export const SECONDARY_LAW_COEFF_12: number = -1.32000000e+01;

export class StapAdaptiveWeightDeterministicSimulatorM12S1 {
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
  private activeRegime: StapAdaptiveWeightOperationalRegime = "COLD_STANDBY";

  constructor(nodeId: string, dtSec: number = 0.005) {
    this.nodeId = nodeId;
    this.dtSec = Math.max(dtSec, 1e-5);
    this.setpoint = 42.500000;
    this.tolerance = 0.450000;
    this.stateX = [42.500000, 0.0, 6.375000, 1.0];
    this.covDiag = [0.450000, 0.225000, 0.360000, 0.01];
  }

  public validatePacket(pkt: StapAdaptiveWeightPacket): boolean {
    if (pkt.epochMs <= 0) return false;
    if (!Number.isFinite(pkt.sinr_improvement_db)) return false;
    if (!Number.isFinite(pkt.clutter_ridge_slope_beta)) return false;
    if (!Number.isFinite(pkt.pfa_false_alarm_log10)) return false;
    if (!Number.isFinite(pkt.scan_blindness_angle_deg)) return false;
    if (pkt.harmonicDistortion < 0 || pkt.harmonicDistortion > 1) return false;
    return pkt.ambientStressFactor > 0;
  }

  public stepFilter(pkt: StapAdaptiveWeightPacket): StapAdaptiveWeightEval {
    this.processedFrames += 1;
    if (!this.validatePacket(pkt)) {
      this.consecutiveFaults += 1;
      this.activeRegime = "DEGRADED_FALLBACK";
      return {
        nodeId: this.nodeId,
        epochMs: pkt.epochMs,
        posteriorEstimate: this.stateX[0],
        posteriorVelocity: this.stateX[1],
        innovationResidual: 0,
        kalmanGain: 0,
        mahalanobisDistance: 99.9,
        helmholtzEnergy: 0,
        controlActuationEffort: 0,
        allanVariance: this.computeAllanVariance(),
        activeRegime: this.activeRegime,
        interlockTripped: true,
      };
    }
    const predX0 = this.stateX[0] + this.dtSec * this.stateX[1];
    const predX1 = 0.95 * this.stateX[1] - 0.14 * (this.stateX[0] - this.setpoint);
    const predX2 = 0.88 * this.stateX[2] + 0.12 * pkt.pfa_false_alarm_log10;
    const dampX3 = this.stateX[3] * (1 - 0.01 * pkt.harmonicDistortion);
    const predX3 = Math.max(0.05, Math.min(2.5, dampX3));
    const qNoise = Math.max(this.tolerance * 0.04, 1e-8);
    const predP0 = this.covDiag[0] + this.dtSec * this.covDiag[1] + qNoise;
    const predP1 = this.covDiag[1] * 0.94 + qNoise;
    const predP2 = this.covDiag[2] * 0.95 + qNoise;
    const predP3 = this.covDiag[3] * 0.98 + qNoise * 0.1;
    const measZ = pkt.sinr_improvement_db;
    const rNoise = Math.max(this.tolerance * (1 + pkt.harmonicDistortion), 1e-7);
    const innov = measZ - predX0;
    const sCov = predP0 + rNoise;
    const k0 = predP0 / sCov;
    const k1 = (0.25 * predP1) / sCov;
    this.stateX = [predX0 + k0 * innov, predX1 + k1 * innov, predX2, predX3];
    this.covDiag = [
      Math.max((1 - k0) * predP0, 1e-12),
      Math.max((1 - 0.25 * k1) * predP1, 1e-12),
      predP2,
      predP3,
    ];
    this.windowHistory.push(measZ);
    if (this.windowHistory.length > 128) this.windowHistory.shift();
    this.innovationHistory.push(innov);
    if (this.innovationHistory.length > 128) this.innovationHistory.shift();
    const mDist = Math.sqrt((innov * innov) / Math.max(sCov, 1e-12));
    this.updateRegime(mDist, pkt.redundantChannelHealthy);
