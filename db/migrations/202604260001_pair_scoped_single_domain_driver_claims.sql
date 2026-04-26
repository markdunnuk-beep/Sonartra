BEGIN;

CREATE TABLE assessment_version_single_domain_driver_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  domain_key TEXT NOT NULL,
  pair_key TEXT NOT NULL,
  signal_key TEXT NOT NULL,
  driver_role TEXT NOT NULL,
  claim_type TEXT NOT NULL,
  claim_text TEXT NOT NULL,
  materiality TEXT NOT NULL,
  priority INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT avsd_driver_claims_unique_version_pair_signal_role_priority
    UNIQUE (assessment_version_id, domain_key, pair_key, signal_key, driver_role, priority),
  CONSTRAINT avsd_driver_claims_driver_role_check
    CHECK (driver_role IN ('primary_driver', 'secondary_driver', 'supporting_context', 'range_limitation')),
  CONSTRAINT avsd_driver_claims_claim_type_check
    CHECK (claim_type IN ('driver_primary', 'driver_secondary', 'driver_supporting_context', 'driver_range_limitation')),
  CONSTRAINT avsd_driver_claims_materiality_check
    CHECK (materiality IN ('core', 'supporting', 'material_underplay')),
  CONSTRAINT avsd_driver_claims_priority_positive_check
    CHECK (priority > 0)
);

CREATE INDEX avsd_driver_claims_version_pair_signal_role_idx
  ON assessment_version_single_domain_driver_claims (
    assessment_version_id,
    domain_key,
    pair_key,
    signal_key,
    driver_role
  );

COMMIT;
