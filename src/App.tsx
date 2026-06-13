import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { ConfirmProvider } from './context/ConfirmContext'
import Layout from './components/layout/Layout'
import LoadingScreen from './components/ui/LoadingScreen'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Incomes from './pages/Incomes'
import Cards from './pages/Cards'
import Expenses from './pages/Expenses'
import Savings from './pages/Savings'
import Projections from './pages/Projections'
import Settings from './pages/Settings'
import Monthly from './pages/Monthly'
import Checking from './pages/Checking'



function ProtectedRoutes() {
  const { state } = useApp()
  if (state.loading) return <LoadingScreen />
  if (!state.user) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/monthly" element={<Monthly />} />
        <Route path="/checking" element={<Checking />} />
        <Route path="/incomes" element={<Incomes />} />
        <Route path="/cards" element={<Cards />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/savings" element={<Savings />} />
        <Route path="/projections" element={<Projections />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

function AuthRoute() {
  const { state } = useApp()
  if (state.loading) return <LoadingScreen />
  if (state.user) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <AppProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<AuthRoute />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </AppProvider>
  )
}
