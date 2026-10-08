import { Bell, LogOut, Menu } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import LanguageSelector from '../common/LanguageSelector'
import { useAuth } from '../../context/useAuth'
import { useLanguage } from '../../context/useLanguage'

const titles = { '/reviewer/dashboard': 'title.dashboard', '/reviewer/analyze': 'title.analyzeProduct', '/reviewer/analysis': 'title.analysisResult', '/reviewer/catalog': 'title.productCatalog', '/reviewer/history': 'title.analysisHistory', '/reviewer/analytics': 'title.analytics', '/reviewer/settings': 'title.settings' }

export default function Header({ onMenu }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  const titleKey = pathname.startsWith('/reviewer/catalog/') ? 'title.productDetails' : titles[pathname]
  const title = titleKey ? t(titleKey) : t('app.name')
  async function logout() { try { await signOut() } finally { navigate('/login', { replace: true }) } }
  const initials = (user?.name || user?.email || 'PI').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="reviewer-header">
      <div className="flex items-center gap-3">
        <button aria-label={t('action.openNavigation')} onClick={onMenu} className="reviewer-menu-button md:hidden"><Menu size={19} /></button>
        <div><p className="reviewer-header-context">{t('header.reviewerWorkspace')} / {title}</p><h1 className="reviewer-header-title">{title}</h1></div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSelector />
        <button aria-label={t('action.notifications')} className="reviewer-header-icon relative"><Bell size={18} /><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#c5e86c]" /></button>
        <div className="hidden text-right sm:block"><strong className="reviewer-header-name">{user?.name || t('role.reviewer')}</strong><small className="reviewer-header-role">{user?.role || 'REVIEWER'}</small></div>
        <span className="reviewer-header-avatar">{initials}</span>
        <button type="button" onClick={logout} aria-label={t('action.logout')} title={t('action.logout')} className="reviewer-header-icon"><LogOut size={17} /></button>
      </div>
    </header>
  )
}
