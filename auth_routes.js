// ============================================================
// ASTURA GLOBAL CRM — AUTH MODULE
// OTP via Resend + JWT sessions + role middleware
// ============================================================
import crypto from 'crypto';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken';

const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET;
const OTP_EXPIRY_MINS = 10;
const SESSION_DAYS = 7;

// ── DEV ONLY: OTP bypass flag ─────────────────────────────────
// Set BYPASS_OTP=true in .env while Resend domain setup is pending.
// Remove or set to false before going to production.
const BYPASS_OTP = process.env.BYPASS_OTP === 'true';

// ── Helpers ──────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashValue(val) {
  return crypto.createHash('sha256').update(val).digest('hex');
}

function generateToken(userId, role) {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: `${SESSION_DAYS}d` }
  );
}

// ── Shared: create session + update last_login ────────────────
async function createSession(pool, user, req) {
  const token = generateToken(user.id, user.role_new);
  const tokenHash = hashValue(token);
  const sessionExpiry = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5)`,
    [user.id, tokenHash, sessionExpiry, req.ip, req.headers['user-agent']]
  );
  await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

  return token;
}

// ── Shared: find or auto-provision user ──────────────────────
// Used only in BYPASS_OTP mode. Creates the user as 'admin' if
// they don't exist yet (needed for an initially empty database).
async function findOrProvisionUser(pool, email) {
  const existing = await pool.query(
    'SELECT id, name, email, role_new, entity FROM users WHERE LOWER(email) = LOWER($1) AND active = TRUE',
    [email]
  );
  if (existing.rows.length) return existing.rows[0];

  // Auto-provision: derive display name from email local-part
  const name = email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const created = await pool.query(
    `INSERT INTO users (name, email, role_new, active)
     VALUES ($1, $2, 'admin', TRUE)
     RETURNING id, name, email, role_new, entity`,
    [name, email]
  );
  console.log(`[BYPASS_OTP] Auto-provisioned admin user: ${email}`);
  return created.rows[0];
}

// ── Email template ───────────────────────────────────────────
function otpEmailHtml(otp, userName) {
  return `
<!DOCTYPE html>
<html>
<body style="font-family:system-ui,sans-serif;background:#f5f6fa;padding:40px 20px;margin:0">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px;border:1px solid #e8eaf0">
    <div style="margin-bottom:28px">
      <p style="font-size:11px;color:#9ca3af;margin:0;text-transform:uppercase;letter-spacing:0.1em">Astura Global</p>
      <p style="font-size:20px;font-weight:500;margin:4px 0 0;color:#1a1f2e">CRM Login</p>
    </div>
    <p style="color:#374151;font-size:15px;margin:0 0 8px">Hi ${userName || 'there'},</p>
    <p style="color:#6b7280;font-size:14px;margin:0 0 28px;line-height:1.6">Your one-time login code for Astura Global CRM is:</p>
    <div style="background:#eff6ff;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px">
      <p style="font-size:40px;font-weight:500;letter-spacing:12px;color:#1d4ed8;margin:0;font-family:monospace">${otp}</p>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin:0">This code expires in <b>${OTP_EXPIRY_MINS} minutes</b>. Do not share it with anyone.</p>
    <div style="border-top:1px solid #e8eaf0;margin-top:32px;padding-top:20px">
      <p style="color:#d1d5db;font-size:12px;margin:0">Astura Global Pvt Ltd · India Sales CRM</p>
    </div>
  </div>
</body>
</html>`;
}

// ============================================================
// ROUTE HANDLERS
// ============================================================

// POST /api/auth/request-otp
export async function requestOTP(req, res, pool) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // ── DEV ONLY: BYPASS_OTP mode ────────────────────────────────
  // Skips all OTP generation & Resend email sending.
  // The verify-otp endpoint will handle login directly.
  if (BYPASS_OTP) {
    console.log('[BYPASS_OTP] request-otp skipped for:', email);
    return res.json({ ok: true, bypass: true, message: 'OTP bypass active — proceed to verify.' });
  }
  // ── END DEV BYPASS ──────────────────────────────────────────

  try {
    // Check user exists and is active
    const userRes = await pool.query(
      'SELECT id, name, active, role_new FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (!userRes.rows.length) {
      return res.status(404).json({ error: 'No account found for this email address.' });
    }
    const user = userRes.rows[0];
    if (!user.active) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact your admin.' });
    }

    // Rate limit: max 3 OTPs per 10 mins per email
    const recentRes = await pool.query(
      `SELECT COUNT(*) cnt FROM otp_tokens
       WHERE email = $1 AND created_at > NOW() - INTERVAL '10 minutes' AND used = FALSE`,
      [email]
    );
    if (parseInt(recentRes.rows[0].cnt) >= 3) {
      return res.status(429).json({ error: 'Too many OTP requests. Please wait 10 minutes.' });
    }

    const otp = generateOTP();
    const otpHash = hashValue(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINS * 60 * 1000);

    // Invalidate old unused OTPs for this email
    await pool.query(
      'UPDATE otp_tokens SET used = TRUE WHERE email = $1 AND used = FALSE',
      [email]
    );

    // Store new OTP hash
    await pool.query(
      'INSERT INTO otp_tokens (email, otp_hash, expires_at) VALUES ($1, $2, $3)',
      [email, otpHash, expiresAt]
    );

    // Send email via Resend
    const resendRes = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: `${otp} — Your Astura CRM login code`,
      html: otpEmailHtml(otp, user.name),
    });
    console.log('Resend response:', resendRes);

    if (resendRes.error) {
      console.error('Resend error:', resendRes.error);
      return res.status(500).json({ error: `Resend error: ${resendRes.error.message}` });
    }

    return res.json({ ok: true, message: 'OTP sent to your email address.' });
  } catch (e) {
    console.error('OTP request error:', e);
    return res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
}

// POST /api/auth/verify-otp
export async function verifyOTP(req, res, pool) {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

  try {
    // ── DEV ONLY: BYPASS_OTP mode ────────────────────────────────
    // Skips OTP token check entirely. Finds or creates the user,
    // then runs the exact same session/token flow as production.
    if (BYPASS_OTP) {
      console.log('[BYPASS_OTP] verify-otp bypassed for:', email);
      const user = await findOrProvisionUser(pool, email);
      const token = await createSession(pool, user, req);
      return res.json({
        ok: true,
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role_new }
      });
    }
    // ── END DEV BYPASS ──────────────────────────────────────────

    const otpHash = hashValue(String(otp).trim());

    const tokenRes = await pool.query(
      `SELECT id, attempts FROM otp_tokens
       WHERE email = $1 AND otp_hash = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [email, otpHash]
    );

    if (!tokenRes.rows.length) {
      // Increment attempt on the latest token for this email
      await pool.query(
        `UPDATE otp_tokens SET attempts = attempts + 1
         WHERE id = (
           SELECT id FROM otp_tokens 
           WHERE email = $1 AND used = FALSE 
           ORDER BY created_at DESC LIMIT 1
         )`,
        [email]
      );
      return res.status(401).json({ error: 'Invalid or expired OTP. Please try again.' });
    }

    const tokenRow = tokenRes.rows[0];
    if (tokenRow.attempts >= 5) {
      await pool.query('UPDATE otp_tokens SET used = TRUE WHERE id = $1', [tokenRow.id]);
      return res.status(401).json({ error: 'Too many failed attempts. Request a new OTP.' });
    }

    // Mark OTP as used
    await pool.query('UPDATE otp_tokens SET used = TRUE WHERE id = $1', [tokenRow.id]);

    // Get user
    const userRes = await pool.query(
      'SELECT id, name, email, role_new, entity FROM users WHERE LOWER(email) = LOWER($1) AND active = TRUE',
      [email]
    );
    const user = userRes.rows[0];

    const token = await createSession(pool, user, req);
    return res.json({
      ok: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role_new }
    });
  } catch (e) {
    console.error('OTP verify error:', e);
    return res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
}

// POST /api/auth/logout
export async function logout(req, res, pool) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const tokenHash = hashValue(token);
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    }
    return res.json({ ok: true });
  } catch (e) {
    return res.json({ ok: true });
  }
}

// GET /api/auth/me
export async function getMe(req, res, pool) {
  try {
    const userRes = await pool.query(
      'SELECT id, name, email, role_new AS role, entity, last_login FROM users WHERE id = $1 AND active = TRUE',
      [req.user.userId]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    return res.json(userRes.rows[0]);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// ============================================================
// MIDDLEWARE
// ============================================================

// Authenticate any request
export function authenticate(pool) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const tokenHash = hashValue(token);

      // Verify session exists and is not expired
      const sessionRes = await pool.query(
        'SELECT id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()',
        [tokenHash]
      );
      if (!sessionRes.rows.length) {
        return res.status(401).json({ error: 'Session expired. Please log in again.' });
      }

      req.user = decoded;
      next();
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token. Please log in again.' });
    }
  };
}

// Admin only
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Manager or admin
export function requireManager(req, res, next) {
  if (!['admin', 'manager'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Manager access required' });
  }
  next();
}

// ============================================================
// AUDIT HELPER
// ============================================================
export async function audit(pool, req, action, module, recordId, recordName, changes) {
  try {
    await pool.query(
      `INSERT INTO audit_log (user_id, user_name, action, module, record_id, record_name, changes, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user?.userId, req.user?.name || 'system', action, module, recordId, recordName, JSON.stringify(changes), req.ip]
    );
  } catch (e) {
    console.error('Audit log error:', e.message);
  }
}
