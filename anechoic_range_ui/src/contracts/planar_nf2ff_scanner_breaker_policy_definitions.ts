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
    const energy = this.computeHelmholtzEnergy(pkt);
    const effort = this.computeControlActuation();
    return {
      nodeId: this.nodeId,
      epochMs: pkt.epochMs,
      posteriorEstimate: Number(this.stateX[0].toFixed(7)),
      posteriorVelocity: Number(this.stateX[1].toFixed(7)),
      innovationResidual: Number(innov.toFixed(7)),
      kalmanGain: Number(k0.toFixed(7)),
      mahalanobisDistance: Number(mDist.toFixed(7)),
      helmholtzEnergy: Number(energy.toFixed(7)),
      controlActuationEffort: Number(effort.toFixed(7)),
      allanVariance: Number(this.computeAllanVariance().toFixed(8)),
      activeRegime: this.activeRegime,
      interlockTripped: this.activeRegime === "INTERLOCK_SCRAM_LATCHED",
    };
  }

  private updateRegime(mDist: number, healthy: boolean): void {
    if (!healthy || mDist > 6.0) {
      this.consecutiveFaults += 1;
      this.activeRegime =
        this.consecutiveFaults >= 3 ? "INTERLOCK_SCRAM_LATCHED" : "HIGH_GRADIENT_DAMPING";
    } else if (mDist > 3.0) {
      this.consecutiveFaults = Math.max(0, this.consecutiveFaults - 1);
      this.activeRegime = "HIGH_GRADIENT_DAMPING";
    } else {
      this.consecutiveFaults = 0;
      this.activeRegime = "CLOSED_LOOP_NOMINAL";
    }
  }

  public computeHelmholtzEnergy(pkt: StapAdaptiveWeightPacket): number {
    const p = pkt.sinr_improvement_db;
    const s = pkt.clutter_ridge_slope_beta;
    const c = pkt.pfa_false_alarm_log10;
    const normP = p / Math.max(Math.abs(this.setpoint), 1e-9);
    const nl = Math.tanh(normP - 1.0);
    const diff = p - this.setpoint;
    return 0.5 * diff * diff + 0.18 * c * nl + PRIMARY_LAW_COEFF_12 * s * s;
  }

  public computeControlActuation(): number {
    const err = this.setpoint - this.stateX[0];
    const vel = this.stateX[1];
    const tail = this.innovationHistory.slice(-16);
    const intSum = tail.reduce((acc, v) => acc + v, 0);
    const raw = 0.58 * err - 0.14 * vel + 0.03 * intSum;
    const limit = Math.abs(this.setpoint) * 0.45 + 5.0;
    return Math.max(-limit, Math.min(limit, raw));
  }

  public computeAllanVariance(): number {
    if (this.windowHistory.length < 3) return 0;
    let acc = 0;
    for (let i = 1; i < this.windowHistory.length; i += 1) {
      const d = this.windowHistory[i] - this.windowHistory[i - 1];
      acc += d * d;
    }
    return acc / (2 * (this.windowHistory.length - 1));
  }

  public generateSyntheticStream(steps: number = 24): StapAdaptiveWeightEval[] {
    const results: StapAdaptiveWeightEval[] = [];
    const baseEpoch = 1763510000000;
    for (let k = 0; k < steps; k += 1) {
      const phase = k * 0.39;
      const pkt: StapAdaptiveWeightPacket = {
        packetId: `ANECHOIC-${k + 1}`,
        facilityNodeId: this.nodeId,
        epochMs: baseEpoch + k * 25,
        sinr_improvement_db: this.setpoint + Math.sin(phase) * this.tolerance * 0.8,
        clutter_ridge_slope_beta: this.setpoint * 0.22 + 1.0 + 0.04 * Math.cos(phase),
        pfa_false_alarm_log10: NOMINAL_SETPOINT_B_12 + Math.cos(phase) * 0.050000,
        scan_blindness_angle_deg: 58.000000 * (1 + 0.002 * Math.sin(phase)),
        harmonicDistortion: 0.02 + 0.008 * Math.abs(Math.sin(phase)),
        ambientStressFactor: 1.0 + 0.03 * Math.abs(Math.cos(phase)),
        redundantChannelHealthy: true,
      };
      results.push(this.stepFilter(pkt));
    }
    return results;
  }
}

export class OsCfarThresholdDeterministicSimulatorM12S2 {
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
    this.setpoint = -6.000000;
    this.tolerance = 0.050000;
    this.stateX = [-6.000000, 0.0, -0.900000, 1.0];
    this.covDiag = [0.050000, 0.025000, 0.040000, 0.01];
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
    const energy = this.computeHelmholtzEnergy(pkt);
    const effort = this.computeControlActuation();
    return {
      nodeId: this.nodeId,
      epochMs: pkt.epochMs,
      posteriorEstimate: Number(this.stateX[0].toFixed(7)),
      posteriorVelocity: Number(this.stateX[1].toFixed(7)),
      innovationResidual: Number(innov.toFixed(7)),
      kalmanGain: Number(k0.toFixed(7)),
      mahalanobisDistance: Number(mDist.toFixed(7)),
      helmholtzEnergy: Number(energy.toFixed(7)),
      controlActuationEffort: Number(effort.toFixed(7)),
      allanVariance: Number(this.computeAllanVariance().toFixed(8)),
      activeRegime: this.activeRegime,
      interlockTripped: this.activeRegime === "INTERLOCK_SCRAM_LATCHED",
    };
  }

  private updateRegime(mDist: number, healthy: boolean): void {
    if (!healthy || mDist > 6.0) {
      this.consecutiveFaults += 1;
      this.activeRegime =
        this.consecutiveFaults >= 3 ? "INTERLOCK_SCRAM_LATCHED" : "HIGH_GRADIENT_DAMPING";
    } else if (mDist > 3.0) {
      this.consecutiveFaults = Math.max(0, this.consecutiveFaults - 1);
      this.activeRegime = "HIGH_GRADIENT_DAMPING";
    } else {
      this.consecutiveFaults = 0;
      this.activeRegime = "CLOSED_LOOP_NOMINAL";
    }
  }

  public computeHelmholtzEnergy(pkt: StapAdaptiveWeightPacket): number {
    const p = pkt.sinr_improvement_db;
    const s = pkt.clutter_ridge_slope_beta;
    const c = pkt.pfa_false_alarm_log10;
    const normP = p / Math.max(Math.abs(this.setpoint), 1e-9);
    const nl = Math.tanh(normP - 1.0);
    const diff = p - this.setpoint;
    return 0.5 * diff * diff + 0.18 * c * nl + PRIMARY_LAW_COEFF_12 * s * s;
  }

  public computeControlActuation(): number {
    const err = this.setpoint - this.stateX[0];
    const vel = this.stateX[1];
    const tail = this.innovationHistory.slice(-16);
    const intSum = tail.reduce((acc, v) => acc + v, 0);
    const raw = 0.58 * err - 0.14 * vel + 0.03 * intSum;
    const limit = Math.abs(this.setpoint) * 0.45 + 5.0;
    return Math.max(-limit, Math.min(limit, raw));
  }

  public computeAllanVariance(): number {
    if (this.windowHistory.length < 3) return 0;
    let acc = 0;
    for (let i = 1; i < this.windowHistory.length; i += 1) {
      const d = this.windowHistory[i] - this.windowHistory[i - 1];
      acc += d * d;
    }
    return acc / (2 * (this.windowHistory.length - 1));
  }

  public generateSyntheticStream(steps: number = 24): StapAdaptiveWeightEval[] {
    const results: StapAdaptiveWeightEval[] = [];
    const baseEpoch = 1763510000000;
    for (let k = 0; k < steps; k += 1) {
      const phase = k * 0.39;
      const pkt: StapAdaptiveWeightPacket = {
        packetId: `ANECHOIC-${k + 1}`,
        facilityNodeId: this.nodeId,
        epochMs: baseEpoch + k * 25,
        sinr_improvement_db: this.setpoint + Math.sin(phase) * this.tolerance * 0.8,
        clutter_ridge_slope_beta: this.setpoint * 0.22 + 1.0 + 0.04 * Math.cos(phase),
        pfa_false_alarm_log10: NOMINAL_SETPOINT_B_12 + Math.cos(phase) * 0.050000,
        scan_blindness_angle_deg: 58.000000 * (1 + 0.002 * Math.sin(phase)),
        harmonicDistortion: 0.02 + 0.008 * Math.abs(Math.sin(phase)),
        ambientStressFactor: 1.0 + 0.03 * Math.abs(Math.cos(phase)),
        redundantChannelHealthy: true,
      };
      results.push(this.stepFilter(pkt));
    }
    return results;
  }
}

export class FloquetUnitCellArrayDeterministicSimulatorM12S3 {
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
    this.setpoint = 58.000000;
    this.tolerance = 0.500000;
    this.stateX = [58.000000, 0.0, 8.700000, 1.0];
    this.covDiag = [0.500000, 0.250000, 0.400000, 0.01];
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
    const energy = this.computeHelmholtzEnergy(pkt);
    const effort = this.computeControlActuation();
    return {
      nodeId: this.nodeId,
      epochMs: pkt.epochMs,
      posteriorEstimate: Number(this.stateX[0].toFixed(7)),
      posteriorVelocity: Number(this.stateX[1].toFixed(7)),
      innovationResidual: Number(innov.toFixed(7)),
      kalmanGain: Number(k0.toFixed(7)),
      mahalanobisDistance: Number(mDist.toFixed(7)),
      helmholtzEnergy: Number(energy.toFixed(7)),
      controlActuationEffort: Number(effort.toFixed(7)),
      allanVariance: Number(this.computeAllanVariance().toFixed(8)),
      activeRegime: this.activeRegime,
      interlockTripped: this.activeRegime === "INTERLOCK_SCRAM_LATCHED",
    };
  }

  private updateRegime(mDist: number, healthy: boolean): void {
    if (!healthy || mDist > 6.0) {
      this.consecutiveFaults += 1;
      this.activeRegime =
        this.consecutiveFaults >= 3 ? "INTERLOCK_SCRAM_LATCHED" : "HIGH_GRADIENT_DAMPING";
    } else if (mDist > 3.0) {
      this.consecutiveFaults = Math.max(0, this.consecutiveFaults - 1);
      this.activeRegime = "HIGH_GRADIENT_DAMPING";
    } else {
      this.consecutiveFaults = 0;
      this.activeRegime = "CLOSED_LOOP_NOMINAL";
    }
  }

  public computeHelmholtzEnergy(pkt: StapAdaptiveWeightPacket): number {
    const p = pkt.sinr_improvement_db;
    const s = pkt.clutter_ridge_slope_beta;
    const c = pkt.pfa_false_alarm_log10;
    const normP = p / Math.max(Math.abs(this.setpoint), 1e-9);
    const nl = Math.tanh(normP - 1.0);
    const diff = p - this.setpoint;
    return 0.5 * diff * diff + 0.18 * c * nl + PRIMARY_LAW_COEFF_12 * s * s;
  }

  public computeControlActuation(): number {
    const err = this.setpoint - this.stateX[0];
    const vel = this.stateX[1];
    const tail = this.innovationHistory.slice(-16);
    const intSum = tail.reduce((acc, v) => acc + v, 0);
    const raw = 0.58 * err - 0.14 * vel + 0.03 * intSum;
    const limit = Math.abs(this.setpoint) * 0.45 + 5.0;
    return Math.max(-limit, Math.min(limit, raw));
  }

  public computeAllanVariance(): number {
    if (this.windowHistory.length < 3) return 0;
    let acc = 0;
    for (let i = 1; i < this.windowHistory.length; i += 1) {
      const d = this.windowHistory[i] - this.windowHistory[i - 1];
      acc += d * d;
    }
    return acc / (2 * (this.windowHistory.length - 1));
  }

  public generateSyntheticStream(steps: number = 24): StapAdaptiveWeightEval[] {
    const results: StapAdaptiveWeightEval[] = [];
    const baseEpoch = 1763510000000;
    for (let k = 0; k < steps; k += 1) {
      const phase = k * 0.39;
      const pkt: StapAdaptiveWeightPacket = {
        packetId: `ANECHOIC-${k + 1}`,
        facilityNodeId: this.nodeId,
        epochMs: baseEpoch + k * 25,
        sinr_improvement_db: this.setpoint + Math.sin(phase) * this.tolerance * 0.8,
        clutter_ridge_slope_beta: this.setpoint * 0.22 + 1.0 + 0.04 * Math.cos(phase),
        pfa_false_alarm_log10: NOMINAL_SETPOINT_B_12 + Math.cos(phase) * 0.050000,
        scan_blindness_angle_deg: 58.000000 * (1 + 0.002 * Math.sin(phase)),
        harmonicDistortion: 0.02 + 0.008 * Math.abs(Math.sin(phase)),
        ambientStressFactor: 1.0 + 0.03 * Math.abs(Math.cos(phase)),
        redundantChannelHealthy: true,
      };
      results.push(this.stepFilter(pkt));
    }
    return results;
  }
}


export function evaluateStapAdaptiveWeightSensitivityProfileP1(
  stateVal: number,
  refVal: number,
  stressFactor: number
): { normResidual: number; jacobianTrace: number; stabilityMargin: number } {
  const denom = Math.max(Math.abs(refVal), 1e-9);
  const norm = (stateVal - refVal) / denom;
  const sech2 = 1 - Math.tanh(norm) ** 2;
  const jacobianTrace = 1 + (0.42 * sech2) / Math.max(stressFactor, 1e-6);
  const stabilityMargin = jacobianTrace - 0.85 * Math.abs(norm);
  return {
    normResidual: Number(norm.toFixed(7)),
    jacobianTrace: Number(jacobianTrace.toFixed(7)),
    stabilityMargin: Number(stabilityMargin.toFixed(7)),
  };
}

export function evaluatePolarBackprojectorSensitivityProfileP2(
  stateVal: number,
  refVal: number,
  stressFactor: number
): { normResidual: number; jacobianTrace: number; stabilityMargin: number } {
  const denom = Math.max(Math.abs(refVal), 1e-9);
  const norm = (stateVal - refVal) / denom;
  const sech2 = 1 - Math.tanh(norm) ** 2;
  const jacobianTrace = 1 + (0.42 * sech2) / Math.max(stressFactor, 1e-6);
  const stabilityMargin = jacobianTrace - 0.85 * Math.abs(norm);
  return {
    normResidual: Number(norm.toFixed(7)),
    jacobianTrace: Number(jacobianTrace.toFixed(7)),
    stabilityMargin: Number(stabilityMargin.toFixed(7)),
  };
}

export function evaluateSphericalWaveProbeSensitivityProfileP3(
  stateVal: number,
  refVal: number,
  stressFactor: number
): { normResidual: number; jacobianTrace: number; stabilityMargin: number } {
  const denom = Math.max(Math.abs(refVal), 1e-9);
  const norm = (stateVal - refVal) / denom;
  const sech2 = 1 - Math.tanh(norm) ** 2;
