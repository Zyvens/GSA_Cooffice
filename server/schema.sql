CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY CHECK (id IN ('vitor','fabio')), name text NOT NULL,
 password_hash text NOT NULL, color text NOT NULL DEFAULT '#d4af67', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES users(id), expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, count integer NOT NULL, resets_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS presence (user_id text PRIMARY KEY REFERENCES users(id), connection_id text NOT NULL, x real NOT NULL, y real NOT NULL, mic boolean DEFAULT false, updated_at timestamptz DEFAULT now());
CREATE TABLE IF NOT EXISTS signals (id text PRIMARY KEY, sender text NOT NULL REFERENCES users(id), recipient text NOT NULL REFERENCES users(id), payload jsonb NOT NULL, created_at timestamptz DEFAULT now());
CREATE INDEX IF NOT EXISTS signals_recipient ON signals(recipient,created_at);
CREATE TABLE IF NOT EXISTS meetings (
 id text PRIMARY KEY, title text NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
 starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, created_by text NOT NULL REFERENCES users(id),
 created_at timestamptz DEFAULT now(), CHECK(ends_at > starts_at),
 EXCLUDE USING gist (tstzrange(starts_at, ends_at, '[)') WITH &&)
);
CREATE TABLE IF NOT EXISTS tasks (
 id text PRIMARY KEY, title text NOT NULL, sector text NOT NULL, status text NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','doing','done')),
 assignee text NOT NULL CHECK(assignee IN ('vitor','fabio')), created_by text NOT NULL REFERENCES users(id), created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS records (
 id text PRIMARY KEY, title text NOT NULL, sector text NOT NULL, kind text NOT NULL,
 amount_cents bigint CHECK(amount_cents >= 0), details text NOT NULL DEFAULT '', created_by text NOT NULL REFERENCES users(id), created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS messages (
 id text PRIMARY KEY, agent_id text NOT NULL, user_id text NOT NULL REFERENCES users(id), role text NOT NULL CHECK(role IN ('user','assistant')), content text NOT NULL, created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_agent ON messages(agent_id,created_at);
CREATE TABLE IF NOT EXISTS settings (key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS audit (id bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL, target text, created_at timestamptz DEFAULT now());


CREATE TABLE IF NOT EXISTS notices (
 id text PRIMARY KEY, body text NOT NULL CHECK (length(body) BETWEEN 1 AND 1000),
 created_by text NOT NULL REFERENCES users(id), pinned boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS goals (
 id text PRIMARY KEY, title text NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
 current_value numeric NOT NULL DEFAULT 0, target_value numeric NOT NULL CHECK (target_value > 0), unit text NOT NULL DEFAULT '',
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','done','paused')), due_date date,
 created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS agent_schedules (
 id text PRIMARY KEY, agent_id text NOT NULL, label text NOT NULL CHECK (length(label) BETWEEN 1 AND 120),
 prompt text NOT NULL CHECK (length(prompt) BETWEEN 1 AND 4000), hour smallint NOT NULL CHECK (hour BETWEEN 0 AND 23),
 weekdays smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[], enabled boolean NOT NULL DEFAULT true,
 created_by text NOT NULL REFERENCES users(id), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agent_schedules_enabled ON agent_schedules(enabled,hour);
CREATE TABLE IF NOT EXISTS agent_runs (
 id text PRIMARY KEY, schedule_id text NOT NULL REFERENCES agent_schedules(id) ON DELETE CASCADE, agent_id text NOT NULL,
 run_date date NOT NULL, status text NOT NULL CHECK(status IN ('running','done','failed','skipped')), output text NOT NULL DEFAULT '', error text NOT NULL DEFAULT '',
 started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, UNIQUE(schedule_id,run_date)
);
CREATE INDEX IF NOT EXISTS agent_runs_recent ON agent_runs(run_date DESC,started_at DESC);
CREATE TABLE IF NOT EXISTS daily_briefs (brief_date date PRIMARY KEY, content jsonb NOT NULL, generated_at timestamptz NOT NULL DEFAULT now());


CREATE TABLE IF NOT EXISTS knowledge_documents (
 id text PRIMARY KEY,
 slug text NOT NULL UNIQUE,
 title text NOT NULL,
 category text NOT NULL,
 source_name text NOT NULL,
 content jsonb NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_documents_category ON knowledge_documents(category,active);
