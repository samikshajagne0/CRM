-- ============================================================
-- ASTURA GLOBAL CRM — AUTH & ADMIN SCHEMA PATCH
-- Run this AFTER schema.sql in your Neon SQL Editor
-- ============================================================

-- ── ROLES ────────────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'sales', 'manager');

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role_new   user_role DEFAULT 'sales',
  ADD COLUMN IF NOT EXISTS avatar     VARCHAR(10) DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Set Vinay as admin
UPDATE users SET role_new = 'admin'  WHERE name = 'Vinay';
UPDATE users SET role_new = 'manager' WHERE name = 'Prasoon';
UPDATE users SET role_new = 'sales'  WHERE name = 'Kishore';

-- ── OTP TOKENS ───────────────────────────────────────────────
CREATE TABLE otp_tokens (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(150) NOT NULL,
  otp_hash    VARCHAR(64)  NOT NULL,
  expires_at  TIMESTAMPTZ  NOT NULL,
  used        BOOLEAN      DEFAULT FALSE,
  attempts    INT          DEFAULT 0,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_otp_email ON otp_tokens(email);

-- ── SESSIONS ─────────────────────────────────────────────────
CREATE TABLE sessions (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE CASCADE,
  token_hash  VARCHAR(64) NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  ip_address  VARCHAR(50),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_user  ON sessions(user_id);

-- ── DYNAMIC LOV CONFIG ───────────────────────────────────────
-- Stores all dropdown values so admins can manage them in UI
CREATE TABLE lov_config (
  id          SERIAL PRIMARY KEY,
  category    VARCHAR(100) NOT NULL,  -- e.g. 'opportunity_stage', 'industry'
  value       VARCHAR(200) NOT NULL,
  label       VARCHAR(200) NOT NULL,
  sort_order  INT          DEFAULT 0,
  active      BOOLEAN      DEFAULT TRUE,
  created_at  TIMESTAMPTZ  DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE(category, value)
);

CREATE INDEX idx_lov_category ON lov_config(category);

-- Seed LOV values (mirrors the hardcoded ENUMs)
INSERT INTO lov_config (category, value, label, sort_order) VALUES
-- Opportunity stages
('opportunity_stage','Lead','Lead',1),
('opportunity_stage','Qualified','Qualified',2),
('opportunity_stage','Proposal','Proposal',3),
('opportunity_stage','Demo','Demo',4),
('opportunity_stage','Negotiation','Negotiation',5),
('opportunity_stage','Verbal Approval','Verbal Approval',6),
('opportunity_stage','Won','Won',7),
('opportunity_stage','Lost','Lost',8),
('opportunity_stage','On Hold','On Hold',9),
-- Lead sources
('lead_source','Direct','Direct',1),
('lead_source','Referral','Referral',2),
('lead_source','LinkedIn','LinkedIn',3),
('lead_source','Email Campaign','Email Campaign',4),
('lead_source','Event','Event',5),
('lead_source','Website','Website',6),
('lead_source','Partner','Partner',7),
('lead_source','Cold Call','Cold Call',8),
('lead_source','Other','Other',9),
-- Industries
('industry','Banking','Banking',1),
('industry','Financial Services','Financial Services',2),
('industry','Insurance','Insurance',3),
('industry','Asset Management','Asset Management',4),
('industry','Microfinance','Microfinance',5),
('industry','NBFCs','NBFCs',6),
('industry','Healthcare','Healthcare',7),
('industry','Manufacturing','Manufacturing',8),
('industry','IT Services','IT Services',9),
('industry','Retail','Retail',10),
('industry','Government','Government',11),
('industry','Education','Education',12),
('industry','Other','Other',13),
-- Account types
('account_type','Prospect','Prospect',1),
('account_type','Customer','Customer',2),
('account_type','Partner','Partner',3),
('account_type','Vendor','Vendor',4),
('account_type','Competitor','Competitor',5),
('account_type','Other','Other',6),
-- Activity types
('activity_type','Call','Call',1),
('activity_type','Meeting','Meeting',2),
('activity_type','Email','Email',3),
('activity_type','Demo','Demo',4),
('activity_type','Follow-up','Follow-up',5),
('activity_type','WhatsApp','WhatsApp',6),
('activity_type','Video Call','Video Call',7),
('activity_type','Site Visit','Site Visit',8),
('activity_type','Proposal Sent','Proposal Sent',9),
('activity_type','Other','Other',10),
-- Task priorities
('task_priority','Low','Low',1),
('task_priority','Medium','Medium',2),
('task_priority','High','High',3),
('task_priority','Critical','Critical',4),
-- Task statuses
('task_status','Not Started','Not Started',1),
('task_status','In Progress','In Progress',2),
('task_status','Completed','Completed',3),
('task_status','Deferred','Deferred',4),
('task_status','Cancelled','Cancelled',5),
-- Invoice statuses
('invoice_status','Draft','Draft',1),
('invoice_status','Sent','Sent',2),
('invoice_status','Paid','Paid',3),
('invoice_status','Overdue','Overdue',4),
('invoice_status','Partial','Partial',5),
('invoice_status','Cancelled','Cancelled',6),
-- Payment modes
('payment_mode','NEFT','NEFT',1),
('payment_mode','RTGS','RTGS',2),
('payment_mode','IMPS','IMPS',3),
('payment_mode','UPI','UPI',4),
('payment_mode','Cheque','Cheque',5),
('payment_mode','DD','DD',6),
('payment_mode','Cash','Cash',7),
('payment_mode','Other','Other',8),
-- Project statuses
('project_status','Not Started','Not Started',1),
('project_status','In Progress','In Progress',2),
('project_status','On Hold','On Hold',3),
('project_status','Completed','Completed',4),
('project_status','Cancelled','Cancelled',5),
-- Project health
('project_health','On Track','On Track',1),
('project_health','At Risk','At Risk',2),
('project_health','Off Track','Off Track',3),
('project_health','Completed','Completed',4),
-- Entities
('entity','Astura Global Pvt Ltd','Astura Global Pvt Ltd',1),
('entity','Headwy','Headwy',2),
('entity','Intelezen','Intelezen',3),
('entity','Other','Other',4),
-- Collection statuses
('collection_status','Pending','Pending',1),
('collection_status','Promised','Promised',2),
('collection_status','Partial','Partial',3),
('collection_status','Cleared','Cleared',4),
('collection_status','Disputed','Disputed',5),
('collection_status','Written Off','Written Off',6),
-- Escalation levels
('escalation_level','None','None',1),
('escalation_level','L1','L1',2),
('escalation_level','L2','L2',3),
('escalation_level','CFO','CFO',4),
('escalation_level','Legal','Legal',5),
-- Payment schedule statuses
('payment_schedule_status','Upcoming','Upcoming',1),
('payment_schedule_status','Due','Due',2),
('payment_schedule_status','Overdue','Overdue',3),
('payment_schedule_status','Received','Received',4),
('payment_schedule_status','Partial','Partial',5),
('payment_schedule_status','Waived','Waived',6),
-- Currencies
('currency','INR','INR',1),
('currency','USD','USD',2),
('currency','EUR','EUR',3),
('currency','GBP','GBP',4),
('currency','AED','AED',5),
('currency','SGD','SGD',6);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE audit_log (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  user_name   VARCHAR(100),
  action      VARCHAR(20) NOT NULL,  -- CREATE, UPDATE, DELETE
  module      VARCHAR(50) NOT NULL,  -- opportunities, accounts, etc.
  record_id   INT,
  record_name VARCHAR(255),
  changes     JSONB,
  ip_address  VARCHAR(50),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user   ON audit_log(user_id);
CREATE INDEX idx_audit_module ON audit_log(module);
CREATE INDEX idx_audit_time   ON audit_log(created_at);

-- ── TRIGGER: lov_config updated_at ───────────────────────────
CREATE TRIGGER trg_lov_config_updated_at
  BEFORE UPDATE ON lov_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── SEED ADMIN USER ──────────────────────────────────────────
-- Password is set via the admin panel on first login
-- Replace email below with your actual admin email
UPDATE users SET
  email = 'admin@asturaglobal.com',
  role_new = 'admin',
  active = TRUE
WHERE name = 'Vinay';
