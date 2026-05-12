BEGIN;

CREATE SEQUENCE support_case_public_reference_seq
  AS BIGINT
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION support_next_public_reference()
RETURNS TEXT
LANGUAGE SQL
VOLATILE
AS $$
  SELECT 'SUP-' || LPAD(nextval('support_case_public_reference_seq')::TEXT, 6, '0');
$$;

CREATE OR REPLACE FUNCTION support_current_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  app_user_id TEXT;
  jwt_subject TEXT;
  resolved_user_id UUID;
BEGIN
  app_user_id := NULLIF(current_setting('app.current_user_id', TRUE), '');

  IF app_user_id IS NOT NULL THEN
    BEGIN
      RETURN app_user_id::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RETURN NULL;
    END;
  END IF;

  jwt_subject := NULLIF(current_setting('request.jwt.claim.sub', TRUE), '');

  IF jwt_subject IS NOT NULL THEN
    SELECT u.id
    INTO resolved_user_id
    FROM users u
    WHERE u.clerk_user_id = jwt_subject
      AND u.status = 'active';

    RETURN resolved_user_id;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION support_current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = support_current_user_id()
      AND u.role = 'admin'
      AND u.status = 'active'
  );
$$;

CREATE TABLE support_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference TEXT NOT NULL DEFAULT support_next_public_reference(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN (
      'technical_issue',
      'account_support',
      'billing_access',
      'feedback',
      'general_question'
    )
  ),
  subject TEXT NOT NULL CHECK (LENGTH(BTRIM(subject)) > 0),
  initial_message_snapshot TEXT NOT NULL CHECK (LENGTH(BTRIM(initial_message_snapshot)) > 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN (
      'open',
      'waiting_on_sonartra',
      'waiting_on_user',
      'resolved',
      'closed'
    )
  ),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (
    priority IN (
      'low',
      'normal',
      'high',
      'urgent'
    )
  ),
  assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  external_provider TEXT,
  external_ticket_id TEXT,
  external_customer_id TEXT,
  external_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  CONSTRAINT support_cases_public_reference_unique
    UNIQUE (public_reference),
  CONSTRAINT support_cases_public_reference_format_check
    CHECK (public_reference ~ '^SUP-[0-9]{6,}$'),
  CONSTRAINT support_cases_assigned_admin_role_check
    CHECK (assigned_admin_id IS NULL OR assigned_admin_id <> user_id),
  CONSTRAINT support_cases_resolved_after_created_check
    CHECK (resolved_at IS NULL OR resolved_at >= created_at),
  CONSTRAINT support_cases_closed_after_created_check
    CHECK (closed_at IS NULL OR closed_at >= created_at)
);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_type TEXT NOT NULL CHECK (author_type IN ('user', 'admin', 'system')),
  body TEXT NOT NULL CHECK (LENGTH(BTRIM(body)) > 0),
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_messages_user_author_required_check
    CHECK (
      (author_type = 'system' AND author_user_id IS NULL)
      OR (author_type IN ('user', 'admin') AND author_user_id IS NOT NULL)
    )
);

CREATE TABLE support_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES support_cases(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (LENGTH(BTRIM(event_type)) > 0),
  from_value TEXT,
  to_value TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX support_cases_user_idx
  ON support_cases (user_id);

CREATE INDEX support_cases_public_reference_idx
  ON support_cases (public_reference);

CREATE INDEX support_cases_status_idx
  ON support_cases (status);

CREATE INDEX support_cases_category_idx
  ON support_cases (category);

CREATE INDEX support_cases_priority_idx
  ON support_cases (priority);

CREATE INDEX support_cases_updated_at_idx
  ON support_cases (updated_at DESC);

CREATE INDEX support_cases_assigned_admin_idx
  ON support_cases (assigned_admin_id)
  WHERE assigned_admin_id IS NOT NULL;

CREATE INDEX support_messages_case_idx
  ON support_messages (case_id, created_at ASC);

CREATE INDEX support_case_events_case_idx
  ON support_case_events (case_id, created_at ASC);

ALTER TABLE support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_case_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY support_cases_user_select_own
  ON support_cases
  FOR SELECT
  USING (user_id = support_current_user_id());

CREATE POLICY support_cases_user_insert_own
  ON support_cases
  FOR INSERT
  WITH CHECK (
    user_id = support_current_user_id()
    AND status = 'open'
    AND priority = 'normal'
    AND assigned_admin_id IS NULL
    AND external_provider IS NULL
    AND external_ticket_id IS NULL
    AND external_customer_id IS NULL
    AND external_synced_at IS NULL
    AND resolved_at IS NULL
    AND closed_at IS NULL
  );

CREATE POLICY support_cases_admin_select_all
  ON support_cases
  FOR SELECT
  USING (support_current_user_is_admin());

CREATE POLICY support_cases_admin_insert_all
  ON support_cases
  FOR INSERT
  WITH CHECK (support_current_user_is_admin());

CREATE POLICY support_cases_admin_update_all
  ON support_cases
  FOR UPDATE
  USING (support_current_user_is_admin())
  WITH CHECK (support_current_user_is_admin());

CREATE POLICY support_cases_admin_delete_all
  ON support_cases
  FOR DELETE
  USING (support_current_user_is_admin());

CREATE POLICY support_messages_user_select_own_public
  ON support_messages
  FOR SELECT
  USING (
    is_internal_note = FALSE
    AND EXISTS (
      SELECT 1
      FROM support_cases sc
      WHERE sc.id = support_messages.case_id
        AND sc.user_id = support_current_user_id()
    )
  );

CREATE POLICY support_messages_user_insert_own_public
  ON support_messages
  FOR INSERT
  WITH CHECK (
    is_internal_note = FALSE
    AND author_type = 'user'
    AND author_user_id = support_current_user_id()
    AND EXISTS (
      SELECT 1
      FROM support_cases sc
      WHERE sc.id = support_messages.case_id
        AND sc.user_id = support_current_user_id()
        AND sc.status <> 'closed'
    )
  );

CREATE POLICY support_messages_admin_select_all
  ON support_messages
  FOR SELECT
  USING (support_current_user_is_admin());

CREATE POLICY support_messages_admin_insert_all
  ON support_messages
  FOR INSERT
  WITH CHECK (
    support_current_user_is_admin()
    AND author_type = 'admin'
    AND author_user_id = support_current_user_id()
  );

CREATE POLICY support_messages_admin_update_all
  ON support_messages
  FOR UPDATE
  USING (support_current_user_is_admin())
  WITH CHECK (support_current_user_is_admin());

CREATE POLICY support_messages_admin_delete_all
  ON support_messages
  FOR DELETE
  USING (support_current_user_is_admin());

CREATE POLICY support_case_events_admin_select_all
  ON support_case_events
  FOR SELECT
  USING (support_current_user_is_admin());

CREATE POLICY support_case_events_admin_insert_all
  ON support_case_events
  FOR INSERT
  WITH CHECK (support_current_user_is_admin());

CREATE POLICY support_case_events_admin_update_all
  ON support_case_events
  FOR UPDATE
  USING (support_current_user_is_admin())
  WITH CHECK (support_current_user_is_admin());

CREATE POLICY support_case_events_admin_delete_all
  ON support_case_events
  FOR DELETE
  USING (support_current_user_is_admin());

COMMENT ON TABLE support_cases IS
  'Native Sonartra support cases. Separate from assessment scoring, runner state, result payloads, imports, publishing, and result rendering.';

COMMENT ON COLUMN support_cases.public_reference IS
  'Stable user-facing case reference generated as SUP-000001 style text. Raw database IDs should remain internal.';

COMMENT ON COLUMN support_cases.initial_message_snapshot IS
  'Snapshot of the opening support request message for queue and notification use; the canonical thread lives in support_messages.';

COMMENT ON COLUMN support_cases.external_provider IS
  'Nullable future integration field. Native Sonartra support remains the v1 source of truth.';

COMMENT ON TABLE support_messages IS
  'Threaded public replies and admin-only internal notes for native support cases.';

COMMENT ON TABLE support_case_events IS
  'Audit trail for support case lifecycle changes. Events are admin/server-facing in v1.';

COMMENT ON FUNCTION support_current_user_id() IS
  'Resolves the current internal users.id from app.current_user_id or request.jwt.claim.sub mapped through users.clerk_user_id.';

COMMENT ON FUNCTION support_current_user_is_admin() IS
  'Checks admin access through users.role for the current internal support RLS user.';

COMMENT ON POLICY support_cases_admin_select_all ON support_cases IS
  'Admin RLS depends on support_current_user_id resolving an active users row with role admin. Service-role/server-owned operations remain trusted and may bypass RLS according to database role configuration.';

COMMIT;
