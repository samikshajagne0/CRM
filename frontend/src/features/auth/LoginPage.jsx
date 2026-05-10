import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, DEV_BYPASS_OTP } from './AuthContext';
import apiClient from '../../lib/apiClient';

// ── LoginPage — Passwordless OTP flow ─────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/';

  const [step, setStep]       = useState('email');
  const [email, setEmail]     = useState('');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');

  const requestOTP = async (e) => {
    e.preventDefault();
    setError(''); setInfo(''); setLoading(true);
    try {
      const res = await apiClient.post('/auth/request-otp', { email });

      // DEV ONLY: If bypass mode is active, skip OTP screen
      if (DEV_BYPASS_OTP || res.data?.bypass) {
        const { data } = await apiClient.post('/auth/verify-otp', { email, otp: 'bypass' });
        login(data.user, data.token);
        navigate(from, { replace: true });
        setLoading(false);
        return;
      }

      setStep('otp');
      setInfo(`A 6-digit code was sent to ${email}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const verifyOTP = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await apiClient.post('/auth/verify-otp', { email, otp });
      login(data.user, data.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding ────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 p-10 relative overflow-hidden"
        style={{ background: '#0f1117' }}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle at 25px 25px, white 2px, transparent 0)',
            backgroundSize: '50px 50px',
          }}
        />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600 opacity-10 rounded-full blur-3xl" />
        <div className="absolute top-24 left-8 w-40 h-40 bg-indigo-400 opacity-5 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-5 h-5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-[15px] font-semibold leading-none">Astura Global</p>
              <p className="text-white/30 text-[11px] mt-0.5">CRM Platform</p>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            Your sales<br />command centre.
          </h1>
          <p className="text-white/40 text-[14px] leading-relaxed">
            Manage accounts, track pipelines, monitor projects and collections — all in one place.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-3">
          {[
            ['🏢', 'Accounts & Contacts'],
            ['📈', 'Opportunity Pipeline'],
            ['📋', 'Projects & Invoices'],
            ['💰', 'Collections Tracking'],
          ].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-[18px]">{icon}</span>
              <span className="text-white/50 text-[13px]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — login form ─────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[var(--color-bg)]">
        <div className="w-full max-w-[400px] animate-fade-in">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-4.5 h-4.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-gray-900">Astura Global CRM</p>
          </div>

          <div className="bg-white rounded-2xl border border-[var(--color-border)] p-8 shadow-[var(--shadow-md)]">

            {/* Header */}
            <div className="mb-7">
              <h2 className="text-[22px] font-semibold text-[var(--color-text-primary)] mb-1">
                {step === 'email' ? 'Sign in' : 'Check your email'}
              </h2>
              <p className="text-[13px] text-[var(--color-text-muted)]">
                {step === 'email'
                  ? DEV_BYPASS_OTP
                    ? 'Development mode — enter your email to continue.'
                    : 'Enter your work email to receive a login code.'
                  : `We sent a 6-digit code to ${email}`
                }
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-[var(--color-red-bg)] border border-red-200 rounded-xl px-4 py-3 mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
                </svg>
                <p className="text-[13px] text-[var(--color-red-text)]">{error}</p>
              </div>
            )}

            {/* Info */}
            {info && (
              <div className="flex items-start gap-2.5 bg-[var(--color-blue-bg)] border border-[var(--color-blue-border)] rounded-xl px-4 py-3 mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0">
                  <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
                </svg>
                <p className="text-[13px] text-[var(--color-blue-dark)]">{info}</p>
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={requestOTP} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                    Work email address
                  </label>
                  <input
                    type="email"
                    placeholder="you@astura.ai"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className="w-full border border-[var(--color-border)] rounded-xl px-4 py-3 text-[14px] text-[var(--color-text-primary)] outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100 transition placeholder:text-gray-300"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white rounded-xl py-3 text-[14px] font-medium disabled:opacity-60 transition cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: loading ? '#818cf8' : 'var(--color-blue)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" strokeDasharray="60" strokeDashoffset="40"/>
                      </svg>
                      {DEV_BYPASS_OTP ? 'Signing in…' : 'Sending code…'}
                    </>
                  ) : (
                    DEV_BYPASS_OTP ? 'Continue →' : 'Send login code →'
                  )}
                </button>
                {!DEV_BYPASS_OTP && (
                  <p className="text-[12px] text-[var(--color-text-muted)] text-center">
                    We'll email a 6-digit code. No password needed.
                  </p>
                )}
              </form>
            ) : (
              <form onSubmit={verifyOTP} className="space-y-4">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
                    6-digit verification code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                    className="w-full border border-[var(--color-border)] rounded-xl px-4 py-4 text-[28px] font-semibold text-[var(--color-text-primary)] text-center tracking-[0.5em] outline-none focus:border-indigo-400 focus:ring-3 focus:ring-indigo-100 font-mono transition placeholder:text-gray-200 placeholder:tracking-normal"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full text-white rounded-xl py-3 text-[14px] font-medium disabled:opacity-50 transition cursor-pointer"
                  style={{ background: 'var(--color-blue)', boxShadow: '0 2px 12px rgba(99,102,241,0.3)' }}
                >
                  {loading ? 'Verifying…' : 'Sign in →'}
                </button>
                <div className="flex items-center justify-between text-[12px]">
                  <button
                    type="button"
                    onClick={() => { setStep('email'); setOtp(''); setError(''); setInfo(''); }}
                    className="text-[var(--color-text-secondary)] hover:text-indigo-600 transition cursor-pointer underline"
                  >
                    ← Different email
                  </button>
                  <span className="text-[var(--color-text-muted)]">Expires in 10 mins</span>
                </div>
              </form>
            )}
          </div>

          <p className="text-center text-[11px] text-[var(--color-text-muted)] mt-6">
            Astura Global Pvt Ltd · Internal CRM
          </p>
        </div>
      </div>
    </div>
  );
}
