import { LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import { useAuth } from '../context/useAuth'

export default function Settings() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [error, setError] = useState('')

  async function logout() {
    try {
      setError('')
      await signOut()
      navigate('/login', { replace: true })
    } catch (cause) {
      setError(cause.response?.data?.detail || 'Unable to end the session. Please try again.')
    }
  }

  return <div className="max-w-4xl space-y-8"><section><p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-700">Workspace preferences</p><h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Settings</h2><p className="mt-2 text-slate-500">Manage your ProductIQ account session and profile.</p></section><div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]"><Card className="p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><UserRound size={19} /></span><div><h3 className="font-semibold text-slate-950">Profile</h3><p className="text-sm text-slate-500">Authenticated account information</p></div></div><dl className="mt-7 space-y-5"><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Name</dt><dd className="mt-1 text-sm font-medium text-slate-800">{user?.name || 'Not provided'}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt><dd className="mt-1 text-sm font-medium text-slate-800">{user?.email || 'Not provided'}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Role</dt><dd className="mt-1 text-sm font-medium text-slate-800">{user?.role || 'REVIEWER'}</dd></div></dl></Card><Card className="p-6"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><ShieldCheck size={19} /></span><div><h3 className="font-semibold text-slate-950">Session</h3><p className="text-sm text-slate-500">ProductIQ access security</p></div></div><p className="mt-6 text-sm leading-6 text-slate-500">Your session uses a server-managed secure cookie. Signing out invalidates the ProductIQ session on the backend.</p>{error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}<Button variant="secondary" onClick={logout} className="mt-6"><LogOut size={16} />Log out</Button></Card></div></div>
}