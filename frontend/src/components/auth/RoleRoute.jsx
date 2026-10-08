import { Navigate, Outlet } from 'react-router-dom'
import LoadingState from '../common/LoadingState'
import { useAuth } from '../../context/useAuth'

export default function RoleRoute({ role }) {
  const { user, status } = useAuth()

  if (status === 'loading') return <LoadingState label="Restoring your session" />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) {
    const destination = user.role === 'REVIEWER' ? '/reviewer/dashboard' : user.role === 'SELLER' ? '/seller/dashboard' : '/store'
    return <Navigate to={destination} replace />
  }
  return <Outlet />
}