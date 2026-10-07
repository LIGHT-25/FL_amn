import { Search } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { categories, plugins } from '../plugins/registry'

export const DRAG_MIME = 'application/x-workflow-plugin'

export default function Sidebar() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return plugins
    return plugins.filter((p) => `${p.label} ${p.description} ${p.category}`.toLowerCase().includes(q))
  }, [query])

  const onDragStart = (e: DragEvent, type: string) => {
    e.dataTransfer.setData(DRAG_MIME, type)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-search">
        <Search size={16} />
        <input placeholder="Search steps..." value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="sidebar-list">
        {categories.map((cat) => {
          const items = filtered.filter((p) => p.category === cat)
          if (items.length === 0) return null
          return (
            <section key={cat}>
              <h3>{cat}</h3>
              {items.map((p) => {
                const Icon = p.icon
                return (
                  <div
                    key={p.type}
                    className="palette-item"
                    draggable
                    onDragStart={(e) => onDragStart(e, p.type)}
                    title={p.description}
                  >
                    <span className="palette-icon" style={{ background: p.color }}>
                      <Icon size={16} />
                    </span>
                    <span className="palette-text">
                      <strong>{p.label}</strong>
                      <small>{p.description}</small>
                    </span>
                  </div>
                )
              })}
            </section>
          )
        })}
        {filtered.length === 0 && <p className="muted">No steps match "{query}"</p>}
      </div>
    </aside>
  )
}
