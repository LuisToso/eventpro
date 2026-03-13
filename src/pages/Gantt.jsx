import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Layout from '../components/Layout'

const ESTADOS_TAREA = ['pendiente', 'en_progreso', 'completada', 'bloqueada']
const EC = {
  completada:  'bg-green-100 text-green-700',
  en_progreso: 'bg-blue-100 text-blue-700',
  pendiente:   'bg-gray-100 text-gray-600',
  bloqueada:   'bg-red-100 text-red-700'
}

function Modal({ open, onClose, onSave, initial }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', responsable: '', fechaInicio: '', fechaFin: '', estado: 'pendiente' })

  useEffect(() => {
    if (initial) setForm({ titulo: initial.titulo || '', descripcion: initial.descripcion || '', responsable: initial.responsable || '', fechaInicio: initial.fechaInicio || '', fechaFin: initial.fechaFin || '', estado: initial.estado || 'pendiente' })
    else setForm({ titulo: '', descripcion: '', responsable: '', fechaInicio: '', fechaFin: '', estado: 'pendiente' })
  }, [initial, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-3 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">{initial ? 'Editar' : 'Nueva'} tarea</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <input required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Titulo de la tarea" />
          <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descripcion" rows={2} />
          <input value={form.responsable} onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Responsable" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Fecha inicio</label>
              <input type="date" value={form.fechaInicio} onChange={(e) => setForm((f) => ({ ...f, fechaInicio: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1">Fecha fin</label>
              <input type="date" value={form.fechaFin} onChange={(e) => setForm((f) => ({ ...f, fechaFin: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {ESTADOS_TAREA.map((e) => <option key={e} value={e}>{e.replace('_', ' ')}</option>)}
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

export default function Gantt() {
  const [tareas, setTareas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtro, setFiltro] = useState('todos')

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'gantt'), (snap) => {
      const d = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      d.sort((a, b) => (a.fechaInicio || '').localeCompare(b.fechaInicio || ''))
      setTareas(d)
    })
    return unsub
  }, [])

  async function handleSave(form) {
    if (editing) await updateDoc(doc(db, 'gantt', editing.id), form)
    else await addDoc(collection(db, 'gantt'), { ...form, createdAt: serverTimestamp() })
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id) {
    if (confirm('Eliminar tarea?')) await deleteDoc(doc(db, 'gantt', id))
  }

  async function toggleEstado(tarea) {
    const sig = tarea.estado === 'completada' ? 'pendiente' : tarea.estado === 'pendiente' ? 'en_progreso' : 'completada'
    await updateDoc(doc(db, 'gantt', tarea.id), { estado: sig })
  }

  const completadas = tareas.filter((t) => t.estado === 'completada').length
  const pct = tareas.length > 0 ? Math.round((completadas / tareas.length) * 100) : 0
  const filtered = filtro === 'todos' ? tareas : tareas.filter((t) => t.estado === filtro)

  return (
    <Layout title="Gantt" action={
      <button onClick={() => { setEditing(null); setModalOpen(true) }}
        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva
      </button>
    }>
      <div className="px-4 py-5 space-y-4">
        {tareas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Progreso general</span>
              <span className="text-sm font-bold text-blue-600">{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{completadas} de {tareas.length} completadas</p>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {['todos', ...ESTADOS_TAREA].map((e) => (
            <button key={e} onClick={() => setFiltro(e)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${filtro === e ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
              {e === 'todos' ? 'Todas' : e.replace('_', ' ')}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="text-center py-12 text-gray-400"><p className="text-sm">No hay tareas aun</p></div>
          : <div className="space-y-2">
              {filtered.map((t) => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button onClick={() => toggleEstado(t)} className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${t.estado === 'completada' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                      {t.estado === 'completada' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold text-sm ${t.estado === 'completada' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.titulo}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${EC[t.estado]}`}>{t.estado.replace('_', ' ')}</span>
                      </div>
                      {t.responsable && <p className="text-xs text-gray-400 mt-0.5">{t.responsable}</p>}
                      {(t.fechaInicio || t.fechaFin) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.fechaInicio && `Inicio: ${t.fechaInicio}`}{t.fechaInicio && t.fechaFin && ' · '}{t.fechaFin && `Fin: ${t.fechaFin}`}
                        </p>
                      )}
                      {t.descripcion && <p className="text-xs text-gray-500 mt-1">{t.descripcion}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(t); setModalOpen(true) }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
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
