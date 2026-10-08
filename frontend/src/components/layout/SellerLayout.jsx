import { LayoutDashboard, LogOut, Package, PlusCircle, UserRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useLanguage } from '../../context/useLanguage'
import LanguageSelector from '../common/LanguageSelector'

const navigation = [
  { label: 'nav.dashboard', to: '/seller/dashboard', icon: LayoutDashboard },
  { label: 'nav.addProduct', to: '/seller/add-product', icon: PlusCircle },
  { label: 'nav.myProducts', to: '/seller/products', icon: Package },
  { label: 'nav.profile', to: '/seller/profile', icon: UserRound },
]

export default function SellerLayout() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { t } = useLanguage()
  async function logout() { try { await signOut() } finally { navigate('/login', { replace: true }) } }

  return <div className="seller-shell"><aside className="seller-sidebar"><div className="seller-brand"><span className="reviewer-brand-logo">✦</span><strong>ProductIQ</strong></div><p className="seller-label">{t('nav.sellerWorkspace')}</p><nav className="seller-nav">{navigation.map(({ label, to, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `seller-nav-item ${isActive ? 'seller-nav-item-active' : ''}`}><Icon size={18} /><span>{t(label)}</span></NavLink>)}</nav><div className="seller-profile"><strong>{user?.name || t('role.seller')}</strong><span>{user?.email || t('role.sellerAccount')}</span><button type="button" onClick={logout}><LogOut size={15} />{t('action.logout')}</button></div></aside><div className="seller-content"><header className="seller-header"><div><p>{t('header.sellerWorkspace')}</p><h1>{t('header.sellerOps')}</h1></div><LanguageSelector /><span className="reviewer-header-avatar">{(user?.name || 'S').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span></header><main className="seller-main"><Outlet /></main></div></div>
}
