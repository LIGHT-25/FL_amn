import {
  ArrowLeft,
  CircleCheck,
  LayoutGrid,
  Puzzle,
  Search,
  Sparkles,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { plugins, type PluginDefinition } from '../plugins/registry'
import {
  LOGO_DEV_TOKEN,
  SERVICE_ORDER,
  chipOf,
  logoDevUrl,
  serviceOf,
  type ServiceInfo,
} from '../plugins/services'

const SERVICES: Array<ServiceInfo & { plugins: PluginDefinition[] }> = (() => {
  const groups = new Map<string, ServiceInfo & { plugins: PluginDefinition[] }>()
  for (const p of plugins) {
    const s = serviceOf(p)
    let g = groups.get(s.key)
    if (!g) {
      g = { ...s, plugins: [] }
      groups.set(s.key, g)
    }
    g.plugins.push(p)
  }
  // Curated order, unknown keys appended at the end.
  const ordered: Array<ServiceInfo & { plugins: PluginDefinition[] }> = []
  const seen = new Set<string>()
  for (const key of SERVICE_ORDER) {
    const g = groups.get(key)
    if (g) {
      ordered.push(g)
      seen.add(key)
    }
  }
  for (const [key, g] of groups) {
    if (!seen.has(key)) ordered.push(g)
  }
  return ordered
})()

const serviceMap = new Map(SERVICES.map((s) => [s.key, s]))
const AI_SERVICE_KEYS = new Set(['ollama', 'gemini'])
const APP_SERVICE_KEYS = SERVICES.filter((s) => !['triggers', 'logic', 'core'].includes(s.key)).map((s) => s.key)
const FRAMEWORK = plugins.filter(
  (p) => p.kind === 'trigger' || p.kind === 'logic' || p.kind === 'end' || p.type.startsWith('core.'),
)
const HIGHLIGHTS = ['logic.router', 'ai.gemini', 'ai.ollama', 'core.code']
  .map((t) => plugins.find((p) => p.type === t))
  .filter((p): p is PluginDefinition => Boolean(p))
const POPULAR = ['sheets', 'gmail', 'slack', 'notion', 'postgres', 'baserow']
  .map((k) => (serviceMap.has(k) ? serviceMap.get(k)! : null))
  .filter((s): s is ServiceInfo & { plugins: PluginDefinition[] } => Boolean(s))

type Tab = 'explore' | 'ai' | 'apps' | 'utility' | 'approvals'

const TABS: Array<{ key: Tab; icon: LucideIcon; label: string }> = [
  { key: 'explore', icon: LayoutGrid, label: 'Explore' },
  { key: 'ai', icon: Sparkles, label: 'AI & Agents' },
  { key: 'apps', icon: Puzzle, label: 'Apps' },
  { key: 'utility', icon: Wrench, label: 'Utility' },
  { key: 'approvals', icon: CircleCheck, label: 'Approvals' },
]

/** Official brand logo via logo.dev; letter tile while there is no token
    (or the request fails), so the picker never shows broken images. */
function ServiceLogo({ service, size, className }: { service: ServiceInfo; size: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (!service.domain || !LOGO_DEV_TOKEN || failed) {
    return (
      <span
        className={`svc-fallback${className ? ` ${className}` : ''}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.52) }}
        aria-hidden
      >
        {service.name.charAt(0)}
      </span>
    )
  }
  return (
    <img
      className={className}
      src={logoDevUrl(service.domain, size)}
      width={size}
      height={size}
      alt=""
      onError={() => setFailed(true)}
    />
  )
}

/** Row in the flat step list: service logo, name + type chip, description. */
function StepRow({ p, showServiceLogo, onPick }: { p: PluginDefinition; showServiceLogo: boolean; onPick: (p: PluginDefinition) => void }) {
  const Icon = p.icon
  const s = serviceOf(p)
  return (
    <button className="node-picker-item" onClick={() => onPick(p)} title={p.description}>
      <span className="node-picker-logo">
        {showServiceLogo ? (
          <ServiceLogo service={s} size={22} />
        ) : (
          <span className="node-picker-icon" style={{ background: p.color }}>
            <Icon size={15} />
          </span>
        )}
      </span>
      <span className="node-picker-text">
        <span className="node-picker-title-row">
          <strong>{p.label}</strong>
          <em className="node-picker-chip">{chipOf(p)}</em>
        </span>
        <small>{p.description}</small>
      </span>
    </button>
  )
}

/** Card that opens a service view (logo + service name). */
function ServiceCard({ s, onOpen }: { s: ServiceInfo; onOpen: (key: string) => void }) {
  return (
    <button className="service-card" onClick={() => onOpen(s.key)} title={s.name}>
      <ServiceLogo service={s} size={22} />
      <span>{s.name}</span>
    </button>
  )
}

export default function NodePicker({ onPick, onClose }: { onPick: (pluginType: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('explore')
  const [serviceKey, setServiceKey] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const pick = (p: PluginDefinition) => onPick(p.type)

  const searchResults = useMemo(() => {
    if (!q) return null
    return plugins.filter((p) => `${p.label} ${p.description} ${serviceOf(p).name}`.toLowerCase().includes(q))
  }, [q])

  const service = serviceKey ? serviceMap.get(serviceKey) : null

  return (
    <>
      {/* Click-away layer behind the popover */}
      <div className="node-picker-scrim" onClick={onClose} />
      <div className="node-picker">
        <div className="node-picker-head">
          {service && (
            <button className="icon-btn node-picker-back" onClick={() => setServiceKey(null)} title="Back to Explore">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="node-picker-search">
            <Search size={16} />
            <input
              autoFocus
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button className="icon-btn" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>

        {searchResults ? (
          <div className="node-picker-list node-picker-flat">
            {searchResults.map((p) => (
              <StepRow key={p.type} p={p} showServiceLogo onPick={pick} />
            ))}
            {searchResults.length === 0 && (
              <p className="muted node-picker-empty">No steps match "{query}"</p>
            )}
          </div>
        ) : (
          <>
            <nav className="node-picker-tabs" aria-label="Step categories">
              {TABS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.key}
                    className={`node-picker-tab${tab === t.key && !service ? ' is-active' : ''}`}
                    onClick={() => {
                      setTab(t.key)
                      setServiceKey(null)
                    }}
                  >
                    <Icon size={16} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </nav>

            {service ? (
              <div className="node-picker-list node-picker-flat" key={service.key}>
                {service.plugins.map((p) => (
                  <StepRow key={p.type} p={p} showServiceLogo onPick={pick} />
                ))}
              </div>
            ) : (
              <div className="node-picker-content">
                {tab === 'explore' && (
                  <div className="node-picker-cols">
                    <section>
                      <h3>Popular</h3>
                      {POPULAR.map((s) => (
                        <ServiceCard key={s.key} s={s} onOpen={setServiceKey} />
                      ))}
                    </section>
                    <section>
                      <h3>Highlights</h3>
                      {HIGHLIGHTS.map((p) => (
                        <StepRow key={p.type} p={p} showServiceLogo onPick={pick} />
                      ))}
                    </section>
                  </div>
                )}

                {tab === 'ai' && (
                  <div className="node-picker-cols">
                    {SERVICE_ORDER.filter((k) => AI_SERVICE_KEYS.has(k)).map((k) => {
                      const s = serviceMap.get(k)!
                      return (
                        <section key={k}>
                          <h3>{s.name}</h3>
                          {s.plugins.map((p) => (
                            <StepRow key={p.type} p={p} showServiceLogo onPick={pick} />
                          ))}
                        </section>
                      )
                    })}
                  </div>
                )}

                {tab === 'apps' && (
                  <div className="node-picker-grid">
                    {APP_SERVICE_KEYS.map((k) => {
                      const s = serviceMap.get(k)!
                      return <ServiceCard key={k} s={s} onOpen={setServiceKey} />
                    })}
                  </div>
                )}

                {tab === 'utility' && (
                  <div className="node-picker-flat">
                    {FRAMEWORK.map((p) => (
                      <StepRow key={p.type} p={p} showServiceLogo onPick={pick} />
                    ))}
                  </div>
                )}

                {tab === 'approvals' && (
                  <p className="muted node-picker-empty">Approval steps arrive with the backend approvals API — nothing to add yet.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
