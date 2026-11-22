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
export const PRIMARY_LAW_COEFF_11: number = 4.25000000e+01;
export const SECONDARY_LAW_COEFF_11: number = 3.84000000e+01;

export class AesaTrLatticeDeterministicSimulatorM11S1 {
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
  private activeRegime: AesaTrLatticeOperationalRegime = "COLD_STANDBY";

  constructor(nodeId: string, dtSec: number = 0.005) {
    this.nodeId = nodeId;
    this.dtSec = Math.max(dtSec, 1e-5);
    this.setpoint = 1.350000;
    this.tolerance = 0.020000;
    this.stateX = [1.350000, 0.0, 0.202500, 1.0];
    this.covDiag = [0.020000, 0.010000, 0.016000, 0.01];
  }

  public validatePacket(pkt: AesaTrLatticePacket): boolean {
    if (pkt.epochMs <= 0) return false;
    if (!Number.isFinite(pkt.active_vswr_ratio)) return false;
    if (!Number.isFinite(pkt.six_bit_phase_lsb_deg)) return false;
    if (!Number.isFinite(pkt.probe_corrected_gain_dbi)) return false;
    if (!Number.isFinite(pkt.monostatic_rcs_dbsm)) return false;
    if (pkt.harmonicDistortion < 0 || pkt.harmonicDistortion > 1) return false;
    return pkt.ambientStressFactor > 0;
  }

  public stepFilter(pkt: AesaTrLatticePacket): AesaTrLatticeEval {
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
    const predX2 = 0.88 * this.stateX[2] + 0.12 * pkt.probe_corrected_gain_dbi;
    const dampX3 = this.stateX[3] * (1 - 0.01 * pkt.harmonicDistortion);
    const predX3 = Math.max(0.05, Math.min(2.5, dampX3));
    const qNoise = Math.max(this.tolerance * 0.04, 1e-8);
    const predP0 = this.covDiag[0] + this.dtSec * this.covDiag[1] + qNoise;
    const predP1 = this.covDiag[1] * 0.94 + qNoise;
    const predP2 = this.covDiag[2] * 0.95 + qNoise;
    const predP3 = this.covDiag[3] * 0.98 + qNoise * 0.1;
    const measZ = pkt.active_vswr_ratio;
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

  public computeHelmholtzEnergy(pkt: AesaTrLatticePacket): number {
    const p = pkt.active_vswr_ratio;
    const s = pkt.six_bit_phase_lsb_deg;
    const c = pkt.probe_corrected_gain_dbi;
    const normP = p / Math.max(Math.abs(this.setpoint), 1e-9);
    const nl = Math.tanh(normP - 1.0);
    const diff = p - this.setpoint;
    return 0.5 * diff * diff + 0.18 * c * nl + PRIMARY_LAW_COEFF_11 * s * s;
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

  public generateSyntheticStream(steps: number = 24): AesaTrLatticeEval[] {
    const results: AesaTrLatticeEval[] = [];
    const baseEpoch = 1763510000000;
    for (let k = 0; k < steps; k += 1) {
      const phase = k * 0.39;
      const pkt: AesaTrLatticePacket = {
        packetId: `ANECHOIC-${k + 1}`,
        facilityNodeId: this.nodeId,
        epochMs: baseEpoch + k * 25,
        active_vswr_ratio: this.setpoint + Math.sin(phase) * this.tolerance * 0.8,
        six_bit_phase_lsb_deg: this.setpoint * 0.22 + 1.0 + 0.04 * Math.cos(phase),
        probe_corrected_gain_dbi: NOMINAL_SETPOINT_B_11 + Math.cos(phase) * 0.220000,
        monostatic_rcs_dbsm: -18.500000 * (1 + 0.002 * Math.sin(phase)),
        harmonicDistortion: 0.02 + 0.008 * Math.abs(Math.sin(phase)),
        ambientStressFactor: 1.0 + 0.03 * Math.abs(Math.cos(phase)),
        redundantChannelHealthy: true,
      };
      results.push(this.stepFilter(pkt));
    }
    return results;
  }
}

export class SphericalWaveProbeDeterministicSimulatorM11S2 {
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
  private activeRegime: AesaTrLatticeOperationalRegime = "COLD_STANDBY";

  constructor(nodeId: string, dtSec: number = 0.005) {
    this.nodeId = nodeId;
