import { useEffect, useState } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import Layout from '../components/Layout'

const COLS = [
  { id: 'por_hacer',   label: 'Por hacer',   color: 'gray'   },
  { id: 'en_progreso', label: 'En progreso', color: 'blue'   },
  { id: 'revision',    label: 'Revision',    color: 'amber'  },
  { id: 'completado',  label: 'Completado',  color: 'green'  }
]

const CC = {
  gray:  { header: 'bg-gray-100 text-gray-700',   dot: 'bg-gray-400',   count: 'bg-gray-200 text-gray-600'   },
  blue:  { header: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500',   count: 'bg-blue-200 text-blue-700'   },
  amber: { header: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400',  count: 'bg-amber-200 text-amber-700' },
  green: { header: 'bg-green-100 text-green-700', dot: 'bg-green-500',  count: 'bg-green-200 text-green-700' }
}

const PC = {
  urgente: 'bg-red-100 text-red-700',
  alta:    'bg-orange-100 text-orange-700',
  media:   'bg-yellow-100 text-yellow-700',
  baja:    'bg-gray-100 text-gray-600'
}

function Modal({ open, onClose, onSave, initial, defCol }) {
  const [form, setForm] = useState({ titulo: '', descripcion: '', prioridad: 'media', columna: defCol || 'por_hacer', responsable: '' })

  useEffect(() => {
    if (initial) setForm({ titulo: initial.titulo || '', descripcion: initial.descripcion || '', prioridad: initial.prioridad || 'media', columna: initial.columna || 'por_hacer', responsable: initial.responsable || '' })
    else setForm({ titulo: '', descripcion: '', prioridad: 'media', columna: defCol || 'por_hacer', responsable: '' })
  }, [initial, open, defCol])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg p-6 space-y-3" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800">{initial ? 'Editar' : 'Nueva'} etapa</h3>
        <form onSubmit={(e) => { e.preventDefault(); onSave(form) }} className="space-y-3">
          <input required value={form.titulo} onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Titulo de la etapa" />
          <textarea value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Descripcion" rows={2} />
          <input value={form.responsable} onChange={(e) => setForm((f) => ({ ...f, responsable: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Responsable" />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.prioridad} onChange={(e) => setForm((f) => ({ ...f, prioridad: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {['urgente', 'alta', 'media', 'baja'].map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
            <select value={form.columna} onChange={(e) => setForm((f) => ({ ...f, columna: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl">Cancelar</button>
            <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-semibold rounded-xl">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EtapaCard({ etapa, onEdit, onDelete, onMover }) {
  const col = COLS.find((c) => c.id === etapa.columna)
  const c = CC[col?.color || 'gray']

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm leading-tight">{etapa.titulo}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PC[etapa.prioridad]}`}>{etapa.prioridad}</span>
            {etapa.responsable && <span className="text-xs text-gray-400">{etapa.responsable}</span>}
          </div>
          {etapa.descripcion && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{etapa.descripcion}</p>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(etapa)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button onClick={() => onDelete(etapa.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      </div>
      <div className="mt-2 flex gap-1">
        {COLS.filter((c) => c.id !== etapa.columna).map((c) => (
          <button key={c.id} onClick={() => onMover(etapa.id, c.id)}
            className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${CC[c.color].header}`}>
            → {c.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Etapas() {
  const [etapas, setEtapas] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [defCol, setDefCol] = useState('por_hacer')
  const [kanban, setKanban] = useState(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'etapas'), (snap) => {
      const d = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      const po = { urgente: 0, alta: 1, media: 2, baja: 3 }
      d.sort((a, b) => (po[a.prioridad] ?? 3) - (po[b.prioridad] ?? 3))
      setEtapas(d)
    })
    return unsub
  }, [])

  async function handleSave(form) {
    if (editing) await updateDoc(doc(db, 'etapas', editing.id), form)
    else await addDoc(collection(db, 'etapas'), { ...form, createdAt: serverTimestamp() })
    setModalOpen(false)
    setEditing(null)
  }

  async function handleDelete(id) {
    if (confirm('Eliminar?')) await deleteDoc(doc(db, 'etapas', id))
  }

  async function handleMover(id, col) {
    await updateDoc(doc(db, 'etapas', id), { columna: col })
  }

  const comp = etapas.filter((e) => e.columna === 'completado').length
  const pct = etapas.length > 0 ? Math.round((comp / etapas.length) * 100) : 0

  return (
    <Layout title="Etapas" action={
      <button onClick={() => { setEditing(null); setModalOpen(true) }}
        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Nueva
      </button>
    }>
      <div className="px-4 py-5 space-y-4">
        {etapas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-700">Avance del proyecto</span>
              <span className="text-sm font-bold text-blue-600">{pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        <div className="flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setKanban(true)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${kanban ? 'bg-white text-gray-800 shadow' : 'text-gray-500'}`}>Tablero</button>
          <button onClick={() => setKanban(false)} className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${!kanban ? 'bg-white text-gray-800 shadow' : 'text-gray-500'}`}>Lista</button>
        </div>

        {etapas.length === 0
          ? <div className="text-center py-12 text-gray-400"><p className="text-sm">No hay etapas aun</p></div>
          : kanban
            ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
                {COLS.map((col) => {
                  const c = CC[col.color]
                  const ce = etapas.filter((e) => e.columna === col.id)
                  return (
                    <div key={col.id} className="flex-shrink-0 w-64">
                      <div className={`flex items-center justify-between px-3 py-2 rounded-xl mb-2 ${c.header}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                          <span className="text-xs font-bold">{col.label}</span>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${c.count}`}>{ce.length}</span>
                      </div>
                      <div className="space-y-2">
                        {ce.map((e) => (
                          <EtapaCard key={e.id} etapa={e}
                            onEdit={(e) => { setEditing(e); setModalOpen(true) }}
                            onDelete={handleDelete}
                            onMover={handleMover} />
                        ))}
                        <button onClick={() => { setDefCol(col.id); setEditing(null); setModalOpen(true) }}
                          className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-blue-300 hover:text-blue-400 transition-colors">
                          + Agregar
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
            : (
              <div className="space-y-2">
                {etapas.map((e) => {
                  const col = COLS.find((c) => c.id === e.columna)
                  const c = CC[col?.color || 'gray']
                  return (
                    <div key={e.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-800 text-sm">{e.titulo}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.header}`}>{col?.label}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PC[e.prioridad]}`}>{e.prioridad}</span>
                          </div>
                          {e.responsable && <p className="text-xs text-gray-400 mt-0.5">{e.responsable}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditing(e); setModalOpen(true) }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button onClick={() => handleDelete(e.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
        }
      </div>
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} onSave={handleSave} initial={editing} defCol={defCol} />
    </Layout>
  )
}
