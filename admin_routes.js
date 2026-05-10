// ============================================================
// ASTURA GLOBAL CRM — ADMIN ROUTES
// Mount these in server.js under /api/admin
// All routes require authenticate + requireAdmin middleware
// ============================================================

// ── USER MANAGEMENT ──────────────────────────────────────────

// GET /api/admin/users
export async function getUsers(req, res, pool) {
  try {
    const r = await pool.query(
      `SELECT id, name, email, role_new AS role, entity, active, last_login, created_at
       FROM users ORDER BY name`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// POST /api/admin/users
export async function createUser(req, res, pool) {
  try {
    const { name, email, role, entity } = req.body;
    if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

    // Check duplicate
    const exists = await pool.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1)', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const r = await pool.query(
      `INSERT INTO users (name, email, role_new, entity, active)
       VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
      [name, email, role || 'sales', entity || 'Astura Global Pvt Ltd']
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// PUT /api/admin/users/:id
export async function updateUser(req, res, pool) {
  try {
    const { name, email, role, entity, active } = req.body;
    // Prevent admin from deactivating their own account
    if (req.user.userId === parseInt(req.params.id) && active === false) {
      return res.status(400).json({ error: 'You cannot deactivate your own account' });
    }
    const r = await pool.query(
      `UPDATE users SET name=$1, email=$2, role_new=$3, entity=$4, active=$5
       WHERE id=$6 RETURNING id, name, email, role_new AS role, entity, active, last_login`,
      [name, email, role, entity, active, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// DELETE /api/admin/users/:id (soft delete — deactivate)
export async function deactivateUser(req, res, pool) {
  try {
    if (req.user.userId === parseInt(req.params.id)) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }
    await pool.query('UPDATE users SET active=FALSE WHERE id=$1', [req.params.id]);
    // Invalidate all sessions
    await pool.query('DELETE FROM sessions WHERE user_id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// POST /api/admin/users/:id/reset-otp
// Forces user to re-authenticate on next login by invalidating sessions
export async function resetUserSessions(req, res, pool) {
  try {
    await pool.query('DELETE FROM sessions WHERE user_id=$1', [req.params.id]);
    await pool.query('UPDATE otp_tokens SET used=TRUE WHERE email=(SELECT email FROM users WHERE id=$1)', [req.params.id]);
    res.json({ ok: true, message: 'User sessions cleared. They will need to log in again.' });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// ── LOV / SYSTEM CONFIG ──────────────────────────────────────

// GET /api/admin/lov — all categories summary
export async function getLovCategories(req, res, pool) {
  try {
    const r = await pool.query(
      `SELECT category, COUNT(*) total, COUNT(*) FILTER (WHERE active) active_count
       FROM lov_config GROUP BY category ORDER BY category`
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// GET /api/admin/lov/:category — values for a category
export async function getLovByCategory(req, res, pool) {
  try {
    const r = await pool.query(
      `SELECT * FROM lov_config WHERE category=$1 ORDER BY sort_order, label`,
      [req.params.category]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// GET /api/lov/:category — PUBLIC endpoint (no auth needed for dropdowns)
export async function getPublicLov(req, res, pool) {
  try {
    const r = await pool.query(
      `SELECT value, label FROM lov_config WHERE category=$1 AND active=TRUE ORDER BY sort_order, label`,
      [req.params.category]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// POST /api/admin/lov
export async function createLovValue(req, res, pool) {
  try {
    const { category, value, label, sort_order } = req.body;
    const r = await pool.query(
      `INSERT INTO lov_config (category, value, label, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (category, value) DO UPDATE SET label=$3, sort_order=$4, active=TRUE
       RETURNING *`,
      [category, value, label || value, sort_order || 0]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// PUT /api/admin/lov/:id
export async function updateLovValue(req, res, pool) {
  try {
    const { label, sort_order, active } = req.body;
    const r = await pool.query(
      `UPDATE lov_config SET label=$1, sort_order=$2, active=$3
       WHERE id=$4 RETURNING *`,
      [label, sort_order, active, req.params.id]
    );
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// DELETE /api/admin/lov/:id (soft delete — deactivate)
export async function deleteLovValue(req, res, pool) {
  try {
    await pool.query('UPDATE lov_config SET active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// ── AUDIT LOG ────────────────────────────────────────────────

// GET /api/admin/audit
export async function getAuditLog(req, res, pool) {
  try {
    const { module, user_id, limit = 100, offset = 0 } = req.query;
    let sql = `SELECT al.*, u.name AS actor FROM audit_log al LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const params = [];
    if (module)  { params.push(module);  sql += ` AND al.module = $${params.length}`; }
    if (user_id) { params.push(user_id); sql += ` AND al.user_id = $${params.length}`; }
    params.push(limit, offset);
    sql += ` ORDER BY al.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    const r = await pool.query(sql, params);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// ── DASHBOARD STATS (admin) ──────────────────────────────────

// GET /api/admin/stats
export async function getAdminStats(req, res, pool) {
  try {
    const [users, sessions, audits, lovs] = await Promise.all([
      pool.query('SELECT COUNT(*) total, COUNT(*) FILTER (WHERE active) active FROM users'),
      pool.query('SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()'),
      pool.query('SELECT COUNT(*) FROM audit_log WHERE created_at > NOW() - INTERVAL \'24 hours\''),
      pool.query('SELECT COUNT(*) FROM lov_config WHERE active = TRUE'),
    ]);
    res.json({
      users: users.rows[0],
      activeSessions: sessions.rows[0].count,
      auditLast24h: audits.rows[0].count,
      activeLovValues: lovs.rows[0].count,
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
}
