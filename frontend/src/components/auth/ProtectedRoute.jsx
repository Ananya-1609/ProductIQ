import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingState from '../common/LoadingState'
import { useAuth } from '../../context/useAuth'

export default function ProtectedRoute() {
  const { user, status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingState label="Restoring your session" />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}