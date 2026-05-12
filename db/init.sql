-- PainelURE 2.0 - schema inicial
-- Rode este arquivo no SQL Editor do Supabase antes do primeiro deploy online.

CREATE TABLE IF NOT EXISTS app_state (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  source text NOT NULL DEFAULT 'api',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_snapshots (
  id text PRIMARY KEY,
  payload jsonb NOT NULL,
  source text NOT NULL DEFAULT 'api',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'Consulta',
  contact_id text,
  password_hash text NOT NULL,
  avatar text,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS official_sources (
  key text PRIMARY KEY,
  label text NOT NULL,
  type text NOT NULL DEFAULT 'csv',
  url text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS import_runs (
  id text PRIMARY KEY,
  source_key text,
  rows_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'ok',
  detail text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id text PRIMARY KEY,
  user_id text REFERENCES users(id) ON DELETE SET NULL,
  actor_name text DEFAULT '',
  actor_role text DEFAULT '',
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  detail text DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON app_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_import_runs_created_at ON import_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_user_time ON audit_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity, entity_id);

CREATE OR REPLACE FUNCTION painelure_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION painelure_touch_updated_at();
