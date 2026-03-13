import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Layout from '../components/Layout'

const TIPOS = ['ingreso', 'gasto']
const CATEGORIAS = ['Produccion', 'Logistica', 'Catering', 'Marketing', 'Personal', 'Equipamiento', 'Venue', 'Otro']

function Modal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ descripcion: '', monto: '', tipo: 'gasto', categoria: 'Produccion', nota: '' })

  useEffect(() => {
    if (initial) setForm({ descripcion: initial.descripcion || '', monto: initial.monto || '', tipo: initial.tipo || 'gasto', categoria: initial.categoria || 'Produccion', nota: initial.nota || '' })
    else setForm({ descripcion: '', monto: '', tipo: 'gasto', categoria: 'Produccion', nota: '' })
  }, [initial, open])

  if (!open) return null

  function handleSubmit(e) {
    e.preventDefault()
    onSave({ ...form, monto: Number(form.monto) })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">{initial ? 'Editar' : 'Nuevo'} movimiento</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            {TIPOS.map((t) => (
              <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${form.tipo === t ? (t === 'ingreso' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-gray-100 text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
          <input required value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descripcion" />
          <input required type="number" value={form.monto} onChange={(e) => setForm((f) => ({ ...f, monto: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Monto ($)" min="0" />
          <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <textarea value={form.nota} onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Nota (opcional)" rows={2} />
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Presupuesto() {
  const [items, setItems] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'presupuesto'), (snap) => {
      const d = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      d.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setItems(d)
    })
    return unsub
  }, [])

  async function handleSave(form) {
    if (editing) await updateDoc(doc(db, 'presupuesto', editing.id), form)
    else await addDoc(collection(db, 'presupuesto'), { ...form, createdAt: serverTimestamp() })
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id) {
    if (confirm('Eliminar este movimiento?')) await deleteDoc(doc(db, 'presupuesto', id))
  }

  const fmt = (n) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
  const total = items.filter((i) => i.tipo === 'ingreso').reduce((s, i) => s + (Number(i.monto) || 0), 0)
  const gastado = items.filter((i) => i.tipo === 'gasto').reduce((s, i) => s + (Number(i.monto) || 0), 0)
  const filtered = items.filter((i) => filtroTipo === 'todos' || i.tipo === filtroTipo)

  return (
    <Layout title="Presupuesto" action={
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
          <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-green-700">{fmt(total)}</p>
            <p className="text-xs text-green-500">Ingresos</p>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
            <p className="text-sm font-bold text-red-700">{fmt(gastado)}</p>
            <p className="text-xs text-red-500">Gastos</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
            <p className={`text-sm font-bold ${total - gastado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(total - gastado)}</p>
            <p className="text-xs text-blue-500">Disponible</p>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {['todos', ...TIPOS].map((t) => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filtroTipo === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {t === 'todos' ? 'Todos' : t}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="text-center py-12 text-gray-400"><p className="text-sm">No hay movimientos aun</p></div>
          : <div className="space-y-2">
              {filtered.map((item) => (
                <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-800 text-sm truncate">{item.descripcion}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${item.tipo === 'ingreso' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.tipo}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.categoria}</span>
                        <span className={`text-sm font-bold ${item.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>{fmt(item.monto)}</span>
                      </div>
                      {item.nota && <p className="text-xs text-gray-400 mt-1">{item.nota}</p>}
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
