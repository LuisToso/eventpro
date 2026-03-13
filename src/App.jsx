import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import PrivateRoute from './components/PrivateRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Presupuesto from './pages/Presupuesto'
import Proveedores from './pages/Proveedores'
import Gantt from './pages/Gantt'
import Etapas from './pages/Etapas'
import Necesidades from './pages/Necesidades'
import Equipo from './pages/Equipo'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/presupuesto" element={<PrivateRoute><Presupuesto /></PrivateRoute>} />
          <Route path="/proveedores" element={<PrivateRoute><Proveedores /></PrivateRoute>} />
          <Route path="/gantt" element={<PrivateRoute><Gantt /></PrivateRoute>} />
          <Route path="/etapas" element={<PrivateRoute><Etapas /></PrivateRoute>} />
          <Route path="/necesidades" element={<PrivateRoute><Necesidades /></PrivateRoute>} />
          <Route path="/equipo" element={<PrivateRoute><Equipo /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
