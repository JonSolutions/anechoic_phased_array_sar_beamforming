-- [Electromagnetic Near-Field Scanner & Airborne STAP Radar Signal Processing Lab]
-- Architecture Paradigm: COVARIANCE_BEAMSPACE_PIPELINE
-- Standard: IEEE-STD-149-1720-STANAG-4607-2026 | Revision 02

BEGIN TRANSACTION;

CREATE SCHEMA IF NOT EXISTS anechoic_phased__domain;
CREATE SCHEMA IF NOT EXISTS anechoic_phased__rollup;

-- Entity 1: PolarBackprojector (COVARIANCE_BEAMSPACE_PIPELINE)
CREATE TABLE IF NOT EXISTS anechoic_phased__domain.tbl_lfm_chirp_dechirp_sar_r2 (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(56) NOT NULL,
    captured_epoch_ms BIGINT NOT NULL,
    operating_mode VARCHAR(40) NOT NULL DEFAULT 'STEADY_NOMINAL',
    impulse_response_ipr_cm DOUBLE PRECISION NOT NULL,
    peak_sidelobe_pslr_db DOUBLE PRECISION NOT NULL,
    estimator_residual DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    normalized_z_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    trip_breaker_engaged BOOLEAN NOT NULL DEFAULT FALSE,
    audit_digest_sha256 VARCHAR(96) NOT NULL,
    attributes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_lfm_chirp_dechirp_sar_r2_ts CHECK (captured_epoch_ms > 0),
    CONSTRAINT ck_lfm_chirp_dechirp_sar_r2_z CHECK (normalized_z_score >= 0.0)
    
);
