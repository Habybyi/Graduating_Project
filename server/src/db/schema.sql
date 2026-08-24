-- Schema mirrors Documentation/Architecture/Data_Model.md exactly.
-- SQLite has no array/JSON type, so embeddingVector and metadata are
-- stored as JSON-encoded TEXT and parsed/serialized in application code.

CREATE TABLE IF NOT EXISTS users (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  username            TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  role                TEXT NOT NULL,               -- 'driver' | 'manager' today, extensible (see Roles_And_Onboarding.md)
  must_change_password INTEGER NOT NULL DEFAULT 1,  -- boolean: 0/1
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  name                   TEXT NOT NULL,
  address                TEXT,
  superfaktura_client_id INTEGER,
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  unit_type  TEXT NOT NULL CHECK (unit_type IN ('piece', 'whole')),
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_prototypes (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id         INTEGER NOT NULL REFERENCES products(id),
  embedding_vector   TEXT NOT NULL,   -- JSON-encoded float array
  source_photo_count INTEGER NOT NULL DEFAULT 1,
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS test_images (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL REFERENCES products(id),
  image_ref        TEXT NOT NULL,   -- local path, persisted (see Test_Plan.md)
  embedding_vector TEXT,            -- JSON-encoded float array, nullable (cached lazily)
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_notes (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id           INTEGER NOT NULL REFERENCES customers(id),
  created_by_user_id    INTEGER NOT NULL REFERENCES users(id),
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'processing', 'ready_for_review', 'invoiced')),
  superfaktura_doc_id   INTEGER,
  superfaktura_token    TEXT, -- required alongside the doc id to fetch the PDF later
  superfaktura_number   TEXT, -- human-readable doc number, e.g. "DOD2026001" — safe to show in the UI
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS delivery_sessions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  token            TEXT NOT NULL UNIQUE,
  delivery_note_id INTEGER NOT NULL REFERENCES delivery_notes(id),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'expired', 'completed')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_note_id      INTEGER NOT NULL REFERENCES delivery_notes(id),
  product_id            INTEGER NOT NULL REFERENCES products(id),
  quantity               INTEGER NOT NULL,
  ai_confidence          REAL,   -- nullable: null if entered fully manually
  was_manually_corrected INTEGER NOT NULL DEFAULT 0,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(delivery_note_id, product_id) -- adding the same product again merges quantity instead of a duplicate row
);

CREATE TABLE IF NOT EXISTS activity_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  user_role   TEXT NOT NULL,   -- snapshot of the role at the time of the action
  action      TEXT NOT NULL,   -- e.g. 'product.created' — see Activity_Log.md
  entity_type TEXT NOT NULL,   -- 'Product' | 'DeliveryNote' | 'User'
  entity_id   INTEGER NOT NULL,
  summary     TEXT NOT NULL,
  metadata    TEXT,            -- JSON-encoded, nullable
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_delivery_notes_status ON delivery_notes(status);
CREATE INDEX IF NOT EXISTS idx_delivery_note_items_note ON delivery_note_items(delivery_note_id);
CREATE INDEX IF NOT EXISTS idx_product_prototypes_product ON product_prototypes(product_id);
CREATE INDEX IF NOT EXISTS idx_test_images_product ON test_images(product_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
