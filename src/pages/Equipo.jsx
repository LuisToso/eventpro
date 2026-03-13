import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

const ROLES = [
  { id: 'admin',      label: 'Admin'      },
  { id: 'editor',     label: 'Editor'     },
  { id: 'visualizador', label: 'Visualizador' }
]

const RC = {
  admin:        'bg-purple-100 text-purple-700',
  editor:       'bg-blue-100 text-blue-700',
  visualizador: 'bg-gray-100 text-gray-600'
}

const EQ0 = [
  { id: '1', nombre: 'Luis Toso', email: 'luis@grupotoso.com', rol: 'admin',  avatar: 'LT' },
  { id: '2', nombre: 'Equipo Produccion', email: 'produccion@grupotoso.com', rol: 'editor', avatar: 'EP' }
]

function Modal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ nombre: '', email: '', rol: 'editor' })

  useState(() => {
    if (initial) setForm({ nombre: initial.nombre || '', email: initial.email || '', rol: initial.rol || 'editor' })
    else setForm({ nombre: '', email: '', rol: 'editor' })
  }, [initial, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">{initial ? 'Editar' : 'Agregar'} miembro</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre completo" />
          <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Correo electronico" />
          <select value={form.rol} onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MiembroCard({ m, esYo, onEdit, onDelete }) {
  const [exp, setExp] = useState(false)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 flex items-center gap-3" onClick={() => setExp(!exp)}>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {m.avatar || m.nombre?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-800 text-sm">{m.nombre}</p>
            {esYo && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">Tu</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${RC[m.rol]}`}>{ROLES.find((r) => r.id === m.rol)?.label || m.rol}</span>
            <p className="text-xs text-gray-400 truncate">{m.email}</p>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${exp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {exp && (
        <div className="border-t border-gray-100 px-4 pb-4">
          <div className="flex gap-2 mt-3">
            <button onClick={() => onEdit(m)} className="flex-1 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg">Editar</button>
            {!esYo && <button onClick={() => onDelete(m.id)} className="flex-1 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg">Eliminar</button>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function Equipo() {
  const { currentUser } = useAuth()
  const [equipo, setEquipo] = useState(EQ0)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtroRol, setFiltroRol] = useState('todos')
  const [search, setSearch] = useState('')

  function handleSave(form) {
    if (editing) setEquipo((p) => p.map((m) => m.id === editing.id ? { ...m, ...form } : m))
    else setEquipo((p) => [...p, { ...form, id: Date.now().toString(), avatar: form.nombre?.[0]?.toUpperCase() || '?' }])
    setModalOpen(false)
    setEditing(null)
  }

  function handleDelete(id) {
    if (confirm('Eliminar miembro?')) setEquipo((p) => p.filter((m) => m.id !== id))
  }

  const filtered = equipo
    .filter((m) => filtroRol === 'todos' || m.rol === filtroRol)
    .filter((m) => !search || m.nombre.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout title="Equipo" action={
      <button onClick={() => { setEditing(null); setModalOpen(true) }}
        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Agregar
      </button>
    }>
      <div className="px-4 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-gray-800">{equipo.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-purple-700">{equipo.filter((m) => m.rol === 'admin').length}</p>
            <p className="text-xs text-purple-500">Admins</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-blue-700">{equipo.filter((m) => m.rol === 'editor').length}</p>
            <p className="text-xs text-blue-500">Editores</p>
          </div>
        </div>

        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {(currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U').toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-800">Sesion activa</p>
            <p className="text-xs text-blue-600">{currentUser?.email}</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-xs text-amber-800 font-semibold mb-1">Como agregar a tu equipo</p>
          <p className="text-xs text-amber-700">Comparte el link de la app y pideles que se registren con su correo.</p>
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {[{ id: 'todos', label: 'Todos' }, ...ROLES].map((r) => (
            <button key={r.id} onClick={() => setFiltroRol(r.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${filtroRol === r.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {r.label}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="text-center py-12 text-gray-400"><p className="text-sm">No hay integrantes</p></div>
          : <div className="space-y-2">
              {filtered.map((m) => (
                <MiembroCard key={m.id} m={m} esYo={m.email === currentUser?.email}
                  onEdit={(m) => { setEditing(m); setModalOpen(true) }}
                  onDelete={handleDelete} />
              ))}
            </div>
        }
      </div>
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} initial={editing} />
    </Layout>
  )
}
