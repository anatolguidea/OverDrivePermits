-- Rate-limiting: one row per request hit; SECURITY DEFINER function manages all access
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id         bigserial   PRIMARY KEY,
  key        text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created
  ON api_rate_limits (key, created_at DESC);

-- Block direct table access; all writes go through the function
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_direct_access" ON api_rate_limits AS RESTRICTIVE USING (false);

-- check_rate_limit: prune old hits, count, insert, return whether under the limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key         text,
  p_limit       int,
  p_window_secs int
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff timestamptz := now() - (p_window_secs || ' seconds')::interval;
  v_count  bigint;
BEGIN
  DELETE FROM api_rate_limits WHERE key = p_key AND created_at < v_cutoff;
  SELECT COUNT(*) INTO v_count FROM api_rate_limits WHERE key = p_key;
  IF v_count >= p_limit THEN
    RETURN false;
  END IF;
  INSERT INTO api_rate_limits (key) VALUES (p_key);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rate_limit(text, int, int) TO authenticated, anon;

-- record_failed_login: atomically increments fail count and sets locked_until when threshold hit
CREATE OR REPLACE FUNCTION record_failed_login(
  p_user_id      uuid,
  p_max_attempts int DEFAULT 10,
  p_lockout_mins int DEFAULT 15
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO operator_profiles (user_id, failed_login_count, locked_until)
  VALUES (p_user_id, 1, NULL)
  ON CONFLICT (user_id) DO UPDATE
    SET failed_login_count = operator_profiles.failed_login_count + 1,
        locked_until = CASE
          WHEN operator_profiles.failed_login_count + 1 >= p_max_attempts
          THEN now() + (p_lockout_mins || ' minutes')::interval
          ELSE operator_profiles.locked_until
        END,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION record_failed_login(uuid, int, int) TO authenticated, anon;
