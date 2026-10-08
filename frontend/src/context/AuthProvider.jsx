import { useEffect, useState } from 'react'
import { getCurrentUser, logout as logoutRequest } from '../services/auth'
import { AuthContext } from './authContext'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setStatus('ready'))
  }, [])

  async function signOut() {
    try {
      await logoutRequest()
    } finally {
      setUser(null)
    }
  }

  return <AuthContext.Provider value={{ user, status, setUser, signOut }}>{children}</AuthContext.Provider>
}