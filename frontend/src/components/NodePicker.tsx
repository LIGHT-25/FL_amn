import {
  ArrowLeft,
  Asterisk,
  CornerDownLeft,
  House,
  LayoutGrid,
  Search,
  Shuffle,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { plugins, type PluginDefinition } from '../plugins/registry'
import {
  SERVICE_ORDER,
  chipOf,
  hasLogo,
  serviceOf,
  type ServiceInfo,
} from '../plugins/services'
import ServiceLogo from './ServiceLogo'
import { Badge } from '@/components/ui/badge'
import { MOD_KEY } from '@/lib/shortcut'
import { cn } from '@/lib/utils'

/* ---------- Catalog ---------- */

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
// Branded apps, minus the framework buckets and the AI services (those get
// their own tab).
const APP_SERVICE_KEYS = SERVICES.filter(
  (s) => !['triggers', 'logic', 'core'].includes(s.key) && !AI_SERVICE_KEYS.has(s.key),
).map((s) => s.key)
const AI_SERVICES = SERVICES.filter((s) => AI_SERVICE_KEYS.has(s.key))
/** AI steps with no branded service (AI Prompt, AI Extract Data). */
const AI_BUILTIN = plugins.filter(
  (p) => p.category === 'AI' && !AI_SERVICE_KEYS.has(serviceOf(p).key),
)
const TRIGGERS = plugins.filter((p) => p.kind === 'trigger')
/** Branching, loops, waits and the End step. */
const FLOW_CONTROLS = plugins.filter((p) => p.category === 'Logic' || p.kind === 'end')
/** Plain utilities: HTTP, code, transform. */
const UTILITIES = plugins.filter((p) => p.category === 'Core' && p.kind !== 'end')
const HIGHLIGHTS = ['logic.router', 'ai.gemini', 'ai.ollama', 'core.code']
  .map((t) => plugins.find((p) => p.type === t))
  .filter((p): p is PluginDefinition => Boolean(p))
const POPULAR = ['sheets', 'gmail', 'slack', 'notion', 'postgres', 'baserow']
  .map((k) => (serviceMap.get(k) ?? null))
  .filter((s): s is ServiceInfo & { plugins: PluginDefinition[] } => Boolean(s))

type Tab = 'home' | 'apps' | 'ai' | 'flow' | 'utility'

const TABS: Array<{ key: Tab; icon: LucideIcon; label: string }> = [
  { key: 'home', icon: House, label: 'Home' },
  { key: 'apps', icon: LayoutGrid, label: 'Apps' },
  { key: 'ai', icon: Asterisk, label: 'AI' },
  { key: 'flow', icon: Shuffle, label: 'Flow controls' },
  { key: 'utility', icon: SlidersHorizontal, label: 'Utilities' },
]

/* ---------- Fuzzy matching (score: lower is better, null = no match) ---------- */

function subsequence(haystack: string, needle: string): number | null {
  let hi = 0
  let gaps = 0
  for (const ch of needle) {
    const found = haystack.indexOf(ch, hi)
    if (found === -1) return null
    if (found > hi) gaps += found - hi
    hi = found + 1
  }
  return gaps
}

function matchScore(label: string, service: string, description: string, q: string): number | null {
  const l = label.toLowerCase()
  if (l.startsWith(q)) return -10
  if (l.includes(q)) return -5
  const sub = subsequence(l, q)
  if (sub !== null) return sub
  if (service.toLowerCase().includes(q)) return 25
  if (description.toLowerCase().includes(q)) return 40
  return null
}

/* ---------- Pieces ---------- */

/** Row in a step list: service logo, name + type chip, description. */
function StepRow({
  p,
  index,
  active,
  onPick,
  onHover,
}: {
  p: PluginDefinition
  index: number
  active: boolean
  onPick: (p: PluginDefinition) => void
  onHover: (index: number) => void
}) {
  const Icon = p.icon
  const s = serviceOf(p)
  return (
    <button
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2 py-2 text-left transition-colors',
        active
          ? 'border-brand/35 bg-brand/10'
          : 'border-transparent hover:border-line hover:bg-panel-2',
      )}
      onClick={() => onPick(p)}
      onMouseMove={() => onHover(index)}
      title={p.description}
      role="option"
      aria-selected={active}
    >
      {hasLogo(s) ? (
        // Branded step → official logo chip; the step-type icon stays right.
        <ServiceLogo service={s} size={32} />
      ) : (
        // Framework step (IF, Router, Code…) → its tinted icon *is* the logo.
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md border"
          style={{
            color: p.color,
            background: `color-mix(in srgb, ${p.color} 14%, transparent)`,
            borderColor: `color-mix(in srgb, ${p.color} 32%, transparent)`,
          }}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <strong className="truncate text-[13px] font-medium text-ink">{p.label}</strong>
          <Badge className="h-4 shrink-0 border-stone-700 bg-stone-800 px-1.5 py-0 text-[10px] font-semibold tracking-wide uppercase text-stone-300">
            {chipOf(p)}
          </Badge>
        </span>
        <small className="truncate text-[11px] text-muted">{p.description}</small>
      </span>
      {hasLogo(s) && (
        <span className="grid size-6 shrink-0 place-items-center" style={{ color: p.color }}>
          <Icon size={15} />
        </span>
      )}
      {active && <CornerDownLeft size={14} className="shrink-0 text-brand" />}
    </button>
  )
}

/** Tile that drills into a service (logo + service name). */
function ServiceCard({
  s,
  index,
  active,
  onOpen,
  onHover,
}: {
  s: ServiceInfo & { plugins: PluginDefinition[] }
  index: number
  active: boolean
  onOpen: (key: string) => void
  onHover: (index: number) => void
}) {
  return (
    <button
      className={cn(
        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left text-[13px] font-medium text-ink transition-colors',
        active
          ? 'border-brand/35 bg-brand/10'
          : 'border-transparent hover:border-line hover:bg-panel-2',
      )}
      onClick={() => onOpen(s.key)}
      onMouseMove={() => onHover(index)}
      title={s.name}
      role="option"
      aria-selected={active}
    >
      <ServiceLogo service={s} size={24} />
      <span className="min-w-0 flex-1 truncate">{s.name}</span>
      <span className="shrink-0 text-[11px] font-normal text-faint">
        {s.plugins.length} step{s.plugins.length === 1 ? '' : 's'}
      </span>
      {active && <CornerDownLeft size={14} className="shrink-0 text-brand" />}
    </button>
  )
}

/* ---------- View model ---------- */

type Entry =
  | { kind: 'step'; p: PluginDefinition }
  | { kind: 'service'; key: string }

interface Section {
  title?: string
  layout: 'list' | 'grid'
  entries: Entry[]
}

/* ---------- Palette ---------- */

/** Centered picker (⌘K): Activepieces-style browsing — category tabs →
    apps → steps — with search and full keyboard navigation. */
export default function NodePicker({
  onPick,
  onClose,
}: {
  onPick: (pluginType: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('home')
  const [serviceKey, setServiceKey] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const q = query.trim().toLowerCase()

  const sections = useMemo<Section[]>(() => {
    // Search overrides the browse view and groups hits by category.
    if (q) {
      const categoryTitle: Record<string, string> = {
        Triggers: 'Triggers',
        AI: 'AI',
        Apps: 'Apps',
        Core: 'Utilities',
        Logic: 'Flow controls',
      }
      const matched = plugins
        .map((p) => ({ p, s: matchScore(p.label, serviceOf(p).name, p.description, q) }))
        .filter((m): m is { p: PluginDefinition; s: number } => m.s !== null)
        .sort((a, b) => a.s - b.s)

      const byTitle = new Map<string, Entry[]>()
      for (const { p } of matched) {
        const title = categoryTitle[p.category] ?? p.category
        const list = byTitle.get(title)
        if (list) list.push({ kind: 'step', p })
        else byTitle.set(title, [{ kind: 'step', p }])
      }
      return [...byTitle].map(([title, entries]) => ({ title, layout: 'list', entries }))
    }

    // Service drill-down.
    if (serviceKey) {
      const s = serviceMap.get(serviceKey)
      if (!s) return []
      return [
        {
          title: s.name,
          layout: 'list',
          entries: s.plugins.map((p) => ({ kind: 'step', p })),
        },
      ]
    }

    // Category tabs.
    if (tab === 'home') {
      return [
        {
          title: 'Popular',
          layout: 'grid',
          entries: POPULAR.map((s) => ({ kind: 'service', key: s.key })),
        },
        {
          title: 'Triggers',
          layout: 'list',
          entries: TRIGGERS.map((p) => ({ kind: 'step', p })),
        },
        {
          title: 'Highlights',
          layout: 'list',
          entries: HIGHLIGHTS.map((p) => ({ kind: 'step', p })),
        },
      ]
    }
    if (tab === 'apps') {
      return [
        {
          layout: 'grid',
          entries: APP_SERVICE_KEYS.map((k) => ({ kind: 'service', key: k })),
        },
      ]
    }
    if (tab === 'ai') {
      return [
        ...AI_SERVICES.map((s) => ({
          title: s.name,
          layout: 'list' as const,
          entries: s.plugins.map((p) => ({ kind: 'step' as const, p })),
        })),
        ...(AI_BUILTIN.length
          ? [
              {
                title: 'Built-in AI',
                layout: 'list' as const,
                entries: AI_BUILTIN.map((p) => ({ kind: 'step' as const, p })),
              },
            ]
          : []),
      ]
    }
    if (tab === 'flow') {
      return [{ layout: 'list', entries: FLOW_CONTROLS.map((p) => ({ kind: 'step', p })) }]
    }
    return [{ layout: 'list', entries: UTILITIES.map((p) => ({ kind: 'step', p })) }]
  }, [q, serviceKey, tab])

  const flat = useMemo(() => sections.flatMap((s) => s.entries), [sections])

  // Index of each section's first entry in the flat list, for keyboard nav.
  const offsets = useMemo(
    () => sections.map((_, i) => sections.slice(0, i).reduce((n, s) => n + s.entries.length, 0)),
    [sections],
  )

  // Derived cursor: clamped if the result set shrank under us.
  const current = flat.length > 0 ? Math.min(active, flat.length - 1) : 0

  // Lock page scroll while the picker is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const goBrowse = () => {
    setQuery('')
    setActive(0)
  }

  const openService = (key: string) => {
    setServiceKey(key)
    setActive(0)
  }

  const backToTabs = () => {
    setServiceKey(null)
    setActive(0)
  }

  const activate = (entry: Entry | undefined) => {
    if (!entry) return
    if (entry.kind === 'service') openService(entry.key)
    else onPick(entry.p.type)
  }

  const onKeyDown = (e: ReactKeyboardEvent) => {
    // Enter/arrows are handled on the container so they work while the
    // search input (or a service header button) has focus.
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (flat.length ? (i + 1) % flat.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(Math.max(flat.length - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      activate(flat[current])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      // Esc unwinds one level at a time: search → service → close.
      if (q) goBrowse()
      else if (serviceKey) backToTabs()
      else onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-[100]" onKeyDown={onKeyDown}>
      {/* Dimmed backdrop — click anywhere outside the panel to dismiss. */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />

      <div className="absolute inset-0 flex items-start justify-center px-4 pt-[9vh] sm:pt-[11vh]">
        <div
          className="flex w-[700px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-[0_28px_80px_rgb(0_0_0/0.7)] animate-in fade-in-0 zoom-in-95 duration-150"
          role="dialog"
          aria-label="Add a step"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header: back (in a service) + search */}
          <div className="flex items-center gap-2.5 border-b border-line px-3 py-3">
            {serviceKey && !q && (
              <button
                className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-transparent p-0 text-muted transition-colors hover:border-faint hover:text-ink"
                onClick={backToTabs}
                title="Back"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <Search size={17} className="shrink-0 text-faint" />
            <input
              autoFocus
              className="min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
              placeholder="Search steps, apps and triggers…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              aria-label="Search steps"
            />
            <button
              type="button"
              className="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded-md border border-line bg-panel-2 text-muted transition-colors hover:border-faint hover:bg-panel hover:text-ink"
              onClick={onClose}
              title="Close"
              aria-label="Close"
            >
              <X size={14} strokeWidth={2.25} />
            </button>
          </div>

          {/* Category tabs (hidden while searching) */}
          {!q && (
            <nav
              className="flex items-stretch gap-0.5 overflow-x-auto border-b border-line px-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              aria-label="Step categories"
            >
              {TABS.map((t) => {
                const Icon = t.icon
                const selected = tab === t.key && !serviceKey
                return (
                  <button
                    key={t.key}
                    className={cn(
                      'flex min-w-16 flex-[1_0_auto] cursor-pointer flex-col items-center gap-[3px]',
                      'border-x-0 border-t-0 border-b-2 bg-transparent px-3.5 pt-2 pb-[7px]',
                      'text-[11.5px] font-medium transition-colors',
                      selected
                        ? 'border-b-brand text-brand'
                        : 'border-b-transparent text-muted hover:text-ink',
                    )}
                    onClick={() => {
                      setTab(t.key)
                      setServiceKey(null)
                      setActive(0)
                    }}
                  >
                    <Icon size={16} />
                    <span>{t.label}</span>
                  </button>
                )
              })}
            </nav>
          )}

          {/* Results */}
          <div
            className="max-h-[54vh] min-h-[210px] overflow-y-auto px-3 pb-3 [scrollbar-gutter:stable]"
            role="listbox"
          >
            {flat.length === 0 && q && (
              <p className="px-2 py-12 text-center text-[13px] text-muted">
                No steps match “{query}”
              </p>
            )}

            {sections.map((sec, si) => (
              <section key={sec.title ?? `${tab}-group`}>
                {sec.title && (
                  <h3 className="px-1 pt-3.5 pb-1.5 font-mono text-[10.5px] font-medium tracking-[0.14em] text-faint uppercase first:pt-3">
                    {sec.title}
                  </h3>
                )}
                <div
                  className={
                    sec.layout === 'grid'
                      ? 'grid grid-cols-2 gap-x-3 gap-y-0.5'
                      : 'flex flex-col gap-0.5'
                  }
                >
                  {sec.entries.map((entry, ei) => {
                    const i = offsets[si] + ei
                    return entry.kind === 'service' ? (
                      <ServiceCard
                        key={`svc:${entry.key}`}
                        s={serviceMap.get(entry.key)!}
                        index={i}
                        active={i === current}
                        onOpen={openService}
                        onHover={setActive}
                      />
                    ) : (
                      <StepRow
                        key={`step:${entry.p.type}`}
                        p={entry.p}
                        index={i}
                        active={i === current}
                        onPick={(p) => onPick(p.type)}
                        onHover={setActive}
                      />
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* Keyboard hints */}
          <div className="flex items-center gap-4 border-t border-line bg-panel-2 px-4 py-2 text-[11px] text-faint">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono text-[10px]">↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              open / add
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono text-[10px]">{MOD_KEY}</kbd>
              <kbd className="rounded border border-line bg-panel px-1 py-0.5 font-mono text-[10px]">K</kbd>
              toggle
            </span>
            <span className="ml-auto tabular-nums">
              {flat.length} result{flat.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
