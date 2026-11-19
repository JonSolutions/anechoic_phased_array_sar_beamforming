-- [Electromagnetic Near-Field Scanner & Airborne STAP Radar Signal Processing Lab]
-- Architecture Paradigm: COVARIANCE_BEAMSPACE_PIPELINE
-- Standard: IEEE-STD-149-1720-STANAG-4607-2026 | Revision 05

BEGIN TRANSACTION;

CREATE SCHEMA IF NOT EXISTS anechoic_phased__domain;
CREATE SCHEMA IF NOT EXISTS anechoic_phased__rollup;

-- Entity 1: DirectRfSubsamplingAdc (COVARIANCE_BEAMSPACE_PIPELINE)
CREATE TABLE IF NOT EXISTS anechoic_phased__domain.tbl_digital_ddc_jesd204c_r5 (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_code VARCHAR(56) NOT NULL,
    captured_epoch_ms BIGINT NOT NULL,
    operating_mode VARCHAR(40) NOT NULL DEFAULT 'STEADY_NOMINAL',
    sfdr_spurious_free_db DOUBLE PRECISION NOT NULL,
    enob_effective_bits DOUBLE PRECISION NOT NULL,
    estimator_residual DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    normalized_z_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    trip_breaker_engaged BOOLEAN NOT NULL DEFAULT FALSE,
    audit_digest_sha256 VARCHAR(96) NOT NULL,
    attributes_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_digital_ddc_jesd204c_r5_ts CHECK (captured_epoch_ms > 0),
    CONSTRAINT ck_digital_ddc_jesd204c_r5_z CHECK (normalized_z_score >= 0.0)
    