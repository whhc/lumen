-- 创建媒体记录表
CREATE TABLE IF NOT EXISTS media_records (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    width INTEGER,
    height INTEGER,
    duration REAL,
    thumbnail_path TEXT,
    taken_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    tags TEXT, -- JSON 字符串存储标签数组
    album_ids TEXT, -- JSON 字符串存储相册ID数组
    face_count INTEGER
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_media_records_path ON media_records(path);
CREATE INDEX IF NOT EXISTS idx_media_records_kind ON media_records(kind);
CREATE INDEX IF NOT EXISTS idx_media_records_taken_date ON media_records(taken_date);
CREATE INDEX IF NOT EXISTS idx_media_records_created_at ON media_records(created_at);