# Auth & Admin — Additions to Deployment Guide

---

## New files added

```
astura-crm/
├── schema_patch_auth.sql          ← Run AFTER schema.sql in Neon
├── backend/
│   ├── auth.js                    ← OTP + JWT + middleware
│   ├── admin.js                   ← Admin route handlers
│   └── server.js                  ← REPLACE with updated version
└── frontend/src/
    ├── auth/
    │   ├── LoginPage.jsx           ← OTP login screen
    │   └── useAuth.js              ← Token helper + clearAuth
    ├── admin/
    │   └── AdminPanel.jsx          ← Users / LOV / Audit panel
    └── App.jsx                     ← REPLACE with updated version
```

---

## Step 1 — Run schema patch in Neon

In your Neon SQL Editor, run the full contents of `schema_patch_auth.sql`.
This adds: `otp_tokens`, `sessions`, `lov_config`, `audit_log` tables and seeds all dropdown values.

---

## Step 2 — Add new backend dependencies

```bash
cd backend
npm install resend jsonwebtoken
```

Updated `backend/package.json` dependencies:
```json
"dependencies": {
  "cors": "^2.8.5",
  "dotenv": "^16.4.5",
  "express": "^4.18.3",
  "jsonwebtoken": "^9.0.2",
  "pg": "^8.11.3",
  "resend": "^3.2.0"
}
```

---

## Step 3 — Add new environment variables

### Railway (backend):
| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `PORT` | `4000` |
| `FRONTEND_URL` | Your Vercel URL |
| `JWT_SECRET` | Any long random string (see below) |
| `RESEND_API_KEY` | From https://resend.com/api-keys |
| `FROM_EMAIL` | `crm@yourdomain.com` (must be verified in Resend) |

**Generate JWT_SECRET** — run this in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copy the output and paste it as `JWT_SECRET` in Railway.

---

## Step 4 — Set up Resend (free tier)

1. Go to https://resend.com and sign up
2. Go to **Domains** → Add your domain (e.g. `asturaglobal.com`)
3. Add the DNS records Resend gives you to your domain registrar
4. Wait for verification (usually 5-10 mins)
5. Go to **API Keys** → Create key → copy it to Railway as `RESEND_API_KEY`
6. Set `FROM_EMAIL` to `crm@asturaglobal.com` (or any address on your verified domain)

> **No domain yet?** Use Resend's sandbox: set `FROM_EMAIL=onboarding@resend.dev` and OTPs will only send to the email you signed up with. Good enough for testing.

---

## Step 5 — Set admin credentials

The admin user is **Vinay** (already seeded). To set his email:

In Neon SQL Editor:
```sql
UPDATE users
SET email = 'vinay@asturaglobal.com'  -- replace with your real email
WHERE name = 'Vinay';
```

Then to add any other users:
```sql
INSERT INTO users (name, email, role_new, entity, active) VALUES
  ('Kishore', 'kishore@asturaglobal.com', 'sales', 'Astura Global Pvt Ltd', TRUE),
  ('Prasoon', 'prasoon@asturaglobal.com', 'manager', 'Astura Global Pvt Ltd', TRUE);
```

**No passwords are stored anywhere.** Login is always via OTP sent to the registered email.

---

## How login works (user flow)

```
User visits CRM URL
  → Enters work email
  → Clicks "Send login code"
  → Receives 6-digit OTP in email (valid 10 mins)
  → Enters OTP
  → JWT token stored in browser (valid 7 days)
  → Redirected to Dashboard
```

---

## Role permissions

| Action | Sales | Manager | Admin |
|---|---|---|---|
| View all records | ✓ | ✓ | ✓ |
| Create records | ✓ | ✓ | ✓ |
| Edit records | ✓ | ✓ | ✓ |
| Delete records | ✗ | ✓ | ✓ |
| Delete projects/invoices | ✗ | ✗ | ✓ |
| Admin panel | ✗ | ✗ | ✓ |
| Manage users | ✗ | ✗ | ✓ |
| Manage LOV values | ✗ | ✗ | ✓ |
| View audit log | ✗ | ✗ | ✓ |

---

## How dynamic dropdowns work

All dropdown values (Stages, Industries, Sources, etc.) are now stored in the `lov_config` table.

- Frontend fetches `/api/lov/:category` on load → values are live from DB
- Admin can add/disable values in **Admin Panel → System Config**
- Changes reflect immediately for all users — no redeployment needed
- Each category has hardcoded fallbacks in the frontend in case the fetch is slow

**To add a new Opportunity Stage** (e.g. "Proof of Concept"):
- Admin Panel → System Config → Opportunity Stages → Add row
- Done. The new value appears in all Stage dropdowns immediately.

---

## Security notes

- OTPs are stored as SHA-256 hashes — plain text is never persisted
- Max 3 OTP requests per 10 minutes per email (rate limiting)
- Max 5 wrong OTP attempts before token is invalidated
- JWT tokens are validated against the `sessions` table — revocable server-side
- All non-auth API routes require a valid Bearer token
- Delete operations require Manager or Admin role
- All create/update/delete operations are logged in `audit_log`
