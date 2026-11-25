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
  private readonly innovationHistory: number[] = [];
  private consecutiveFaults: number = 0;
  private processedFrames: number = 0;
  private activeRegime: PolarBackprojectorOperationalRegime = "COLD_STANDBY";

  constructor(nodeId: string, dtSec: number = 0.005) {
    this.nodeId = nodeId;
    this.dtSec = Math.max(dtSec, 1e-5);
    this.setpoint = -13.200000;
    this.tolerance = 0.150000;
    this.stateX = [-13.200000, 0.0, -1.980000, 1.0];
    this.covDiag = [0.150000, 0.075000, 0.120000, 0.01];
  }

  public validatePacket(pkt: PolarBackprojectorPacket): boolean {
    if (pkt.epochMs <= 0) return false;
    if (!Number.isFinite(pkt.impulse_response_ipr_cm)) return false;
    if (!Number.isFinite(pkt.peak_sidelobe_pslr_db)) return false;
    if (!Number.isFinite(pkt.angle_off_boresight_mrad)) return false;
    if (!Number.isFinite(pkt.sfdr_spurious_free_db)) return false;
    if (pkt.harmonicDistortion < 0 || pkt.harmonicDistortion > 1) return false;
    return pkt.ambientStressFactor > 0;
  }

  public stepFilter(pkt: PolarBackprojectorPacket): PolarBackprojectorEval {
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
    const predX2 = 0.88 * this.stateX[2] + 0.12 * pkt.angle_off_boresight_mrad;
    const dampX3 = this.stateX[3] * (1 - 0.01 * pkt.harmonicDistortion);
    const predX3 = Math.max(0.05, Math.min(2.5, dampX3));
    const qNoise = Math.max(this.tolerance * 0.04, 1e-8);
    const predP0 = this.covDiag[0] + this.dtSec * this.covDiag[1] + qNoise;
    const predP1 = this.covDiag[1] * 0.94 + qNoise;
    const predP2 = this.covDiag[2] * 0.95 + qNoise;
    const predP3 = this.covDiag[3] * 0.98 + qNoise * 0.1;
    const measZ = pkt.impulse_response_ipr_cm;
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

  public computeHelmholtzEnergy(pkt: PolarBackprojectorPacket): number {
    const p = pkt.impulse_response_ipr_cm;
    const s = pkt.peak_sidelobe_pslr_db;
    const c = pkt.angle_off_boresight_mrad;
