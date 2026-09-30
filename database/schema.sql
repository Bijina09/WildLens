PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    user_id       INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'user'   CHECK (role   IN ('user','admin')),
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login    TEXT
);

CREATE TABLE IF NOT EXISTS model_versions (
    model_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    version_name     TEXT NOT NULL UNIQUE,
    stage1_path      TEXT NOT NULL,
    stage2_path      TEXT NOT NULL,
    dataset_version  TEXT,
    stage1_accuracy  REAL,
    precision_score  REAL,
    recall_score     REAL,
    map50            REAL,
    map50_95         REAL,
    status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','validated','active','archived')),
    notes            TEXT,
    created_at       TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    activated_at     TEXT,
    activated_by     INTEGER REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS predictions (
    prediction_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id            INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    model_id           INTEGER NOT NULL REFERENCES model_versions(model_id),
    batch_id           TEXT,
    original_filename  TEXT NOT NULL,
    image_path         TEXT NOT NULL,
    final_label        TEXT NOT NULL CHECK (final_label IN ('wildlife','blank','unidentified')),
    stage1_label       TEXT NOT NULL,
    stage1_confidence  REAL,
    species            TEXT,
    stage2_confidence  REAL,
    bbox               TEXT,          -- JSON: [x1,y1,x2,y2] or a list of boxes
    processing_time_ms INTEGER,
    created_at         TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_pred_user  ON predictions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_pred_batch ON predictions(batch_id);

CREATE TABLE IF NOT EXISTS training_data (
    training_data_id  INTEGER PRIMARY KEY AUTOINCREMENT,
    prediction_id     INTEGER NOT NULL UNIQUE REFERENCES predictions(prediction_id) ON DELETE CASCADE,
    image_path        TEXT NOT NULL,   -- a copy, so it survives if the user deletes history
    predicted_species TEXT,
    actual_species    TEXT,            -- admin's correction
    bbox              TEXT,            -- YOLO needs boxes, not only class names
    review_status     TEXT NOT NULL DEFAULT 'pending'
                      CHECK (review_status IN ('pending','approved','rejected')),
    reviewed_by       INTEGER REFERENCES users(user_id),
    reviewed_at       TEXT,
    dataset_version   TEXT,
    created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);