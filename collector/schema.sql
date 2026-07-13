-- xing.report — data archive schema
-- One rule: the schema supports N crossings, not 2.
-- Adding a crossing is a new row in `crossings`, never a schema change.

-- The crossings we track. The cbp_* / cbsa_* columns tell the collector
-- how to find each crossing inside the two government feeds.
CREATE TABLE IF NOT EXISTS crossings (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,          -- e.g. 'ambassador-bridge' (used in URLs later)
  name TEXT NOT NULL,                 -- display name, lowercase per design spec
  cbp_port_name TEXT,                 -- CBP feed <port_name>, e.g. 'Detroit'
  cbp_crossing_name TEXT,             -- CBP feed <crossing_name>, e.g. 'Ambassador Bridge'
  cbsa_office_name TEXT,              -- CBSA CSV 'Customs Office' column
  active INTEGER NOT NULL DEFAULT 1   -- 0 = stop collecting (never delete history)
);

-- Every wait-time reading ever fetched. This is the permanent archive.
CREATE TABLE IF NOT EXISTS readings (
  id INTEGER PRIMARY KEY,
  crossing_id INTEGER NOT NULL REFERENCES crossings(id),
  direction TEXT NOT NULL CHECK (direction IN ('to_us', 'to_canada')),
  lane_category TEXT NOT NULL CHECK (lane_category IN ('commercial', 'passenger', 'pedestrian')),
  lane_type TEXT NOT NULL,            -- 'standard' | 'fast' | 'nexus' | 'ready'
  wait_minutes INTEGER,               -- parsed number; NULL if closed/unknown
  status_text TEXT,                   -- the feed's own words ('no delay', 'Lanes Closed', ...)
  lanes_open INTEGER,                 -- CBP only; NULL for CBSA
  max_lanes INTEGER,                  -- CBP only; NULL for CBSA
  port_status TEXT,                   -- CBP only, e.g. 'Open'
  feed_updated_at TEXT,               -- when the AGENCY says the number was current (UTC ISO 8601)
  fetched_at TEXT NOT NULL,           -- when our worker fetched it (UTC ISO 8601)
  source TEXT NOT NULL CHECK (source IN ('cbp', 'cbsa'))
);

-- The site always asks: "latest readings for crossing X". This index makes that instant.
CREATE INDEX IF NOT EXISTS idx_readings_latest
  ON readings (crossing_id, direction, lane_category, lane_type, fetched_at);

-- Insurance: the raw feed responses, kept ~14 days so readings can be
-- re-derived if a parsing bug is ever found. Pruned automatically by the worker.
CREATE TABLE IF NOT EXISTS raw_snapshots (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  fetched_at TEXT NOT NULL,           -- UTC ISO 8601
  http_status INTEGER,                -- also records failed fetches (body NULL)
  error TEXT,                         -- network error message if the fetch itself failed
  body TEXT
);

CREATE INDEX IF NOT EXISTS idx_raw_snapshots_fetched
  ON raw_snapshots (fetched_at);

-- Approach-road and weather alerts, one row per alert (not per fetch).
-- The collector upserts on (source, external_id): first_seen_at is set once,
-- last_seen_at advances every 5-minute poll the alert is still present —
-- so each row records the alert's full lifespan for the archive.
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,               -- 'on511_event' | 'on511_alert' | 'on511_roadcondition' | 'mdot_incident' | 'nws' | 'eccc'
  external_id TEXT NOT NULL,          -- the source's own id for this alert
  side TEXT NOT NULL CHECK (side IN ('ca', 'us')),
  event_type TEXT,                    -- 'roadwork' | 'incident' | 'weather' | 'road_condition' | 'notice' ...
  title TEXT,
  description TEXT,
  roadway TEXT,
  direction_of_travel TEXT,
  lanes_affected TEXT,
  is_full_closure INTEGER,
  severity TEXT,
  latitude REAL,
  longitude REAL,
  starts_at TEXT,                     -- planned events can start in the future
  ends_at TEXT,
  reported_at TEXT,                   -- the source's own timestamp (UTC ISO 8601)
  first_seen_at TEXT NOT NULL,        -- when our collector first saw it
  last_seen_at TEXT NOT NULL,         -- when our collector last saw it
  raw TEXT,                           -- the source's item, as JSON, for re-derivation
  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_alerts_last_seen ON alerts (last_seen_at);

-- Which crossings an alert affects. Many-to-many: a Windsor weather warning
-- covers both the Ambassador and the tunnel.
CREATE TABLE IF NOT EXISTS alert_crossings (
  alert_id INTEGER NOT NULL REFERENCES alerts(id),
  crossing_id INTEGER NOT NULL REFERENCES crossings(id),
  PRIMARY KEY (alert_id, crossing_id)
);

-- Official Bank of Canada daily exchange rate, one row per business day —
-- so tolls can display in both currencies without a driver doing math.
CREATE TABLE IF NOT EXISTS fx_rates (
  date TEXT NOT NULL,                 -- the observation date (Bank of Canada's)
  pair TEXT NOT NULL,                 -- 'USDCAD'
  rate REAL NOT NULL,
  fetched_at TEXT NOT NULL,
  PRIMARY KEY (date, pair)
);

-- First-party, cookieless analytics: coarse daily tallies only. No cookies,
-- no IP or user-agent, no per-visitor id, no full URLs — just enough to see
-- whether the site is used and where visitors arrive from. Written by the
-- site's /api/hit beacon, read by /api/stats.
CREATE TABLE IF NOT EXISTS analytics (
  day TEXT NOT NULL,                 -- YYYY-MM-DD, America/Detroit
  metric TEXT NOT NULL,              -- 'view' | 'ref' | 'dir' | 'veh'
  key TEXT NOT NULL,                 -- '' for view; referrer host; 'to_us'; 'truck' ...
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, metric, key)
);

-- The crossings we launch with. Tunnel and Blue Water are archived from day one
-- (the archive cannot be backfilled); Gordie Howe activates when its feed appears.
INSERT OR IGNORE INTO crossings (id, slug, name, cbp_port_name, cbp_crossing_name, cbsa_office_name, active) VALUES
  (1, 'ambassador-bridge',  'ambassador bridge',      'Detroit',    'Ambassador Bridge', 'Ambassador Bridge',         1),
  (2, 'gordie-howe-bridge', 'gordie howe bridge',     NULL,         NULL,                NULL,                        0),
  (3, 'detroit-windsor-tunnel', 'detroit–windsor tunnel', 'Detroit', 'Windsor Tunnel',   'Windsor and Detroit Tunnel', 1),
  (4, 'blue-water-bridge',  'blue water bridge',      'Port Huron', 'Bluewater Bridge',  'Blue Water Bridge',         1);
