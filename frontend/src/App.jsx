import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import Analytics from './pages/Analytics'
import AnalysisResult from './pages/AnalysisResult'
import AnalyzeProduct from './pages/AnalyzeProduct'
import Catalog from './pages/Catalog'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import NotFound from './pages/NotFound'
import ProductDetails from './pages/ProductDetails'
import Settings from './pages/Settings'
import Login from './pages/Login'
import RoleRoute from './components/auth/RoleRoute'
import Store from './pages/Store'
import StoreProductDetails from './pages/StoreProductDetails'
import SellerDashboard from './pages/SellerDashboard'
import SellerProducts from './pages/SellerProducts'
import SellerProfile from './pages/SellerProfile'
import SellerProductDetails from './pages/SellerProductDetails'
import SellerLayout from './components/layout/SellerLayout'
import { useAuth } from './context/useAuth'
import LoadingState from './components/common/LoadingState'

function HomeRedirect() {
  const { user, status } = useAuth()
  if (status === 'loading') return <LoadingState label="Restoring your session" />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={user.role === 'REVIEWER' ? '/reviewer/dashboard' : user.role === 'SELLER' ? '/seller/dashboard' : '/store'} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route element={<RoleRoute role="REVIEWER" />}>
        <Route element={<AppLayout />}>
          <Route path="/reviewer/dashboard" element={<Dashboard />} />
          <Route path="/reviewer/analyze" element={<AnalyzeProduct />} />
          <Route path="/reviewer/analysis" element={<AnalysisResult />} />
          <Route path="/reviewer/catalog" element={<Catalog />} />
          <Route path="/reviewer/catalog/:id" element={<ProductDetails />} />
          <Route path="/reviewer/history" element={<History />} />
          <Route path="/reviewer/analytics" element={<Analytics />} />
          <Route path="/reviewer/settings" element={<Settings />} />
          <Route path="/reviewer/*" element={<NotFound />} />
        </Route>
      </Route>
      <Route element={<RoleRoute role="USER" />}>
        <Route path="/store" element={<Store />} />
        <Route path="/store/product/:id" element={<StoreProductDetails />} />
      </Route>
      <Route element={<RoleRoute role="SELLER" />}>
        <Route element={<SellerLayout />}>
          <Route path="/seller/dashboard" element={<SellerDashboard />} />
          <Route path="/seller/add-product" element={<AnalyzeProduct basePath="/seller" />} />
          <Route path="/seller/products" element={<SellerProducts />} />
          <Route path="/seller/products/:id" element={<SellerProductDetails />} />
          <Route path="/seller/profile" element={<SellerProfile />} />
        </Route>
      </Route>
    </Routes>
  )
}
