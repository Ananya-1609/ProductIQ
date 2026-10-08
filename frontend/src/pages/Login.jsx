import { ArrowRight, CheckCircle2, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginWithGoogle } from '../services/auth'
import { useAuth } from '../context/useAuth'
import { useLanguage } from '../context/useLanguage'

function destinationFor(user) {
  if (user?.role === 'REVIEWER') return '/reviewer/dashboard'
  if (user?.role === 'SELLER') return '/seller/dashboard'
  return '/store'
}

export default function Login() {
  const buttonRef = useRef(null)
  const navigate = useNavigate()
  const { user, status, setUser } = useAuth()
  const { t } = useLanguage()
  const [error, setError] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [requestedRole, setRequestedRole] = useState('USER')

  useEffect(() => {
    if (status === 'ready' && user) navigate(destinationFor(user), { replace: true })
  }, [navigate, status, user])

  useEffect(() => {
    if (status !== 'ready' || user || !window.google || !import.meta.env.VITE_GOOGLE_CLIENT_ID) return

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        try {
          setSigningIn(true)
          setError('')
          const authenticatedUser = await loginWithGoogle(credential, requestedRole)
          setUser(authenticatedUser)
          navigate(destinationFor(authenticatedUser), { replace: true })
        } catch (loginError) {
          setError(loginError.userMessage || loginError.response?.data?.detail || t('login.error'))
        } finally {
          setSigningIn(false)
        }
      },
    })
    window.google.accounts.id.renderButton(buttonRef.current, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'rectangular', width: 400 })
  }, [navigate, requestedRole, setUser, status, t, user])

  if (status === 'loading') return <main className="login-loading"><div><LoaderCircle size={18} className="animate-spin" />{t('loading.restoringProductIQ')}</div></main>
  if (user) return null

  return (
    <main className="login-page">
      <div className="login-layout">
        <section className="login-brand-panel">
          <div className="login-brand-mark"><span className="login-logo"><Sparkles size={18} /></span><span>ProductIQ</span></div>
          <div className="login-hero-copy">
            <p className="login-eyebrow">{t('login.eyebrow')}</p>
            <h1>{t('login.heroTitle')}</h1>
            <p className="login-hero-text">{t('login.heroText')}</p>
            <div className="login-features">
              <span><CheckCircle2 size={17} />{t('login.feature1')}</span>
              <span><CheckCircle2 size={17} />{t('login.feature2')}</span>
              <span><ShieldCheck size={17} />{t('login.feature3')}</span>
            </div>
          </div>
          <p className="login-meta">{t('login.metaWorkspace')} <span>·</span> {t('login.metaSecure')}</p>
        </section>

        <section className="login-form-panel">
          <div className="login-form-card">
            <p className="login-form-eyebrow">{t('login.welcomeBack')}</p>
            <h2>{t('login.signInTitle')}</h2>
            <p className="login-form-intro">{t('login.intro')}</p>
            <fieldset className="login-role-selector">
              <legend>{t('login.continueAs')}</legend>
              <label className={requestedRole === 'USER' ? 'login-role-option login-role-option-active' : 'login-role-option'}><input type="radio" name="requested-role" value="USER" checked={requestedRole === 'USER'} onChange={() => setRequestedRole('USER')} />{t('login.buyer')}</label>
              <label className={requestedRole === 'SELLER' ? 'login-role-option login-role-option-active' : 'login-role-option'}><input type="radio" name="requested-role" value="SELLER" checked={requestedRole === 'SELLER'} onChange={() => setRequestedRole('SELLER')} />{t('login.seller')}</label>
            </fieldset>
            <div className="login-google-card">
              <div ref={buttonRef} className="login-google" />
              {signingIn && <p className="login-state"><LoaderCircle size={16} className="animate-spin" />{t('login.signingIn')}</p>}
              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && <p className="login-error">{t('login.notConfigured')}</p>}
              {error && <p className="login-error" role="alert">{error}</p>}
            </div>
            <div className="login-secure"><ShieldCheck size={16} />{t('login.secureSession')}</div>
            <button type="button" className="login-home-link" onClick={() => navigate('/')}>
              {t('login.backHome')} <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
