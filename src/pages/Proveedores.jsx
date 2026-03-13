import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Layout from '../components/Layout'

const ESTADOS = ['pendiente', 'cotizando', 'confirmado', 'cancelado']
const EC = {
  confirmado: 'bg-green-100 text-green-700',
  cotizando:  'bg-amber-100 text-amber-700',
  pendiente:  'bg-gray-100 text-gray-600',
  cancelado:  'bg-red-100 text-red-700'
}

function Modal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ nombre: '', rubro: '', contacto: '', telefono: '', email: '', cotizacion: '', estado: 'pendiente', notas: '' })

  useEffect(() => {
    if (initial) setForm({ nombre: initial.nombre || '', rubro: initial.rubro || '', contacto: initial.contacto || '', telefono: initial.telefono || '', email: initial.email || '', cotizacion: initial.cotizacion || '', estado: initial.estado || 'pendiente', notas: initial.notas || '' })
    else setForm({ nombre: '', rubro: '', contacto: '', telefono: '', email: '', cotizacion: '', estado: 'pendiente', notas: '' })
  }, [initial, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">{initial ? 'Editar' : 'Nuevo'} proveedor</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, cotizacion: Number(form.cotizacion) || 0 }) }} className="space-y-3">
          <input required value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre del proveedor" />
          <input value={form.rubro} onChange={(e) => setForm((f) => ({ ...f, rubro: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Rubro (ej: Catering, Audio, etc)" />
          <input value={form.contacto} onChange={(e) => setForm((f) => ({ ...f, contacto: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre de contacto" />
          <input type="tel" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Telefono" />
          <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email" />
          <input type="number" value={form.cotizacion} onChange={(e) => setForm((f) => ({ ...f, cotizacion: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cotizacion ($)" min="0" />
          <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ESTADOS.map((e) => <option key={e} value={e} className="capitalize">{e}</option>)}
          </select>
          <textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Notas" rows={2} />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProveedorCard({ p, onEdit, onDelete }) {
  const [exp, setExp] = useState(false)
  const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4" onClick={() => setExp(!exp)}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-800 text-sm">{p.nombre}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${EC[p.estado]}`}>{p.estado}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{p.rubro}</span>
              {p.cotizacion > 0 && <span className="text-xs text-blue-600 font-medium">{fmt(p.cotizacion)}</span>}
            </div>
            {p.contacto && <p className="text-xs text-gray-400 mt-1">{p.contacto}</p>}
          </div>
          <svg className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ml-2 ${exp ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      {exp && (
        <div className="border-t border-gray-100 px-4 pb-4 space-y-3">
          {p.telefono && <div><a href={`tel:${p.telefono}`} className="text-sm text-blue-600">{p.telefono}</a></div>}
          {p.email && <div><a href={`mailto:${p.email}`} className="text-sm text-blue-600 truncate block">{p.email}</a></div>}
          {p.notas && <div className="bg-gray-50 rounded-lg p-3"><p className="text-xs text-gray-500">{p.notas}</p></div>}
          <div className="flex gap-2 pt-1">
            <button onClick={() => onEdit(p)} className="flex-1 py-2 bg-blue-50 text-blue-600 text-xs font-semibold rounded-lg">Editar</button>
            <button onClick={() => onDelete(p.id)} className="flex-1 py-2 bg-red-50 text-red-600 text-xs font-semibold rounded-lg">Eliminar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Proveedores() {
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'proveedores'), (snap) => {
      const d = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      d.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setItems(d)
    })
    return unsub
  }, [])

  async function handleSave(form) {
    if (editing) await updateDoc(doc(db, 'proveedores', editing.id), form)
    else await addDoc(collection(db, 'proveedores'), { ...form, createdAt: serverTimestamp() })
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id) {
    if (confirm('Eliminar?')) await deleteDoc(doc(db, 'proveedores', id))
  }

  const filtered = items
    .filter((i) => filtroEstado === 'todos' || i.estado === filtroEstado)
    .filter((i) => !search || i.nombre?.toLowerCase().includes(search.toLowerCase()) || i.rubro?.toLowerCase().includes(search.toLowerCase()))

  return (
    <Layout title="Proveedores" action={
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
          {[
            { e: 'confirmado', l: 'Confirmados', c: 'text-green-600' },
            { e: 'cotizando',  l: 'Cotizando',  c: 'text-amber-600' },
            { e: 'pendiente',  l: 'Pendientes', c: 'text-gray-600'  }
          ].map(({ e, l, c }) => (
            <div key={e} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
              <p className={`text-lg font-bold ${c}`}>{items.filter((i) => i.estado === e).length}</p>
              <p className="text-xs text-gray-400">{l}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proveedor..." />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {['todos', ...ESTADOS].map((e) => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filtroEstado === e ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {e === 'todos' ? 'Todos' : e}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="text-center py-12 text-gray-400"><p className="text-sm">No hay proveedores aun</p></div>
          : <div className="space-y-2">{filtered.map((p) => <ProveedorCard key={p.id} p={p} onEdit={(p) => { setEditing(p); setModalOpen(true) }} onDelete={handleDelete} />)}</div>
        }
      </div>
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} initial={editing} />
    </Layout>
  )
}
