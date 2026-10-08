import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/common/Button'
import Card from '../components/common/Card'
import { useAuth } from '../context/useAuth'

export default function SellerProfile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  async function logout() { try { await signOut() } finally { navigate('/login', { replace: true }) } }
  return <div className="max-w-3xl space-y-6"><section><p className="seller-eyebrow">Seller workspace</p><h2 className="mt-2 text-3xl font-semibold text-slate-950">Profile</h2></section><Card className="p-6"><div className="flex items-center gap-3"><UserRound size={19} className="text-teal-700" /><h3 className="font-semibold text-slate-950">Account</h3></div><dl className="mt-6 space-y-4"><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Name</dt><dd className="mt-1 text-sm text-slate-800">{user?.name || 'Not provided'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</dt><dd className="mt-1 text-sm text-slate-800">{user?.email || 'Not provided'}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Role</dt><dd className="mt-1 text-sm text-slate-800">SELLER</dd></div></dl></Card><Card className="p-6"><div className="flex items-center gap-3"><ShieldCheck size={19} className="text-teal-700" /><h3 className="font-semibold text-slate-950">Session</h3></div><p className="mt-4 text-sm leading-6 text-slate-500">Your ProductIQ session is managed securely by the backend.</p><Button variant="secondary" className="mt-5" onClick={logout}><LogOut size={16} />Log out</Button></Card></div>
}
