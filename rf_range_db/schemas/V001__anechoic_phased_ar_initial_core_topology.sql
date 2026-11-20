-- [Electromagnetic Near-Field Scanner & Airborne STAP Radar Signal Processing Lab]
-- Architecture Paradigm: COVARIANCE_BEAMSPACE_PIPELINE
-- Standard: IEEE-STD-149-1720-STANAG-4607-2026 | Revision 01

BEGIN TRANSACTION;

CREATE SCHEMA IF NOT EXISTS anechoic_phased__domain;
CREATE SCHEMA IF NOT EXISTS anechoic_phased__rollup;

-- Entity 1: AesaTrLattice (COVARIANCE_BEAMSPACE_PIPELINE)
CREATE TABLE IF NOT EXISTS anechoic_phased__domain.tbl_gan_tr_module_lattice_r1 (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(56) NOT NULL,
    captured_epoch_ms BIGINT NOT NULL,
    operating_mode VARCHAR(40) NOT NULL DEFAULT 'STEADY_NOMINAL',
    active_vswr_ratio DOUBLE PRECISION NOT NULL,
    six_bit_phase_lsb_deg DOUBLE PRECISION NOT NULL,
    estimator_residual DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    normalized_z_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    trip_breaker_engaged BOOLEAN NOT NULL DEFAULT FALSE,
    audit_digest_sha256 VARCHAR(96) NOT NULL,
    attributes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_gan_tr_module_lattice_r1_ts CHECK (captured_epoch_ms > 0),
    CONSTRAINT ck_gan_tr_module_lattice_r1_z CHECK (normalized_z_score >= 0.0)
);

CREATE INDEX IF NOT EXISTS ix_gan_tr_module_lattice_r1_station_ts
    ON anechoic_phased__domain.tbl_gan_tr_module_lattice_r1
    (station_code, captured_epoch_ms DESC);
    