-- Migration 001: cấu trúc dữ liệu V1 theo docs/MO_HINH_DU_LIEU.md
-- Thời gian: *_at là instant UTC ISO 8601; *_date là ngày YYYY-MM-DD theo giờ Việt Nam.

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'luan_van',
  notes TEXT,
  defense_day INTEGER CHECK (defense_day IS NULL OR defense_day BETWEEN 1 AND 31),
  defense_month INTEGER CHECK (defense_month IS NULL OR defense_month BETWEEN 1 AND 12),
  defense_year INTEGER CHECK (defense_year IS NULL OR defense_year BETWEEN 2000 AND 2100),
  defense_time TEXT,
  defense_location TEXT,
  date_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (date_confirmed IN (0, 1)),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (date_confirmed = 0 OR (defense_day IS NOT NULL AND defense_month IS NOT NULL AND defense_year IS NOT NULL))
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  category TEXT NOT NULL CHECK (category IN ('lesson', 'material', 'official', 'thesis')),
  summary TEXT,
  subject TEXT,
  grade TEXT,
  school_year TEXT,
  material_type TEXT,
  tech_branch TEXT,
  source_url TEXT,
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  archived_at TEXT,
  current_version_id TEXT REFERENCES document_versions(id),
  last_opened_at TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_documents_category ON documents(category, archived_at);
CREATE INDEX idx_documents_filters ON documents(subject, grade, school_year);
CREATE INDEX idx_documents_updated ON documents(updated_at);

CREATE TABLE document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  version_label TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_versions_document ON document_versions(document_id);

-- Bản hiện hành phải thuộc đúng tài liệu (một trường tham chiếu, không có cờ current song song)
CREATE TRIGGER trg_documents_current_version_ins BEFORE INSERT ON documents
WHEN NEW.current_version_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM document_versions v WHERE v.id = NEW.current_version_id AND v.document_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'current_version_mismatch'); END;
CREATE TRIGGER trg_documents_current_version_upd BEFORE UPDATE OF current_version_id ON documents
WHEN NEW.current_version_id IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM document_versions v WHERE v.id = NEW.current_version_id AND v.document_id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'current_version_mismatch'); END;

CREATE TABLE attachments (
  id TEXT PRIMARY KEY,
  version_id TEXT NOT NULL REFERENCES document_versions(id),
  stored_relative_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  mime TEXT,
  bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_attachments_version ON attachments(version_id);
CREATE INDEX idx_attachments_sha ON attachments(sha256);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  label_norm TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE document_tags (
  document_id TEXT NOT NULL REFERENCES documents(id),
  tag_id TEXT NOT NULL REFERENCES tags(id),
  PRIMARY KEY (document_id, tag_id)
);
CREATE INDEX idx_document_tags_tag ON document_tags(tag_id);

CREATE TABLE document_relations (
  document_id TEXT NOT NULL REFERENCES documents(id),
  related_document_id TEXT NOT NULL REFERENCES documents(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (document_id, related_document_id),
  CHECK (document_id <> related_document_id)
);

CREATE TABLE lesson_plans (
  document_id TEXT PRIMARY KEY REFERENCES documents(id),
  semester TEXT CHECK (semester IS NULL OR semester IN ('HK1', 'HK2')),
  class_label TEXT,
  lesson_title TEXT,
  periods INTEGER CHECK (periods IS NULL OR periods BETWEEN 1 AND 50),
  status TEXT NOT NULL DEFAULT 'dang_soan' CHECK (status IN ('dang_soan', 'san_sang', 'da_day', 'can_dieu_chinh')),
  reflection TEXT
);

CREATE TABLE official_documents (
  document_id TEXT PRIMARY KEY REFERENCES documents(id),
  number TEXT,
  issuer TEXT,
  document_type TEXT,
  field TEXT,
  issued_date TEXT,
  validity_status TEXT NOT NULL DEFAULT 'chua_kiem_tra'
    CHECK (validity_status IN ('chua_kiem_tra', 'con_hieu_luc', 'het_hieu_luc', 'khong_ap_dung')),
  validity_source TEXT,
  checked_date TEXT,
  action_note TEXT,
  -- Chỉ được ghi còn/hết hiệu lực khi có nguồn và ngày kiểm tra
  CHECK (validity_status IN ('chua_kiem_tra', 'khong_ap_dung') OR (validity_source IS NOT NULL AND checked_date IS NOT NULL))
);
CREATE INDEX idx_official_number ON official_documents(number);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  notes TEXT,
  due_date TEXT,
  due_at TEXT,
  priority TEXT NOT NULL DEFAULT 'trung_binh' CHECK (priority IN ('cao', 'trung_binh', 'thap')),
  status TEXT NOT NULL DEFAULT 'chua_lam' CHECK (status IN ('chua_lam', 'dang_lam', 'cho_phan_hoi', 'hoan_tat', 'huy')),
  project_id TEXT REFERENCES projects(id),
  phase TEXT CHECK (phase IS NULL OR phase IN ('truoc_bao_ve', 'sau_bao_ve')),
  required_for_progress INTEGER NOT NULL DEFAULT 0 CHECK (required_for_progress IN (0, 1)),
  completed_at TEXT,
  archived_at TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (due_date IS NULL OR due_at IS NULL)
);
CREATE INDEX idx_tasks_due ON tasks(due_date, due_at);
CREATE INDEX idx_tasks_status ON tasks(status, archived_at);
CREATE INDEX idx_tasks_project ON tasks(project_id);

CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  sender TEXT,
  received_date TEXT,
  note TEXT,
  source_url TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'chua_xu_li' CHECK (status IN ('chua_xu_li', 'dang_xu_li', 'cho_phan_hoi', 'hoan_tat')),
  archived_at TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_emails_status ON emails(status, archived_at);

CREATE TABLE task_documents (
  task_id TEXT NOT NULL REFERENCES tasks(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  PRIMARY KEY (task_id, document_id)
);
CREATE INDEX idx_task_documents_doc ON task_documents(document_id);
CREATE TABLE task_emails (
  task_id TEXT NOT NULL REFERENCES tasks(id),
  email_id TEXT NOT NULL REFERENCES emails(id),
  PRIMARY KEY (task_id, email_id)
);
CREATE INDEX idx_task_emails_email ON task_emails(email_id);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  notes TEXT,
  all_day INTEGER NOT NULL CHECK (all_day IN (0, 1)),
  start_at TEXT,
  end_at TEXT,
  start_date TEXT,
  end_date TEXT, -- ngày kết thúc KHÔNG bao gồm (exclusive)
  location TEXT,
  project_id TEXT REFERENCES projects(id),
  linked_task_id TEXT REFERENCES tasks(id),
  document_id TEXT REFERENCES documents(id),
  archived_at TEXT,
  search_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (all_day = 1 AND start_date IS NOT NULL AND end_date IS NOT NULL AND end_date > start_date AND start_at IS NULL AND end_at IS NULL)
    OR
    (all_day = 0 AND start_at IS NOT NULL AND start_date IS NULL AND end_date IS NULL AND (end_at IS NULL OR end_at >= start_at))
  )
);
CREATE INDEX idx_events_range ON events(start_date, end_date);
CREATE INDEX idx_events_range_at ON events(start_at, end_at);

CREATE TABLE project_documents (
  project_id TEXT NOT NULL REFERENCES projects(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  PRIMARY KEY (project_id, document_id)
);

CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  document_version_id TEXT REFERENCES document_versions(id),
  reviewer TEXT,
  content TEXT NOT NULL CHECK (length(trim(content)) > 0),
  section_ref TEXT,
  response_note TEXT,
  linked_task_id TEXT REFERENCES tasks(id),
  status TEXT NOT NULL DEFAULT 'moi' CHECK (status IN ('moi', 'dang_giai_trinh', 'da_giai_trinh', 'khong_tiep_thu')),
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_feedback_project ON feedback(project_id);

-- Dự án luận văn: chỉ có ngày/tháng 25/10 do người dùng cung cấp. Năm, giờ, địa điểm để trống; chưa xác nhận.
INSERT INTO projects (id, name, kind, defense_day, defense_month, date_confirmed, created_at, updated_at)
VALUES ('prj_luan_van', 'Luận văn thạc sĩ', 'luan_van', 25, 10, 0, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
