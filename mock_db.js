// ============================================================
// ASTURA GLOBAL CRM — MOCK DATABASE LAYER
// Simulates PostgreSQL Pool for testing without a live DB
// ============================================================

import crypto from 'crypto';

function hashValue(val) {
  return crypto.createHash('sha256').update(val).digest('hex');
}

class MockPool {
  constructor() {
    this.users = [
      {
        id: 1,
        name: 'Astura Admin',
        email: 'samiksha.jagne@astura.ai',
        active: true,
        role_new: 'admin',
        entity: 'Astura Global',
        last_login: null
      },
      {
        id: 2,
        name: 'Manager User',
        email: 'manager@astura.ai',
        active: true,
        role_new: 'manager',
        entity: 'Astura Global',
        last_login: null
      }
    ];
    this.otp_tokens = [];
    this.sessions = [];
    this.audit_log = [];

    console.log('🚀 [MockDB] Initialized with in-memory storage');
  }

  async query(text, params = []) {
    // Basic SQL pattern matching for Auth Routes
    const sql = text.trim().replace(/\s+/g, ' ');

    // 1. SELECT user by email
    if (sql.includes('SELECT id, name, active, role_new FROM users WHERE LOWER(email) = LOWER($1)')) {
      const email = params[0].toLowerCase();
      const user = this.users.find(u => u.email.toLowerCase() === email);
      return { rows: user ? [user] : [] };
    }

    // 2. Rate limit check for OTPs
    if (sql.includes('SELECT COUNT(*) cnt FROM otp_tokens WHERE email = $1 AND created_at > NOW() - INTERVAL \'10 minutes\'')) {
      const email = params[0];
      const count = this.otp_tokens.filter(t => t.email === email && !t.used && t.created_at > (Date.now() - 10 * 60 * 1000)).length;
      return { rows: [{ cnt: count }] };
    }

    // 3. Invalidate old OTPs
    if (sql.includes('UPDATE otp_tokens SET used = TRUE WHERE email = $1 AND used = FALSE')) {
      const email = params[0];
      this.otp_tokens.forEach(t => { if (t.email === email) t.used = true; });
      return { rowCount: 1 };
    }

    // 4. Insert new OTP
    if (sql.includes('INSERT INTO otp_tokens (email, otp_hash, expires_at)')) {
      const [email, otp_hash, expires_at] = params;
      this.otp_tokens.push({
        id: this.otp_tokens.length + 1,
        email,
        otp_hash,
        expires_at,
        created_at: Date.now(),
        used: false,
        attempts: 0
      });
      return { rows: [] };
    }

    // 5. Verify OTP
    if (sql.includes('SELECT id, attempts FROM otp_tokens WHERE email = $1 AND otp_hash = $2 AND used = FALSE')) {
      const [email, otp_hash] = params;
      const token = this.otp_tokens.find(t => t.email === email && t.otp_hash === otp_hash && !t.used && t.expires_at > Date.now());
      return { rows: token ? [token] : [] };
    }

    // 6. Increment OTP attempts
    if (sql.includes('UPDATE otp_tokens SET attempts = attempts + 1 WHERE email = $1 AND used = FALSE')) {
      const email = params[0];
      const token = this.otp_tokens.filter(t => t.email === email && !t.used).sort((a, b) => b.created_at - a.created_at)[0];
      if (token) token.attempts++;
      return { rowCount: 1 };
    }

    // 7. Mark OTP used by ID
    if (sql.includes('UPDATE otp_tokens SET used = TRUE WHERE id = $1')) {
      const id = params[0];
      const token = this.otp_tokens.find(t => t.id === id);
      if (token) token.used = true;
      return { rowCount: 1 };
    }

    // 8. Get User for Login
    if (sql.includes('SELECT id, name, email, role_new, entity FROM users WHERE LOWER(email) = LOWER($1) AND active = TRUE')) {
      const email = params[0].toLowerCase();
      const user = this.users.find(u => u.email.toLowerCase() === email && u.active);
      return { rows: user ? [user] : [] };
    }

    // 9. Store Session
    if (sql.includes('INSERT INTO sessions (user_id, token_hash, expires_at, ip_address, user_agent)')) {
      const [user_id, token_hash, expires_at, ip_address, user_agent] = params;
      this.sessions.push({ user_id, token_hash, expires_at, ip_address, user_agent });
      return { rows: [] };
    }

    // 10. Update Last Login
    if (sql.includes('UPDATE users SET last_login = NOW() WHERE id = $1')) {
      const id = params[0];
      const user = this.users.find(u => u.id === id);
      if (user) user.last_login = new Date();
      return { rowCount: 1 };
    }

    // 11. Delete Session (Logout)
    if (sql.includes('DELETE FROM sessions WHERE token_hash = $1')) {
      const token_hash = params[0];
      this.sessions = this.sessions.filter(s => s.token_hash !== token_hash);
      return { rowCount: 1 };
    }

    // 12. Get Me
    if (sql.includes('SELECT id, name, email, role_new AS role, entity, last_login FROM users WHERE id = $1 AND active = TRUE')) {
      const id = params[0];
      const user = this.users.find(u => u.id === id && u.active);
      if (user) {
        return { rows: [{ ...user, role: user.role_new }] };
      }
      return { rows: [] };
    }

    // 13. Verify Session
    if (sql.includes('SELECT id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()')) {
      const token_hash = params[0];
      const session = this.sessions.find(s => s.token_hash === token_hash && s.expires_at > Date.now());
      return { rows: session ? [{ id: 1 }] : [] };
    }

    // Default for unknown queries (return empty or log)
    console.log(`⚠️ [MockDB] Unhandled Query: ${sql}`);
    return { rows: [] };
  }
}

export default MockPool;
