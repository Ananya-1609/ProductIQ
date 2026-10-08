import { BarChart3, Boxes, History, LayoutDashboard, LogOut, ScanLine, Settings, Sparkles, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useLanguage } from '../../context/useLanguage'

const navigation = [
  { label: 'nav.dashboard', to: '/reviewer/dashboard', icon: LayoutDashboard },
  { label: 'nav.analyzeProduct', to: '/reviewer/analyze', icon: ScanLine },
  { label: 'nav.catalog', to: '/reviewer/catalog', icon: Boxes },
  { label: 'nav.history', to: '/reviewer/history', icon: History },
  { label: 'nav.analytics', to: '/reviewer/analytics', icon: BarChart3 },
  { label: 'nav.settings', to: '/reviewer/settings', icon: Settings },
]

export default function Sidebar({ mobileOpen, onClose }) {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  async function logout() { try { await signOut() } finally { navigate('/login', { replace: true }) } }
  const initials = (user?.name || user?.email || 'PI').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      {mobileOpen && <button aria-label={t('action.closeNavigation')} className="fixed inset-0 z-30 bg-slate-950/35 lg:hidden" onClick={onClose} />}
      <aside className={`reviewer-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col px-4 py-5 transition-transform md:translate-x-0 md:shadow-none ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-start justify-between px-3">
          <NavLink to="/reviewer/dashboard" className="reviewer-brand" onClick={onClose}>
            <span className="reviewer-brand-logo"><Sparkles size={19} /></span>
            <span><strong>ProductIQ</strong><small>{t('brand.tagline')}</small></span>
          </NavLink>
          <button aria-label={t('action.closeNavigation')} onClick={onClose} className="reviewer-close-button lg:hidden"><X size={18} /></button>
        </div>
        <div className="reviewer-navigation">
          <p className="reviewer-workspace-label">{t('nav.workspace')}</p>
          {navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} onClick={onClose} className={({ isActive }) => `reviewer-nav-item ${isActive ? 'reviewer-nav-item-active' : ''}`}><Icon size={18} strokeWidth={1.8} /><span>{t(label)}</span></NavLink>)}
        </div>
        <div className="reviewer-profile"><div className="flex items-center gap-3"><span className="reviewer-avatar">{initials}</span><span className="min-w-0 flex-1"><strong className="reviewer-profile-name">{user?.name || t('role.reviewer')}</strong><small className="reviewer-profile-role">{user?.role || 'REVIEWER'}</small></span><button type="button" onClick={logout} aria-label={t('action.logout')} title={t('action.logout')} className="reviewer-profile-logout"><LogOut size={16} /></button></div></div>
      </aside>
    </>
  )
}
