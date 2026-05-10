// ============================================================
// ASTURA GLOBAL CRM — EXPRESS BACKEND (with Auth)
// ============================================================
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import MockPool from './mock_db.js';
import {
  requestOTP, verifyOTP, logout, getMe,
  authenticate, requireAdmin, requireManager, audit
} from './auth_routes.js';
import {
  getUsers, createUser, updateUser, deactivateUser, resetUserSessions,
  getLovCategories, getLovByCategory, getPublicLov,
  createLovValue, updateLovValue, deleteLovValue,
  getAuditLog, getAdminStats
} from './admin_routes.js';

const app = express();
const { Pool } = pg;

let pool;
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('username:password')) {
  console.log('⚠️  DATABASE_URL not set or placeholder detected. Using Mock Database.');
  pool = new MockPool();
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

// Allow all localhost origins in dev (covers port 5173, 5174, etc.)
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
].filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g. curl, Postman) or from allowed list
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('http://localhost')) {
      cb(null, true);
    } else {
      cb(new Error('CORS: origin not allowed'));
    }
  },
  credentials: true,
}));
app.use(express.json());

// Attach pool to req for convenience in handler functions
app.use((req, _, next) => { req.pool = pool; next(); });

const q = (text, params) => pool.query(text, params);
const auth = authenticate(pool);

// ── Audit wrapper ─────────────────────────────────────────────
const withAudit = (module, action, nameFn) => async (req, res, next) => {
  const orig = res.json.bind(res);
  res.json = (data) => {
    if (res.statusCode < 400 && data?.id) {
      audit(pool, req, action, module, data.id, nameFn ? nameFn(data) : String(data.id), req.body);
    }
    return orig(data);
  };
  next();
};

// ── ID helpers ────────────────────────────────────────────────
async function getNextSeq(table, idCol, prefix) {
  const r = await q(`SELECT ${idCol} FROM ${table} ORDER BY id DESC LIMIT 1`);
  if (!r.rows.length) return `${prefix}-001`;
  const last = parseInt(r.rows[0][idCol].split('-').pop(), 10);
  return `${prefix}-${String(last + 1).padStart(3, '0')}`;
}

// ============================================================
// PUBLIC ROUTES (no auth required)
// ============================================================
app.get('/api/health', (_, res) => res.json({ ok: true }));

// Auth
app.post('/api/auth/request-otp', (req, res) => requestOTP(req, res, pool));
app.post('/api/auth/verify-otp',  (req, res) => verifyOTP(req, res, pool));
app.post('/api/auth/logout',      auth, (req, res) => logout(req, res, pool));
app.get('/api/auth/me',           auth, (req, res) => getMe(req, res, pool));

// Public LOV (for frontend dropdowns)
app.get('/api/lov/:category', (req, res) => getPublicLov(req, res, pool));

// ============================================================
// ADMIN ROUTES (auth + admin role required)
// ============================================================
const adminAuth = [auth, requireAdmin];

// Admin stats
app.get('/api/admin/stats',           ...adminAuth, (req, res) => getAdminStats(req, res, pool));

// User management
app.get('/api/admin/users',           ...adminAuth, (req, res) => getUsers(req, res, pool));
app.post('/api/admin/users',          ...adminAuth, (req, res) => createUser(req, res, pool));
app.put('/api/admin/users/:id',       ...adminAuth, (req, res) => updateUser(req, res, pool));
app.delete('/api/admin/users/:id',    ...adminAuth, (req, res) => deactivateUser(req, res, pool));
app.post('/api/admin/users/:id/reset',...adminAuth, (req, res) => resetUserSessions(req, res, pool));

// LOV management
app.get('/api/admin/lov',             ...adminAuth, (req, res) => getLovCategories(req, res, pool));
app.get('/api/admin/lov/:category',   ...adminAuth, (req, res) => getLovByCategory(req, res, pool));
app.post('/api/admin/lov',            ...adminAuth, (req, res) => createLovValue(req, res, pool));
app.put('/api/admin/lov/:id',         ...adminAuth, (req, res) => updateLovValue(req, res, pool));
app.delete('/api/admin/lov/:id',      ...adminAuth, (req, res) => deleteLovValue(req, res, pool));

// Audit log
app.get('/api/admin/audit',           ...adminAuth, (req, res) => getAuditLog(req, res, pool));

// ============================================================
// DASHBOARD
// ============================================================
app.get('/api/dashboard', auth, async (_, res) => {
  try {
    const [pipeline, overdue, tasks, activities, stageBreakdown, recentActivities] = await Promise.all([
      q(`SELECT COUNT(*) cnt, COALESCE(SUM(value),0) total FROM opportunities WHERE stage NOT IN ('Won','Lost','On Hold')`),
      // Dynamic overdue based on days_overdue logic (includes GST total)
      q(`SELECT COUNT(*) cnt, COALESCE(SUM(total),0) amt FROM invoices_with_overdue WHERE days_overdue > 0`),
      q(`SELECT COUNT(*) cnt FROM tasks WHERE status NOT IN ('Completed','Cancelled') AND due_date <= CURRENT_DATE`),
      q(`SELECT COUNT(*) cnt FROM activities WHERE date = CURRENT_DATE`),
      q(`SELECT stage, COUNT(*) cnt, COALESCE(SUM(value),0) val FROM opportunities WHERE stage NOT IN ('Won','Lost') GROUP BY stage ORDER BY val DESC`),
      q(`SELECT a.id, a.subject, a.type, a.date, acc.account_name FROM activities a LEFT JOIN accounts acc ON a.account_id = acc.id ORDER BY a.date DESC LIMIT 5`),
    ]);
    res.json({
      pipeline: pipeline.rows[0],
      overdue: overdue.rows[0],
      openTasks: tasks.rows[0],
      activitiesToday: activities.rows[0],
      stageBreakdown: stageBreakdown.rows,
      recentActivities: recentActivities.rows,
    });
  } catch (e) {
    console.error('Dashboard error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// USERS (read-only for non-admins — for dropdowns)
// ============================================================
app.get('/api/users', auth, async (_, res) => {
  try {
    const r = await q('SELECT id, name, email, role_new AS role FROM users WHERE active=TRUE ORDER BY name');
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ACCOUNTS
// ============================================================
app.get('/api/accounts', auth, async (req, res) => {
  try {
    const { search, type, industry, entity } = req.query;
    let sql = `SELECT a.*, u.name AS owner_name FROM accounts a LEFT JOIN users u ON a.relationship_owner_id = u.id WHERE 1=1`;
    const params = [];
    if (search)   { params.push(`%${search}%`); sql += ` AND a.account_name ILIKE $${params.length}`; }
    if (type)     { params.push(type);     sql += ` AND a.type = $${params.length}`; }
    if (industry) { params.push(industry); sql += ` AND a.industry = $${params.length}`; }
    if (entity)   { params.push(entity);   sql += ` AND a.entity = $${params.length}`; }
    sql += ' ORDER BY a.account_name';
    const r = await q(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/accounts/:id', auth, async (req, res) => {
  try {
    const [acct, opps, contacts, projects, invoices, acts] = await Promise.all([
      q('SELECT a.*, u.name AS owner_name FROM accounts a LEFT JOIN users u ON a.relationship_owner_id = u.id WHERE a.id=$1', [req.params.id]),
      q('SELECT o.*, u.name AS owner_name FROM opportunities o LEFT JOIN users u ON o.owner_id=u.id WHERE o.account_id=$1 ORDER BY o.created_at DESC', [req.params.id]),
      q('SELECT * FROM contacts WHERE account_id=$1 ORDER BY full_name', [req.params.id]),
      q('SELECT * FROM projects WHERE account_id=$1 ORDER BY start_date DESC', [req.params.id]),
      q('SELECT * FROM invoices_with_overdue WHERE account_id=$1 ORDER BY date DESC', [req.params.id]),
      q(`SELECT ac.*, u.name AS owner_name FROM activities ac LEFT JOIN users u ON ac.owner_id=u.id WHERE ac.account_id=$1 ORDER BY ac.date DESC`, [req.params.id])
    ]);
    if (!acct.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ...acct.rows[0], opportunities: opps.rows, contacts: contacts.rows, projects: projects.rows, invoices: invoices.rows, activities: acts.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/accounts', auth, withAudit('accounts','CREATE', d=>d.account_name), async (req, res) => {
  try {
    const id = await getNextSeq('accounts','account_id','ACC');
    const { account_name, type, industry, entity, relationship_owner_id, primary_contact, email, phone, address, city, country, website, notes, active } = req.body;
    const r = await q(
      `INSERT INTO accounts (account_id,account_name,type,industry,entity,relationship_owner_id,primary_contact,email,phone,address,city,country,website,notes,active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [id,account_name,type,industry,entity,relationship_owner_id,primary_contact,email,phone,address,city,country,website,notes,active ?? true]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/accounts/:id', auth, withAudit('accounts','UPDATE', d=>d.account_name), async (req, res) => {
  try {
    const { account_name, type, industry, entity, relationship_owner_id, primary_contact, email, phone, address, city, country, website, notes, active } = req.body;
    const r = await q(
      `UPDATE accounts SET account_name=$1,type=$2,industry=$3,entity=$4,relationship_owner_id=$5,primary_contact=$6,email=$7,phone=$8,address=$9,city=$10,country=$11,website=$12,notes=$13,active=$14 WHERE id=$15 RETURNING *`,
      [account_name,type,industry,entity,relationship_owner_id,primary_contact,email,phone,address,city,country,website,notes,active,req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/accounts/:id', auth, requireManager, async (req, res) => {
  try {
    await q('DELETE FROM accounts WHERE id=$1', [req.params.id]);
    audit(pool, req, 'DELETE', 'accounts', req.params.id, '', {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// CONTACTS
// ============================================================
app.get('/api/contacts', auth, async (req, res) => {
  try {
    const { search, account_id, decision_maker } = req.query;
    let sql = `SELECT c.*, a.account_name FROM contacts c LEFT JOIN accounts a ON c.account_id=a.id WHERE 1=1`;
    const params = [];
    if (search)        { params.push(`%${search}%`); sql += ` AND (c.full_name ILIKE $${params.length} OR c.email ILIKE $${params.length})`; }
    if (account_id)    { params.push(account_id); sql += ` AND c.account_id=$${params.length}`; }
    if (decision_maker==='true') { sql += ` AND c.decision_maker=TRUE`; }
    sql += ' ORDER BY c.full_name';
    const r = await q(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/contacts', auth, async (req, res) => {
  try {
    const id = await getNextSeq('contacts','contact_id','CON');
    const { full_name, account_id, title, department, email, phone, mobile, linkedin, decision_maker, last_contact, notes } = req.body;
    const r = await q(
      `INSERT INTO contacts (contact_id,full_name,account_id,title,department,email,phone,mobile,linkedin,decision_maker,last_contact,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [id,full_name,account_id,title,department,email,phone,mobile,linkedin,decision_maker,last_contact,notes]
    );
    audit(pool, req, 'CREATE', 'contacts', r.rows[0].id, full_name, req.body);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/contacts/:id', auth, async (req, res) => {
  try {
    const { full_name, account_id, title, department, email, phone, mobile, linkedin, decision_maker, last_contact, notes } = req.body;
    const r = await q(
      `UPDATE contacts SET full_name=$1,account_id=$2,title=$3,department=$4,email=$5,phone=$6,mobile=$7,linkedin=$8,decision_maker=$9,last_contact=$10,notes=$11 WHERE id=$12 RETURNING *`,
      [full_name,account_id,title,department,email,phone,mobile,linkedin,decision_maker,last_contact,notes,req.params.id]
    );
    audit(pool, req, 'UPDATE', 'contacts', req.params.id, full_name, req.body);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/contacts/:id', auth, requireManager, async (req, res) => {
  try {
    await q('DELETE FROM contacts WHERE id=$1', [req.params.id]);
    audit(pool, req, 'DELETE', 'contacts', req.params.id, '', {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// OPPORTUNITIES
// ============================================================
app.get('/api/opportunities', auth, async (req, res) => {
  try {
    const { stage, owner_id, entity, quarter, search } = req.query;
    let sql = `SELECT o.*, a.account_name, u.name AS owner_name, c.full_name AS contact_name
               FROM opportunities o
               LEFT JOIN accounts a ON o.account_id=a.id
               LEFT JOIN users u ON o.owner_id=u.id
               LEFT JOIN contacts c ON o.contact_id=c.id
               WHERE 1=1`;
    const params = [];
    if (stage)    { params.push(stage);    sql += ` AND o.stage=$${params.length}`; }
    if (owner_id) { params.push(owner_id); sql += ` AND o.owner_id=$${params.length}`; }
    if (entity)   { params.push(entity);   sql += ` AND o.entity=$${params.length}`; }
    if (search)   { params.push(`%${search}%`); sql += ` AND (o.opportunity_name ILIKE $${params.length} OR a.account_name ILIKE $${params.length})`; }
    if (quarter) {
      const y = new Date().getFullYear();
      const ranges = { Q1:['01-01','03-31'], Q2:['04-01','06-30'], Q3:['07-01','09-30'], Q4:['10-01','12-31'] };
      if (ranges[quarter]) {
        params.push(`${y}-${ranges[quarter][0]}`, `${y}-${ranges[quarter][1]}`);
        sql += ` AND o.expected_close BETWEEN $${params.length-1} AND $${params.length}`;
      }
    }
    sql += ' ORDER BY o.expected_close ASC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/opportunities/:id', auth, async (req, res) => {
  try {
    const [opp, acts] = await Promise.all([
      q(`SELECT o.*, a.account_name, u.name AS owner_name, c.full_name AS contact_name
         FROM opportunities o LEFT JOIN accounts a ON o.account_id=a.id LEFT JOIN users u ON o.owner_id=u.id LEFT JOIN contacts c ON o.contact_id=c.id
         WHERE o.id=$1`, [req.params.id]),
      q(`SELECT ac.*, u.name AS owner_name FROM activities ac LEFT JOIN users u ON ac.owner_id=u.id
         WHERE ac.related_module='Opportunity' AND ac.related_id=$1 ORDER BY ac.date DESC`, [req.params.id])
    ]);
    if (!opp.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ...opp.rows[0], activities: acts.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/opportunities', auth, async (req, res) => {
  try {
    const id = await getNextSeq('opportunities','opportunity_id','OPP');
    const { opportunity_name, account_id, website, entity, stage, probability, value, currency, expected_close, owner_id, contact_id, source, notes, next_action, next_action_date } = req.body;
    const r = await q(
      `INSERT INTO opportunities (opportunity_id,opportunity_name,account_id,website,entity,stage,probability,value,currency,expected_close,owner_id,contact_id,source,notes,next_action,next_action_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [id,opportunity_name,account_id,website,entity,stage,probability,value,currency,expected_close,owner_id,contact_id||null,source,notes,next_action,next_action_date]
    );
    audit(pool, req, 'CREATE', 'opportunities', r.rows[0].id, opportunity_name, req.body);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/opportunities/:id', auth, async (req, res) => {
  try {
    const { opportunity_name, account_id, website, entity, stage, probability, value, currency, expected_close, owner_id, contact_id, source, notes, next_action, next_action_date, last_activity } = req.body;
    const r = await q(
      `UPDATE opportunities SET opportunity_name=$1,account_id=$2,website=$3,entity=$4,stage=$5,probability=$6,value=$7,currency=$8,expected_close=$9,owner_id=$10,contact_id=$11,source=$12,notes=$13,next_action=$14,next_action_date=$15,last_activity=$16 WHERE id=$17 RETURNING *`,
      [opportunity_name,account_id,website,entity,stage,probability,value,currency,expected_close,owner_id,contact_id||null,source,notes,next_action,next_action_date,last_activity,req.params.id]
    );
    audit(pool, req, 'UPDATE', 'opportunities', req.params.id, opportunity_name, req.body);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/opportunities/:id', auth, requireManager, async (req, res) => {
  try {
    await q('DELETE FROM opportunities WHERE id=$1', [req.params.id]);
    audit(pool, req, 'DELETE', 'opportunities', req.params.id, '', {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PROJECTS
// ============================================================
app.get('/api/projects', auth, async (req, res) => {
  try {
    const { status, health, entity, owner_id } = req.query;
    let sql = `
      SELECT p.*, a.account_name, u.name AS pm_name,
             CASE WHEN p.total_milestones > 0 THEN ROUND((p.completed_milestones::float / p.total_milestones::float) * 100) ELSE 0 END as pct_complete,
             (COALESCE(p.invoiced, 0) - COALESCE(p.received, 0)) as pending
      FROM projects p 
      LEFT JOIN accounts a ON p.account_id=a.id 
      LEFT JOIN users u ON p.project_manager_id=u.id 
      WHERE 1=1`;
    const params = [];
    if (status)   { params.push(status);   sql += ` AND p.status=$${params.length}`; }
    if (health)   { params.push(health);   sql += ` AND p.health=$${params.length}`; }
    if (entity)   { params.push(entity);   sql += ` AND p.entity=$${params.length}`; }
    if (owner_id) { params.push(owner_id); sql += ` AND p.project_manager_id=$${params.length}`; }
    sql += ' ORDER BY p.start_date DESC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/projects', auth, async (req, res) => {
  try {
    const id = await getNextSeq('projects','project_id','PRJ');
    const { project_name, account_id, entity, status, start_date, end_date, contract_value, invoiced, received, total_milestones, completed_milestones, project_manager_id, health, next_milestone, notes } = req.body;
    const r = await q(
      `INSERT INTO projects (project_id,project_name,account_id,entity,status,start_date,end_date,contract_value,invoiced,received,total_milestones,completed_milestones,project_manager_id,health,next_milestone,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [id,project_name,account_id,entity,status,start_date,end_date,contract_value,invoiced,received,total_milestones,completed_milestones,project_manager_id,health,next_milestone,notes]
    );
    audit(pool, req, 'CREATE', 'projects', r.rows[0].id, project_name, req.body);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/projects/:id', auth, async (req, res) => {
  try {
    const { project_name, account_id, entity, status, start_date, end_date, contract_value, invoiced, received, total_milestones, completed_milestones, project_manager_id, health, next_milestone, notes } = req.body;
    const r = await q(
      `UPDATE projects SET project_name=$1,account_id=$2,entity=$3,status=$4,start_date=$5,end_date=$6,contract_value=$7,invoiced=$8,received=$9,total_milestones=$10,completed_milestones=$11,project_manager_id=$12,health=$13,next_milestone=$14,notes=$15 WHERE id=$16 RETURNING *`,
      [project_name,account_id,entity,status,start_date,end_date,contract_value,invoiced,received,total_milestones,completed_milestones,project_manager_id,health,next_milestone,notes,req.params.id]
    );
    audit(pool, req, 'UPDATE', 'projects', req.params.id, project_name, req.body);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/projects/:id', auth, requireAdmin, async (req, res) => {
  try {
    await q('DELETE FROM projects WHERE id=$1', [req.params.id]);
    audit(pool, req, 'DELETE', 'projects', req.params.id, '', {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// INVOICES
// ============================================================
app.get('/api/invoices', auth, async (req, res) => {
  try {
    const { status, entity, account_id } = req.query;
    let sql = `SELECT i.*, a.account_name, p.project_name, o.opportunity_name FROM invoices_with_overdue i LEFT JOIN accounts a ON i.account_id=a.id LEFT JOIN projects p ON i.project_id=p.id LEFT JOIN opportunities o ON i.opportunity_id=o.id WHERE 1=1`;
    const params = [];
    if (status)     { params.push(status);     sql += ` AND i.status=$${params.length}`; }
    if (entity)     { params.push(entity);     sql += ` AND i.entity=$${params.length}`; }
    if (account_id) { params.push(account_id); sql += ` AND i.account_id=$${params.length}`; }
    sql += ' ORDER BY i.date DESC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/invoices', auth, async (req, res) => {
  try {
    const y = new Date().getFullYear();
    const cnt = await q('SELECT COUNT(*) FROM invoices WHERE invoice_no LIKE $1', [`INV-${y}-%`]);
    const inv_no = `INV-${y}-${String(parseInt(cnt.rows[0].count)+1).padStart(3,'0')}`;
    const { date, due_date, account_id, entity, project_id, opportunity_id, description, amount, gst_rate, currency, status, payment_date, received, tds, payment_mode, notes } = req.body;
    const r = await q(
      `INSERT INTO invoices (invoice_no,date,due_date,account_id,entity,project_id,opportunity_id,description,amount,gst_rate,currency,status,payment_date,received,tds,payment_mode,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [inv_no,date,due_date,account_id,entity,project_id||null,opportunity_id||null,description,amount,gst_rate||18,currency,status,payment_date||null,received||0,tds||0,payment_mode||null,notes]
    );
    audit(pool, req, 'CREATE', 'invoices', r.rows[0].id, inv_no, req.body);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/invoices/:id', auth, async (req, res) => {
  try {
    const { date, due_date, account_id, entity, project_id, opportunity_id, description, amount, gst_rate, currency, status, payment_date, received, tds, payment_mode, notes } = req.body;
    const r = await q(
      `UPDATE invoices SET date=$1,due_date=$2,account_id=$3,entity=$4,project_id=$5,opportunity_id=$6,description=$7,amount=$8,gst_rate=$9,currency=$10,status=$11,payment_date=$12,received=$13,tds=$14,payment_mode=$15,notes=$16 WHERE id=$17 RETURNING *`,
      [date,due_date,account_id,entity,project_id||null,opportunity_id||null,description,amount,gst_rate,currency,status,payment_date||null,received,tds,payment_mode||null,notes,req.params.id]
    );
    audit(pool, req, 'UPDATE', 'invoices', req.params.id, req.body.description, req.body);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/invoices/:id', auth, requireAdmin, async (req, res) => {
  try {
    await q('DELETE FROM invoices WHERE id=$1', [req.params.id]);
    audit(pool, req, 'DELETE', 'invoices', req.params.id, '', {});
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// ACTIVITIES
// ============================================================
app.get('/api/activities', auth, async (req, res) => {
  try {
    const { type, owner_id, account_id, date_from, date_to, related_module, related_id } = req.query;
    let sql = `SELECT ac.*, u.name AS owner_name, a.account_name, c.full_name AS contact_name FROM activities ac LEFT JOIN users u ON ac.owner_id=u.id LEFT JOIN accounts a ON ac.account_id=a.id LEFT JOIN contacts c ON ac.contact_id=c.id WHERE 1=1`;
    const params = [];
    if (type)           { params.push(type);           sql += ` AND ac.type=$${params.length}`; }
    if (owner_id)       { params.push(owner_id);       sql += ` AND ac.owner_id=$${params.length}`; }
    if (account_id)     { params.push(account_id);     sql += ` AND ac.account_id=$${params.length}`; }
    if (date_from)      { params.push(date_from);      sql += ` AND ac.date>=$${params.length}`; }
    if (date_to)        { params.push(date_to);        sql += ` AND ac.date<=$${params.length}`; }
    if (related_module) { params.push(related_module); sql += ` AND ac.related_module=$${params.length}`; }
    if (related_id)     { params.push(related_id);     sql += ` AND ac.related_id=$${params.length}`; }
    sql += ' ORDER BY ac.date DESC, ac.created_at DESC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/activities', auth, async (req, res) => {
  try {
    const { date, type, subject, related_module, related_id, account_id, contact_id, owner_id, entity, outcome, next_steps, next_date, notes } = req.body;
    const r = await q(
      `INSERT INTO activities (date,type,subject,related_module,related_id,account_id,contact_id,owner_id,entity,outcome,next_steps,next_date,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [date,type,subject,related_module||null,related_id||null,account_id||null,contact_id||null,owner_id,entity,outcome,next_steps,next_date||null,notes]
    );
    if (related_module==='Opportunity' && related_id) {
      await q('UPDATE opportunities SET last_activity=$1 WHERE id=$2', [date, related_id]);
    }
    audit(pool, req, 'CREATE', 'activities', r.rows[0].id, subject, req.body);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/activities/:id', auth, async (req, res) => {
  try {
    const { date, type, subject, related_module, related_id, account_id, contact_id, owner_id, entity, outcome, next_steps, next_date, notes } = req.body;
    const r = await q(
      `UPDATE activities SET date=$1,type=$2,subject=$3,related_module=$4,related_id=$5,account_id=$6,contact_id=$7,owner_id=$8,entity=$9,outcome=$10,next_steps=$11,next_date=$12,notes=$13 WHERE id=$14 RETURNING *`,
      [date,type,subject,related_module||null,related_id||null,account_id||null,contact_id||null,owner_id,entity,outcome,next_steps,next_date||null,notes,req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/activities/:id', auth, async (req, res) => {
  try {
    await q('DELETE FROM activities WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// TASKS
// ============================================================
app.get('/api/tasks', auth, async (req, res) => {
  try {
    const { status, priority, assigned_to_id, account_id } = req.query;
    let sql = `SELECT t.*, u.name AS assigned_name, cb.name AS created_by_name, a.account_name FROM tasks t LEFT JOIN users u ON t.assigned_to_id=u.id LEFT JOIN users cb ON t.created_by_id=cb.id LEFT JOIN accounts a ON t.account_id=a.id WHERE 1=1`;
    const params = [];
    if (status)         { params.push(status);         sql += ` AND t.status=$${params.length}`; }
    if (priority)       { params.push(priority);       sql += ` AND t.priority=$${params.length}`; }
    if (assigned_to_id) { params.push(assigned_to_id); sql += ` AND t.assigned_to_id=$${params.length}`; }
    if (account_id)     { params.push(account_id);     sql += ` AND t.account_id=$${params.length}`; }
    sql += ' ORDER BY t.due_date ASC, t.priority DESC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tasks', auth, async (req, res) => {
  try {
    const id = await getNextSeq('tasks','task_id','TSK');
    const { task, related_module, related_id, account_id, due_date, priority, status, assigned_to_id, created_by_id, notes } = req.body;
    const r = await q(
      `INSERT INTO tasks (task_id,task,related_module,related_id,account_id,due_date,priority,status,assigned_to_id,created_by_id,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id,task,related_module||null,related_id||null,account_id||null,due_date,priority,status||'Not Started',assigned_to_id,created_by_id,notes]
    );
    audit(pool, req, 'CREATE', 'tasks', r.rows[0].id, task, req.body);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const { task, related_module, related_id, account_id, due_date, priority, status, assigned_to_id, completed_date, notes } = req.body;
    const r = await q(
      `UPDATE tasks SET task=$1,related_module=$2,related_id=$3,account_id=$4,due_date=$5,priority=$6,status=$7,assigned_to_id=$8,completed_date=$9,notes=$10 WHERE id=$11 RETURNING *`,
      [task,related_module||null,related_id||null,account_id||null,due_date,priority,status,assigned_to_id,completed_date||null,notes,req.params.id]
    );
    audit(pool, req, 'UPDATE', 'tasks', req.params.id, task, req.body);
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
  try {
    await q('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// PAYMENT SCHEDULE & COLLECTIONS & QUARTERLY TRACKING
// (same as original server.js — all now wrapped with auth)
// ============================================================
app.get('/api/payment-schedule', auth, async (req, res) => {
  try {
    const { status, entity, project_id } = req.query;
    let sql = `SELECT ps.*, a.account_name, p.project_name, i.invoice_no FROM payment_schedule_with_days ps LEFT JOIN accounts a ON ps.account_id=a.id LEFT JOIN projects p ON ps.project_id=p.id LEFT JOIN invoices i ON ps.invoice_id=i.id WHERE 1=1`;
    const params = [];
    if (status)     { params.push(status);     sql += ` AND ps.status=$${params.length}`; }
    if (entity)     { params.push(entity);     sql += ` AND ps.entity=$${params.length}`; }
    if (project_id) { params.push(project_id); sql += ` AND ps.project_id=$${params.length}`; }
    sql += ' ORDER BY ps.expected_date ASC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/payment-schedule', auth, async (req, res) => {
  try {
    const { account_id, entity, project_id, milestone, expected_amount, expected_date, invoice_raised, invoice_id, invoice_date, received, amount_received, status, notes } = req.body;
    const r = await q(
      `INSERT INTO payment_schedule (account_id,entity,project_id,milestone,expected_amount,expected_date,invoice_raised,invoice_id,invoice_date,received,amount_received,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [account_id,entity,project_id||null,milestone,expected_amount,expected_date,invoice_raised||false,invoice_id||null,invoice_date||null,received||false,amount_received||0,status,notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/payment-schedule/:id', auth, async (req, res) => {
  try {
    const { account_id, entity, project_id, milestone, expected_amount, expected_date, invoice_raised, invoice_id, invoice_date, received, amount_received, status, notes } = req.body;
    const r = await q(
      `UPDATE payment_schedule SET account_id=$1,entity=$2,project_id=$3,milestone=$4,expected_amount=$5,expected_date=$6,invoice_raised=$7,invoice_id=$8,invoice_date=$9,received=$10,amount_received=$11,status=$12,notes=$13 WHERE id=$14 RETURNING *`,
      [account_id,entity,project_id||null,milestone,expected_amount,expected_date,invoice_raised,invoice_id||null,invoice_date||null,received,amount_received,status,notes,req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/collections', auth, async (req, res) => {
  try {
    const { status, entity, escalation } = req.query;
    let sql = `SELECT col.*, a.account_name, i.invoice_no, c.full_name AS contact_name FROM collections_with_overdue col LEFT JOIN accounts a ON col.account_id=a.id LEFT JOIN invoices i ON col.invoice_id=i.id LEFT JOIN contacts c ON col.contact_id=c.id WHERE 1=1`;
    const params = [];
    if (status)     { params.push(status);     sql += ` AND col.status=$${params.length}`; }
    if (entity)     { params.push(entity);     sql += ` AND col.entity=$${params.length}`; }
    if (escalation) { params.push(escalation); sql += ` AND col.escalation=$${params.length}`; }
    sql += ' ORDER BY col.due_date ASC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/collections', auth, async (req, res) => {
  try {
    const { invoice_id, account_id, entity, amount, due_date, last_reminder, reminder_count, next_action, next_action_date, contact_id, email, escalation, response, status, notes } = req.body;
    const r = await q(
      `INSERT INTO collections (invoice_id,account_id,entity,amount,due_date,last_reminder,reminder_count,next_action,next_action_date,contact_id,email,escalation,response,status,notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [invoice_id||null,account_id,entity,amount,due_date,last_reminder||null,reminder_count||0,next_action,next_action_date||null,contact_id||null,email,escalation||'None',response,status,notes]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/collections/:id', auth, async (req, res) => {
  try {
    const { invoice_id, account_id, entity, amount, due_date, last_reminder, reminder_count, next_action, next_action_date, contact_id, email, escalation, response, status, notes } = req.body;
    const r = await q(
      `UPDATE collections SET invoice_id=$1,account_id=$2,entity=$3,amount=$4,due_date=$5,last_reminder=$6,reminder_count=$7,next_action=$8,next_action_date=$9,contact_id=$10,email=$11,escalation=$12,response=$13,status=$14,notes=$15 WHERE id=$16 RETURNING *`,
      [invoice_id||null,account_id,entity,amount,due_date,last_reminder||null,reminder_count,next_action,next_action_date||null,contact_id||null,email,escalation,response,status,notes,req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/quarterly-tracking', auth, async (req, res) => {
  try {
    const { month, owner_id } = req.query;
    let sql = `SELECT qt.*, a.account_name, u.name AS owner_name FROM quarterly_tracking qt LEFT JOIN accounts a ON qt.account_id=a.id LEFT JOIN users u ON qt.owner_id=u.id WHERE 1=1`;
    const params = [];
    if (month)    { params.push(month);    sql += ` AND qt.month=$${params.length}`; }
    if (owner_id) { params.push(owner_id); sql += ` AND qt.owner_id=$${params.length}`; }
    sql += ' ORDER BY qt.id ASC';
    res.json((await q(sql, params)).rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/quarterly-tracking', auth, async (req, res) => {
  try {
    const { month, account_id, offering, planned_meeting, remark_1, remark_2, remark_3, owner_id, entity } = req.body;
    const r = await q(
      `INSERT INTO quarterly_tracking (month,account_id,offering,planned_meeting,remark_1,remark_2,remark_3,owner_id,entity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [month,account_id||null,offering,planned_meeting,remark_1,remark_2,remark_3,owner_id||null,entity]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/quarterly-tracking/:id', auth, async (req, res) => {
  try {
    const { month, account_id, offering, planned_meeting, remark_1, remark_2, remark_3, owner_id, entity } = req.body;
    const r = await q(
      `UPDATE quarterly_tracking SET month=$1,account_id=$2,offering=$3,planned_meeting=$4,remark_1=$5,remark_2=$6,remark_3=$7,owner_id=$8,entity=$9 WHERE id=$10 RETURNING *`,
      [month,account_id||null,offering,planned_meeting,remark_1,remark_2,remark_3,owner_id||null,entity,req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// START
// ============================================================
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Astura CRM API running on port ${PORT}`));
