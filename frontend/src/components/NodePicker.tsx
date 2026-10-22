import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { categories, plugins } from '../plugins/registry'

export default function NodePicker({ onPick, onClose }: { onPick: (pluginType: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return plugins
    return plugins.filter((p) => `${p.label} ${p.description} ${p.category}`.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="node-picker">
      <div className="node-picker-head">
        <div className="node-picker-search">
          <Search size={16} />
          <input autoFocus placeholder="Search steps..." value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <button className="icon-btn" onClick={onClose} title="Close">
          <X size={16} />
        </button>
      </div>
      <div className="node-picker-list">
        {categories.map((cat) => {
          const items = filtered.filter((p) => p.category === cat)
          if (items.length === 0) return null
          return (
            <section key={cat}>
              <h3>{cat}</h3>
              {items.map((p) => {
                const Icon = p.icon
                return (
                  <button key={p.type} className="node-picker-item" onClick={() => onPick(p.type)} title={p.description}>
                    <span className="node-picker-icon" style={{ background: p.color }}>
                      <Icon size={16} />
                    </span>
                    <span className="node-picker-text">
                      <strong>{p.label}</strong>
                      <small>{p.description}</small>
                    </span>
                  </button>
                )
              })}
            </section>
          )
        })}
        {filtered.length === 0 && <p className="muted">No steps match "{query}"</p>}
      </div>
    </div>
  )
}
