-- ============================================================
-- ASTURA GLOBAL CRM — NEON POSTGRESQL SCHEMA
-- Run this script once in your Neon SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE entity_type AS ENUM (
  'Astura Global Pvt Ltd', 'Headwy', 'Intelezen', 'Other'
);

CREATE TYPE account_type AS ENUM (
  'Prospect', 'Customer', 'Partner', 'Vendor', 'Competitor', 'Other'
);

CREATE TYPE industry_type AS ENUM (
  'Banking', 'Financial Services', 'Insurance', 'Asset Management',
  'Microfinance', 'NBFCs', 'Healthcare', 'Manufacturing',
  'IT Services', 'Retail', 'Government', 'Education', 'Other'
);

CREATE TYPE opportunity_stage AS ENUM (
  'Lead', 'Qualified', 'Proposal', 'Demo', 'Negotiation',
  'Verbal Approval', 'Won', 'Lost', 'On Hold'
);

CREATE TYPE lead_source AS ENUM (
  'Direct', 'Referral', 'LinkedIn', 'Email Campaign',
  'Event', 'Website', 'Partner', 'Cold Call', 'Other'
);

CREATE TYPE project_status AS ENUM (
  'Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'
);

CREATE TYPE project_health AS ENUM (
  'On Track', 'At Risk', 'Off Track', 'Completed'
);

CREATE TYPE invoice_status AS ENUM (
  'Draft', 'Sent', 'Paid', 'Overdue', 'Partial', 'Cancelled'
);

CREATE TYPE payment_mode AS ENUM (
  'NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'DD', 'Cash', 'Other'
);

CREATE TYPE payment_status AS ENUM (
  'Upcoming', 'Due', 'Overdue', 'Received', 'Partial', 'Waived'
);

CREATE TYPE collection_status AS ENUM (
  'Pending', 'Promised', 'Partial', 'Cleared', 'Disputed', 'Written Off'
);

CREATE TYPE escalation_level AS ENUM (
  'None', 'L1', 'L2', 'CFO', 'Legal'
);

CREATE TYPE activity_type AS ENUM (
  'Call', 'Meeting', 'Email', 'Demo', 'Follow-up',
  'WhatsApp', 'Video Call', 'Site Visit', 'Proposal Sent', 'Other'
);

CREATE TYPE task_priority AS ENUM (
  'Low', 'Medium', 'High', 'Critical'
);

CREATE TYPE task_status AS ENUM (
  'Not Started', 'In Progress', 'Completed', 'Deferred', 'Cancelled'
);

CREATE TYPE currency_type AS ENUM (
  'INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'
);

CREATE TYPE related_module AS ENUM (
  'Opportunity', 'Project', 'Account', 'Contact', 'Invoice'
);

-- ============================================================
-- USERS (Sales Team)
-- ============================================================

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  role          VARCHAR(50) DEFAULT 'Sales',
  entity        entity_type DEFAULT 'Astura Global Pvt Ltd',
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);



-- ============================================================
-- ACCOUNTS
-- ============================================================

CREATE TABLE accounts (
  id                SERIAL PRIMARY KEY,
  account_id        VARCHAR(20) UNIQUE NOT NULL DEFAULT CONCAT('ACC-', LPAD(NEXTVAL('account_seq')::TEXT, 3, '0')),
  account_name      VARCHAR(200) NOT NULL,
  type              account_type DEFAULT 'Prospect',
  industry          industry_type DEFAULT 'Other',
  entity            entity_type DEFAULT 'Astura Global Pvt Ltd',
  relationship_owner_id INT REFERENCES users(id),
  primary_contact   VARCHAR(100),
  email             VARCHAR(150),
  phone             VARCHAR(20),
  address           TEXT,
  city              VARCHAR(100),
  country           VARCHAR(100) DEFAULT 'India',
  website           VARCHAR(255),
  total_revenue     NUMERIC(15,2) DEFAULT 0,
  last_activity     DATE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE account_seq START 1;

-- ============================================================
-- CONTACTS
-- ============================================================

CREATE TABLE contacts (
  id              SERIAL PRIMARY KEY,
  contact_id      VARCHAR(20) UNIQUE NOT NULL,
  full_name       VARCHAR(150) NOT NULL,
  account_id      INT REFERENCES accounts(id) ON DELETE SET NULL,
  title           VARCHAR(100),
  department      VARCHAR(100),
  email           VARCHAR(150),
  phone           VARCHAR(20),
  mobile          VARCHAR(20),
  linkedin        VARCHAR(255),
  decision_maker  BOOLEAN DEFAULT FALSE,
  last_contact    DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE contact_seq START 1;

-- ============================================================
-- OPPORTUNITIES
-- ============================================================

CREATE TABLE opportunities (
  id                  SERIAL PRIMARY KEY,
  opportunity_id      VARCHAR(20) UNIQUE NOT NULL,
  opportunity_name    VARCHAR(200) NOT NULL,
  account_id          INT REFERENCES accounts(id) ON DELETE SET NULL,
  website             VARCHAR(255),
  entity              entity_type DEFAULT 'Astura Global Pvt Ltd',
  stage               opportunity_stage DEFAULT 'Lead',
  probability         INT DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  value               NUMERIC(15,2) DEFAULT 0,
  currency            currency_type DEFAULT 'INR',
  expected_close      DATE,
  owner_id            INT REFERENCES users(id),
  contact_id          INT REFERENCES contacts(id) ON DELETE SET NULL,
  source              lead_source DEFAULT 'Direct',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  last_activity       DATE,
  next_action         TEXT,
  next_action_date    DATE,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE opportunity_seq START 1;

-- ============================================================
-- PROJECTS
-- ============================================================

CREATE TABLE projects (
  id                SERIAL PRIMARY KEY,
  project_id        VARCHAR(20) UNIQUE NOT NULL,
  project_name      VARCHAR(200) NOT NULL,
  account_id        INT REFERENCES accounts(id) ON DELETE SET NULL,
  entity            entity_type DEFAULT 'Astura Global Pvt Ltd',
  status            project_status DEFAULT 'Not Started',
  start_date        DATE,
  end_date          DATE,
  contract_value    NUMERIC(15,2) DEFAULT 0,
  invoiced          NUMERIC(15,2) DEFAULT 0,
  received          NUMERIC(15,2) DEFAULT 0,
  pending           NUMERIC(15,2) GENERATED ALWAYS AS (invoiced - received) STORED,
  total_milestones  INT DEFAULT 0,
  completed_milestones INT DEFAULT 0,
  pct_complete      NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_milestones > 0
    THEN ROUND((completed_milestones::NUMERIC / total_milestones) * 100, 2)
    ELSE 0 END
  ) STORED,
  project_manager_id INT REFERENCES users(id),
  health            project_health DEFAULT 'On Track',
  next_milestone    VARCHAR(255),
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE project_seq START 1;

-- ============================================================
-- INVOICES
-- ============================================================

CREATE TABLE invoices (
  id              SERIAL PRIMARY KEY,
  invoice_no      VARCHAR(30) UNIQUE NOT NULL,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  account_id      INT REFERENCES accounts(id) ON DELETE SET NULL,
  entity          entity_type DEFAULT 'Astura Global Pvt Ltd',
  project_id      INT REFERENCES projects(id) ON DELETE SET NULL,
  opportunity_id  INT REFERENCES opportunities(id) ON DELETE SET NULL,
  description     TEXT,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  gst_rate        NUMERIC(5,2) DEFAULT 18.00,
  gst             NUMERIC(15,2) GENERATED ALWAYS AS (ROUND(amount * gst_rate / 100, 2)) STORED,
  total           NUMERIC(15,2) GENERATED ALWAYS AS (ROUND(amount + (amount * gst_rate / 100), 2)) STORED,
  currency        currency_type DEFAULT 'INR',
  status          invoice_status DEFAULT 'Draft',
  payment_date    DATE,
  received        NUMERIC(15,2) DEFAULT 0,
  tds             NUMERIC(15,2) DEFAULT 0,
  net             NUMERIC(15,2) GENERATED ALWAYS AS (received - tds) STORED,
  payment_mode    payment_mode,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto days_overdue view
CREATE OR REPLACE VIEW invoices_with_overdue AS
SELECT *,
  CASE
    WHEN status NOT IN ('Paid', 'Cancelled') AND due_date < CURRENT_DATE
    THEN (CURRENT_DATE - due_date)
    ELSE 0
  END AS days_overdue
FROM invoices;

-- ============================================================
-- PAYMENT SCHEDULE
-- ============================================================

CREATE TABLE payment_schedule (
  id                SERIAL PRIMARY KEY,
  account_id        INT REFERENCES accounts(id) ON DELETE SET NULL,
  entity            entity_type DEFAULT 'Astura Global Pvt Ltd',
  project_id        INT REFERENCES projects(id) ON DELETE SET NULL,
  milestone         VARCHAR(255),
  expected_amount   NUMERIC(15,2) DEFAULT 0,
  expected_date     DATE,
  invoice_raised    BOOLEAN DEFAULT FALSE,
  invoice_id        INT REFERENCES invoices(id) ON DELETE SET NULL,
  invoice_date      DATE,
  received          BOOLEAN DEFAULT FALSE,
  amount_received   NUMERIC(15,2) DEFAULT 0,
  variance          NUMERIC(15,2) GENERATED ALWAYS AS (expected_amount - amount_received) STORED,
  status            payment_status DEFAULT 'Upcoming',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Auto days_until_due view
CREATE OR REPLACE VIEW payment_schedule_with_days AS
SELECT *,
  (expected_date - CURRENT_DATE) AS days_until_due
FROM payment_schedule;

-- ============================================================
-- COLLECTIONS & FOLLOW-UPS
-- ============================================================

CREATE TABLE collections (
  id                SERIAL PRIMARY KEY,
  invoice_id        INT REFERENCES invoices(id) ON DELETE CASCADE,
  account_id        INT REFERENCES accounts(id) ON DELETE SET NULL,
  entity            entity_type DEFAULT 'Astura Global Pvt Ltd',
  amount            NUMERIC(15,2) DEFAULT 0,
  due_date          DATE,
  last_reminder     DATE,
  reminder_count    INT DEFAULT 0,
  next_action       TEXT,
  next_action_date  DATE,
  contact_id        INT REFERENCES contacts(id) ON DELETE SET NULL,
  email             VARCHAR(150),
  escalation        escalation_level DEFAULT 'None',
  response          TEXT,
  status            collection_status DEFAULT 'Pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE VIEW collections_with_overdue AS
SELECT *,
  CASE
    WHEN status NOT IN ('Cleared', 'Written Off') AND due_date < CURRENT_DATE
    THEN (CURRENT_DATE - due_date)
    ELSE 0
  END AS days_overdue
FROM collections;

-- ============================================================
-- ACTIVITIES
-- ============================================================

CREATE TABLE activities (
  id              SERIAL PRIMARY KEY,
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  type            activity_type NOT NULL,
  subject         VARCHAR(255) NOT NULL,
  related_module  related_module,
  related_id      INT,
  account_id      INT REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id      INT REFERENCES contacts(id) ON DELETE SET NULL,
  owner_id        INT REFERENCES users(id),
  entity          entity_type DEFAULT 'Astura Global Pvt Ltd',
  outcome         TEXT,
  next_steps      TEXT,
  next_date       DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TASKS
-- ============================================================

CREATE TABLE tasks (
  id              SERIAL PRIMARY KEY,
  task_id         VARCHAR(20) UNIQUE NOT NULL,
  task            VARCHAR(500) NOT NULL,
  related_module  related_module,
  related_id      INT,
  account_id      INT REFERENCES accounts(id) ON DELETE SET NULL,
  due_date        DATE,
  priority        task_priority DEFAULT 'Medium',
  status          task_status DEFAULT 'Not Started',
  assigned_to_id  INT REFERENCES users(id),
  created_by_id   INT REFERENCES users(id),
  created_date    DATE DEFAULT CURRENT_DATE,
  completed_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE task_seq START 1;

-- ============================================================
-- QUARTERLY TRACKING
-- ============================================================

CREATE TABLE quarterly_tracking (
  id              SERIAL PRIMARY KEY,
  month           VARCHAR(20) NOT NULL,
  account_id      INT REFERENCES accounts(id) ON DELETE SET NULL,
  offering        VARCHAR(255),
  planned_meeting VARCHAR(255),
  remark_1        TEXT,
  remark_2        TEXT,
  remark_3        TEXT,
  owner_id        INT REFERENCES users(id),
  entity          entity_type DEFAULT 'Astura Global Pvt Ltd',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIGGERS — updated_at auto-update
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'accounts','contacts','opportunities','projects',
    'invoices','payment_schedule','collections',
    'activities','tasks','quarterly_tracking'
  ] LOOP
    EXECUTE FORMAT(
      'CREATE TRIGGER trg_%s_updated_at
       BEFORE UPDATE ON %s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ============================================================
-- INDEXES for performance
-- ============================================================

CREATE INDEX idx_opp_account ON opportunities(account_id);
CREATE INDEX idx_opp_owner ON opportunities(owner_id);
CREATE INDEX idx_opp_stage ON opportunities(stage);
CREATE INDEX idx_opp_close ON opportunities(expected_close);
CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_projects_account ON projects(account_id);
CREATE INDEX idx_invoices_account ON invoices(account_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due ON invoices(due_date);
CREATE INDEX idx_collections_invoice ON collections(invoice_id);
CREATE INDEX idx_activities_account ON activities(account_id);
CREATE INDEX idx_activities_date ON activities(date);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to_id);
CREATE INDEX idx_tasks_due ON tasks(due_date);
CREATE INDEX idx_tasks_status ON tasks(status);

-- ============================================================
-- 
