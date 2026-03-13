import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Layout from '../components/Layout'

const PRIORIDADES = ['urgente', 'alta', 'media', 'baja']
const PC = {
  urgente: 'bg-red-100 text-red-700',
  alta:    'bg-orange-100 text-orange-700',
  media:   'bg-yellow-100 text-yellow-700',
  baja:    'bg-gray-100 text-gray-600'
}

function Modal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'media', responsable: '', resuelta: false })

  useEffect(() => {
    if (initial) setForm({ titulo: initial.titulo || '', descripcion: initial.descripcion || '', prioridad: initial.prioridad || 'media', responsable: initial.responsable || '', resuelta: initial.resuelta || false })
    else setForm({ titulo: '', descripcion: '', prioridad: 'media', responsable: '', resuelta: false })
  }, [initial, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">{initial ? 'Editar' : 'Nueva'} necesidad</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <input required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Titulo de la necesidad" />
          <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descripcion detallada" rows={3} />
          <input value={form.responsable} onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Responsable" />
          <select value={form.prioridad} onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PRIORIDADES.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
          </select>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.resuelta} onChange={(e) => setForm((f) => ({ ...f, resuelta: e.target.checked }))} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm text-gray-700">Marcar como resuelta</span>
          </label>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Necesidades() {
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtro, setFiltro] = useState('pendientes')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'necesidades'), (snap) => {
      const d = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const po = { urgente: 0, alta: 1, media: 2, baja: 3 }
      d.sort((a, b) => (po[a.prioridad] ?? 3) - (po[b.prioridad] ?? 3))
      setItems(d)
    })
    return unsub
  }, [])

  async function handleSave(form) {
    if (editing) await updateDoc(doc(db, 'necesidades', editing.id), form)
    else await addDoc(collection(db, 'necesidades'), { ...form, createdAt: serverTimestamp() })
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id) {
    if (confirm('Eliminar?')) await deleteDoc(doc(db, 'necesidades', id))
  }

  async function toggleResuelta(item) {
    await updateDoc(doc(db, 'necesidades', item.id), { resuelta: !item.resuelta })
  }

  const pendientes = items.filter((i) => !i.resuelta).length
  const resueltas = items.filter((i) => i.resuelta).length
  const filtered = filtro === 'todos' ? items : filtro === 'pendientes' ? items.filter((i) => !i.resuelta) : items.filter((i) => i.resuelta)

  return (
    <Layout title="Necesidades" action={
      <button onClick={() => { setEditing(null); setModalOpen(true) }}
        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva
      </button>
    }>
      <div className="px-4 py-5 space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <p className="text-xl font-bold text-gray-800">{items.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-700">{pendientes}</p>
            <p className="text-xs text-amber-500">Pendientes</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-green-700">{resueltas}</p>
            <p className="text-xs text-green-500">Resueltas</p>
          </div>
        </div>

        <div className="flex gap-2">
          {[
            { id: 'pendientes', label: 'Pendientes' },
            { id: 'resueltas',  label: 'Resueltas'  },
            { id: 'todos',      label: 'Todas'       }
          ].map(({ id, label }) => (
            <button key={id} onClick={() => setFiltro(id)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${filtro === id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="text-center py-12 text-gray-400"><p className="text-sm">No hay necesidades en esta vista</p></div>
          : <div className="space-y-2">
              {filtered.map((item) => (
                <div key={item.id} className={`bg-white rounded-xl border shadow-sm p-4 ${item.resuelta ? 'border-green-100 opacity-75' : 'border-gray-100'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => toggleResuelta(item)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${item.resuelta ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {item.resuelta && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-sm ${item.resuelta ? 'line-through text-gray-400' : 'text-gray-800'}`}>{item.titulo}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PC[item.prioridad]}`}>{item.prioridad}</span>
                      </div>
                      {item.responsable && <p className="text-xs text-gray-400 mt-0.5">{item.responsable}</p>}
                      {item.descripcion && <p className="text-xs text-gray-500 mt-1">{item.descripcion}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(item); setModalOpen(true) }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} initial={editing} />
    </Layout>
  )
}
