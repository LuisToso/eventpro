import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

function StatCard({ label, value, sub, color, to }) {
  const colors = {
    blue:   'bg-blue-50 border-blue-200 text-blue-700',
    green:  'bg-green-50 border-green-200 text-green-700',
    amber:  'bg-amber-50 border-amber-200 text-amber-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700'
  }
  return (
    <Link to={to} className={`flex flex-col rounded-xl border p-4 ${colors[color] || colors.blue} active:scale-95 transition-transform`}>
      <span className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-2xl font-bold mt-1">{value}</span>
      {sub && <span className="text-xs mt-1 opacity-60">{sub}</span>}
    </Link>
  )
}

export default function Dashboard() {
  const { currentUser } = useAuth()
  const [s, setS] = useState({
    p: { total: 0, gastado: 0 },
    v: { total: 0, confirmados: 0 },
    t: { total: 0, completadas: 0 },
    n: { total: 0, resueltas: 0 }
  })

  useEffect(() => {
    const unsubs = []

    unsubs.push(onSnapshot(collection(db, 'presupuesto'), (snap) => {
      let total = 0, gastado = 0
      snap.forEach((d) => {
        const x = d.data()
        if (x.tipo === 'ingreso') total += Number(x.monto) || 0
        if (x.tipo === 'gasto') gastado += Number(x.monto) || 0
      })
      setS((prev) => ({ ...prev, p: { total, gastado } }))
    }))

    unsubs.push(onSnapshot(collection(db, 'proveedores'), (snap) => {
      let c = 0
      snap.forEach((d) => { if (d.data().estado === 'confirmado') c++ })
      setS((prev) => ({ ...prev, v: { total: snap.size, confirmados: c } }))
    }))

    unsubs.push(onSnapshot(collection(db, 'gantt'), (snap) => {
      let c = 0
      snap.forEach((d) => { if (d.data().estado === 'completada') c++ })
      setS((prev) => ({ ...prev, t: { total: snap.size, completadas: c } }))
    }))

    unsubs.push(onSnapshot(collection(db, 'necesidades'), (snap) => {
      let r = 0
      snap.forEach((d) => { if (d.data().resuelta) r++ })
      setS((prev) => ({ ...prev, n: { total: snap.size, resueltas: r } }))
    }))

    return () => unsubs.forEach((f) => f())
  }, [])

  const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
  const pct = s.p.total > 0 ? Math.min(100, Math.round((s.p.gastado / s.p.total) * 100)) : 0
  const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'equipo'

  return (
    <Layout title="Dashboard">
      <div className="px-4 py-5 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Hola, {name}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Resumen general del proyecto</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Presupuesto total</p>
              <p className="text-2xl font-bold text-gray-800 mt-0.5">{fmt(s.p.total)}</p>
            </div>
            <Link to="/presupuesto" className="bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-lg">Ver detalle</Link>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Gastado: {fmt(s.p.gastado)}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-400">Disponible: {fmt(Math.max(0, s.p.total - s.p.gastado))}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Proveedores" value={s.v.total} sub={`${s.v.confirmados} confirmados`} color="purple" to="/proveedores" />
          <StatCard label="Tareas Gantt" value={`${s.t.completadas}/${s.t.total}`} sub="completadas" color="indigo" to="/gantt" />
          <StatCard label="Necesidades" value={`${s.n.resueltas}/${s.n.total}`} sub="resueltas" color="green" to="/necesidades" />
          <StatCard label="Progreso" value={s.t.total > 0 ? `${Math.round((s.t.completadas / s.t.total) * 100)}%` : '0%'} sub="del proyecto" color="amber" to="/etapas" />
        </div>

        <div>
          <p className="text-sm font-bold text-gray-700 mb-3">Accesos rapidos</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { to: '/presupuesto', label: 'Agregar\ngasto', icon: '💰', bg: 'bg-green-50' },
              { to: '/proveedores', label: 'Nuevo\nproveedor', icon: '👤', bg: 'bg-purple-50' },
              { to: '/necesidades', label: 'Nueva\nnecesidad', icon: '📋', bg: 'bg-orange-50' }
            ].map(({ to, label, icon, bg }) => (
              <Link key={to} to={to} className={`${bg} rounded-xl p-3 text-center active:scale-95 transition-transform`}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs font-medium text-gray-700 whitespace-pre-line leading-tight">{label}</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs text-blue-700 font-semibold">Sesion activa</p>
          <p className="text-sm text-blue-900 mt-0.5">{currentUser?.email}</p>
        </div>
      </div>
    </Layout>
  )
}
