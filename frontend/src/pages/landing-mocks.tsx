import { History, LayoutTemplate, MessageSquareText, Plus, Workflow, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const nav: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'flows', label: 'Flows', icon: Workflow },
  { id: 'runs', label: 'Runs', icon: History },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
]

function Shell({
  active,
  title,
  action,
  children,
  tall,
}: {
  active: string
  title: string
  action?: string
  children: ReactNode
  tall?: boolean
}) {
  return (
    <div className={tall ? 'lf-mock lf-mock-tall' : 'lf-mock'}>
      <aside className="lf-mock-side">
        <div className="lf-mock-logo">
          <img src="/Routed F symbol.svg" alt="" width={18} height={18} />
          <span>FlowForge</span>
        </div>
        {nav.map((item) => {
          const Icon = item.icon
          return (
            <div className={item.id === active ? 'is-on' : ''} key={item.id}>
              <Icon size={15} />
              <span>{item.label}</span>
            </div>
          )
        })}
      </aside>
      <div className="lf-mock-main">
        <header className="lf-mock-bar">
          <h3>{title}</h3>
          {action ? (
            <span className="lf-mock-action">
              <Plus size={14} />
              {action}
            </span>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  )
}

function Step({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="lf-mock-step">
      <span>{kicker}</span>
      <strong>{title}</strong>
    </div>
  )
}

export function CanvasMock() {
  return (
    <Shell active="flows" title="Canvas" action="New flow" tall>
      <div className="lf-mock-canvas">
        <Step kicker="Trigger" title="Webhook" />
        <Step kicker="Request" title="HTTP request" />
        <Step kicker="Flow" title="Condition" />
        <Step kicker="Send" title="Message" />
      </div>
    </Shell>
  )
}

export function BranchMock() {
  return (
    <div className="lf-mock lf-mock-branch" aria-hidden="true">
      <Step kicker="Trigger" title="Webhook" />
      <div className="lf-mock-split">
        <Step kicker="Flow" title="Condition" />
        <div>
          <Step kicker="Send" title="Message" />
          <Step kicker="End" title="Stop" />
        </div>
      </div>
    </div>
  )
}

export function RunsMock() {
  const rows = [
    ['Webhook alert', 'Succeeded', '2s'],
    ['Daily digest', 'Failed', '1s'],
    ['Form intake', 'Running', '4s'],
  ]
  return (
    <Shell active="runs" title="Runs">
      <ul className="lf-mock-list">
        {rows.map(([name, status, time]) => (
          <li key={name}>
            <strong>{name}</strong>
            <em className={status.toLowerCase()}>{status}</em>
            <span>{time}</span>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function TemplatesMock() {
  const cards = [
    ['Send a message', 'Post a short note when a webhook arrives.'],
    ['Save a row', 'Write the request fields into a table.'],
  ]
  return (
    <Shell active="templates" title="Templates">
      <div className="lf-mock-cards">
        {cards.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </Shell>
  )
}

export function PickerMock() {
  const steps = [
    ['Webhook', 'Trigger'],
    ['HTTP request', 'Request'],
    ['Condition', 'Flow'],
    ['Delay', 'Wait'],
    ['Code', 'Run'],
  ]
  return (
    <Shell active="flows" title="Add a step">
      <div className="lf-mock-search">Search steps</div>
      <ul className="lf-mock-list">
        {steps.map(([name, kind]) => (
          <li key={name}>
            <strong>{name}</strong>
            <em>{kind}</em>
          </li>
        ))}
      </ul>
    </Shell>
  )
}

export function FlowsMock() {
  const cards = [
    ['Webhook alert', 'Sends a message when a request arrives.'],
    ['Daily digest', 'Posts a short summary on a schedule.'],
  ]
  return (
    <Shell active="flows" title="Flows" action="New flow">
      <div className="lf-mock-cards">
        {cards.map(([title, copy]) => (
          <article key={title}>
            <strong>{title}</strong>
            <p>{copy}</p>
          </article>
        ))}
      </div>
    </Shell>
  )
}
