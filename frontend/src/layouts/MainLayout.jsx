import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { usePrefetchLovs } from '../hooks/useLov';
import apiClient from '../lib/apiClient';

// ── SVG Icon set (inline, no dependency) ──────────────────────
const Icons = {
  Dashboard:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>,
  Opportunities: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>,
  Accounts:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M3 21h18M3 7v14M21 7v14M6 21V11M9 21V11M12 21V7M15 21V11M18 21V11M3 7l9-4 9 4"/></svg>,
  Contacts:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
  Projects:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  Invoices:      () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  Collections:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>,
  Activities:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Tasks:         () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M9 11l3 3L22 4"/><path d="M20 21H4a1 1 0 01-1-1V4a1 1 0 011-1h16a1 1 0 011 1v16a1 1 0 01-1 1z"/></svg>,
  Quarterly:     () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Admin:         () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M12 15a3 3 0 100-6 3 3 0 000 6z"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  Menu:          () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  Close:         () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Logout:        () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
};

// ── Navigation config ─────────────────────────────────────────
const NAV = [
  { to: '/',              label: 'Dashboard',    Icon: Icons.Dashboard },
  { to: '/opportunities', label: 'Opportunities', Icon: Icons.Opportunities },
  { to: '/accounts',      label: 'Accounts',      Icon: Icons.Accounts },
  { to: '/contacts',      label: 'Contacts',      Icon: Icons.Contacts },
  { to: '/projects',      label: 'Projects',      Icon: Icons.Projects },
  { to: '/invoices',      label: 'Invoices',      Icon: Icons.Invoices },
  { to: '/payments',      label: 'Payment Schedule', Icon: Icons.Collections },
  { to: '/collections',   label: 'Collections',   Icon: Icons.Collections },
  { to: '/activities',    label: 'Activities',    Icon: Icons.Activities },
  { to: '/tasks',         label: 'Tasks',         Icon: Icons.Tasks },
  { to: '/quarterly',     label: 'Quarterly',     Icon: Icons.Quarterly },
];

const ADMIN_NAV = [
  { to: '/admin', label: 'Admin Panel', Icon: Icons.Admin },
];

// ── Sidebar content (shared between desktop + mobile) ─────────
function SidebarContent({ navItems, user, onLogout, onNavClick }) {
  const initials = user?.name
    ?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
        <p className="text-[9px] text-white/30 uppercase tracking-[0.18em] mb-0.5 font-medium">Astura Global</p>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-indigo-500 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-3.5 h-3.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <p className="text-[15px] font-semibold text-white tracking-tight">CRM</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto sidebar-scroll">
        <p className="px-5 text-[9px] text-white/20 uppercase tracking-[0.16em] font-medium mb-1.5 mt-1">Modules</p>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-[13px] transition-all no-underline mb-0.5 ${
                isActive
                  ? 'bg-indigo-600/20 text-white font-medium border border-indigo-500/25'
                  : 'text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-hover)] hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-indigo-400' : 'text-[var(--color-sidebar-icon)]'}>
                  <Icon />
                </span>
                <span>{label}</span>
                {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
              </>
            )}
          </NavLink>
        ))}

        {/* Admin section — only shown to admin users */}
        {navItems.some(n => n.to === '/admin') && (
          <>
            <div className="mx-5 my-2.5 border-t" style={{ borderColor: 'var(--color-sidebar-border)' }} />
            <p className="px-5 text-[9px] text-white/20 uppercase tracking-[0.16em] font-medium mb-1.5">System</p>
            <NavLink
              to="/admin"
              onClick={onNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-[13px] transition-all no-underline ${
                  isActive
                    ? 'bg-indigo-600/20 text-white font-medium border border-indigo-500/25'
                    : 'text-[var(--color-sidebar-text)] hover:text-[var(--color-sidebar-text-hover)] hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-indigo-400' : 'text-[var(--color-sidebar-icon)]'}>
                    <Icons.Admin />
                  </span>
                  <span>Admin Panel</span>
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />}
                </>
              )}
            </NavLink>
          </>
        )}
      </nav>

      {/* User footer */}
      <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: '1px solid var(--color-sidebar-border)' }}>
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition group">
          <div className="w-8 h-8 rounded-full bg-indigo-500/25 text-indigo-300 text-[12px] font-semibold flex items-center justify-center flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-white/80 font-medium truncate">{user?.name}</p>
            <p className="text-[10px] text-white/35 truncate capitalize">{user?.role}</p>
          </div>
          <button
            onClick={onLogout}
            title="Sign out"
            className="opacity-0 group-hover:opacity-100 transition text-white/30 hover:text-red-400 flex-shrink-0 cursor-pointer"
          >
            <Icons.Logout />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MainLayout ────────────────────────────────────────────────
export default function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const prefetchLovs = usePrefetchLovs();
  const [mobileOpen, setMobileOpen] = useState(false);
  const sidebarRef = useRef(null);

  useEffect(() => { prefetchLovs(); }, [prefetchLovs]);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* silent */ }
    logout();
    navigate('/login');
  };

  const navItems = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;
  const sidebarBg = 'var(--color-sidebar-bg)';

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Mobile overlay ──────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="sidebar-overlay lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Desktop Sidebar ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex flex-col w-[216px] flex-shrink-0 h-full"
        style={{ background: sidebarBg }}
      >
        <SidebarContent navItems={navItems} user={user} onLogout={handleLogout} onNavClick={() => {}} />
      </aside>

      {/* ── Mobile Sidebar (slide-in) ────────────────────────── */}
      <aside
        ref={sidebarRef}
        className={`lg:hidden fixed inset-y-0 left-0 z-40 w-[220px] flex flex-col transition-transform duration-250 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: sidebarBg }}
      >
        <div className="flex items-center justify-end p-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-sidebar-border)' }}>
          <button
            onClick={() => setMobileOpen(false)}
            className="text-white/40 hover:text-white/80 transition p-1 cursor-pointer"
          >
            <Icons.Close />
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Re-use without brand header since close button is above */}
          <SidebarContent navItems={navItems} user={user} onLogout={handleLogout} onNavClick={() => setMobileOpen(false)} />
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* ── Mobile top bar ───────────────────────────────── */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-[var(--color-border)] flex-shrink-0 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-500 hover:text-gray-900 transition cursor-pointer"
          >
            <Icons.Menu />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-indigo-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" className="w-3 h-3">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <p className="text-[14px] font-semibold text-gray-900">Astura CRM</p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
