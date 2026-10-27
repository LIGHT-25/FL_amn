import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LOCAL_LOGOS, SERVICE_ORDER } from '../plugins/services'
import { templates } from '../templates/templates'
import { BranchMock, CanvasMock, FlowsMock, PickerMock, RunsMock, TemplatesMock } from './landing-mocks'
import './landing.css'

const FRAMEWORK = new Set(['triggers', 'logic', 'core'])

const LOGO_NAME: Record<string, string> = {
  sheets: 'Google Sheets',
  postgres: 'Postgres',
  baserow: 'Baserow',
  notion: 'Notion',
  discord: 'Discord',
  mattermost: 'Mattermost',
  gmail: 'Gmail',
  gcal: 'Google Calendar',
  chatwoot: 'Chatwoot',
  telegram: 'Telegram',
  facebook: 'Facebook',
  instagram: 'Instagram',
  mastodon: 'Mastodon',
  wordpress: 'WordPress',
  zammad: 'Zammad',
  ollama: 'Ollama',
  gemini: 'Google Gemini',
}

const pieces = SERVICE_ORDER.filter((key) => !FRAMEWORK.has(key))
const marks = pieces.flatMap((key) => {
  const src = LOCAL_LOGOS[key]
  return src ? [{ key, src, name: LOGO_NAME[key] ?? key }] : []
})

const features = [
  {
    title: 'Workflow builder',
    copy: 'Drag steps onto the canvas and connect them.',
    view: <CanvasMock />,
  },
  {
    id: 'runs',
    title: 'Run log',
    copy: 'Each run keeps the step, the status, and the duration.',
    view: <RunsMock />,
  },
  {
    title: 'Templates',
    copy: 'Open a starter flow and edit it on the canvas.',
    view: <TemplatesMock />,
  },
  {
    title: 'Step picker',
    copy: 'Triggers, apps, Gemini, Ollama, and a code step.',
    view: <PickerMock />,
  },
]

function sample<T>(list: T[], count: number): T[] {
  if (list.length <= count) return list
  return Array.from({ length: count }, (_, i) => list[Math.round((i * (list.length - 1)) / (count - 1))])
}

const orbit = sample(marks, 12)

function useReveal() {
  useEffect(() => {
    const root = document.querySelector('.lf')
    if (!root) return
    let observer: IntersectionObserver | undefined
    let inner = 0
    const outer = requestAnimationFrame(() => {
      root.classList.add('is-ready')
      inner = requestAnimationFrame(() => {
        observer = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              entry.target.classList.add('is-in')
              observer?.unobserve(entry.target)
            }
          },
          { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
        )
        root.querySelectorAll('.reveal').forEach((node) => observer?.observe(node))
      })
    })
    return () => {
      cancelAnimationFrame(outer)
      cancelAnimationFrame(inner)
      observer?.disconnect()
      root.classList.remove('is-ready')
    }
  }, [])
}

function Hills() {
  return (
    <svg className="lf-hills" viewBox="0 0 1440 420" preserveAspectRatio="none" aria-hidden="true">
      <path
        fill="#6a453f"
        d="M0 180C180 90 380 240 640 150C920 50 1120 200 1440 110V420H0Z"
      />
      <path
        fill="#24352c"
        d="M0 250C260 160 480 300 780 210C1080 120 1240 270 1440 190V420H0Z"
      />
      <path fill="#0b0b0a" d="M0 330C300 270 620 380 940 320C1160 270 1300 350 1440 300V420H0Z" />
    </svg>
  )
}

function Mark({ src, name }: { src: string; name: string }) {
  return (
    <span className="lf-mark">
      <img src={src} alt={name} />
    </span>
  )
}

export default function Landing() {
  useReveal()
  const loop = [...marks, ...marks]
  const useCases = [...templates, ...templates]

  return (
    <div className="lf">
      <header className="lf-nav">
        <a className="lf-brand" href="#top">
          <img src="/Routed F symbol.svg" alt="" width={26} height={26} />
          FlowForge
        </a>
        <nav className="lf-links" aria-label="Page">
          <a href="#product">Product</a>
          <a href="#use-cases">Use cases</a>
          <a href="#pieces">Pieces</a>
          <a href="#runs">Runs</a>
        </nav>
        <div className="lf-nav-actions">
          <Link className="lf-btn lf-btn-ghost" to="/app">
            Login
          </Link>
          <Link className="lf-btn lf-btn-lime" to="/app">
            Open app
          </Link>
        </div>
      </header>

      <section className="lf-hero" id="top">
        <div className="lf-hero-copy">
          <p className="lf-line" style={{ ['--i' as string]: 0 }}>
            <span className="lf-pill">
              <i />
              Visual workflow automation
            </span>
          </p>
          <h1>
            <span className="lf-line" style={{ ['--i' as string]: 1 }}>
              Build a workflow.
            </span>
            <span className="lf-line" style={{ ['--i' as string]: 2 }}>
              Run it from a click or a webhook.
            </span>
          </h1>
          <p className="lf-sub lf-line" style={{ ['--i' as string]: 3 }}>
            Canvas, step library, and a run log. Self-hosted.
          </p>
          <p className="lf-hero-cta lf-line" style={{ ['--i' as string]: 4 }}>
            <Link className="lf-btn lf-btn-light" to="/app">
              Open the app
            </Link>
          </p>
        </div>

        <Hills />
      </section>

      <div className="lf-stage">
        <div className="lf-frame">
          <CanvasMock />
        </div>
      </div>

      <div className="lf-logo-row">
        <p className="lf-logo-label">Steps in the builder</p>
        <div className="lf-marquee">
          <div className="lf-track">
            {loop.map((mark, i) => (
              <Mark key={`${mark.key}-${i}`} src={mark.src} name={i < marks.length ? mark.name : ''} />
            ))}
          </div>
        </div>
      </div>

      <section className="lf-section">
        <div className="lf-eyebrow">
          <span className="lf-pill">
            <i />
            Why FlowForge
          </span>
        </div>
        <h2>Branch, then read the run.</h2>
        <div className="lf-why-card reveal">
          <div className="lf-why-visual">
            <BranchMock />
          </div>
          <div className="lf-why-copy">
            <p>
              An IF or router sends the run down one path. Debugging lists each step, its status, and how long it
              took.
            </p>
            <a className="lf-btn lf-btn-light" href="#use-cases">
              Use cases
            </a>
          </div>
        </div>
      </section>

      <section className="lf-section lf-features" id="product">
        <div className="lf-eyebrow">
          <span className="lf-pill">
            <i />
            Product
          </span>
        </div>
        <h2>Four screens.</h2>
        <p className="lf-center-sub">Canvas, templates, the step picker, and the run log.</p>
        <div className="lf-grid">
          {features.map((feature) => (
            <article className="lf-card reveal" id={feature.id} key={feature.title}>
              <div className="lf-shot">{feature.view}</div>
              <h3>{feature.title}</h3>
              <p>{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="lf-pieces" id="pieces">
        <div className="lf-pieces-inner">
          <div className="lf-orbit" aria-hidden="true">
            <div className="lf-sphere" />
            <div className="lf-orbit-ring">
              {orbit.map((mark, i) => (
                <span
                  className="lf-orbit-slot"
                  key={mark.key}
                  style={{ ['--a' as string]: `${i * (360 / orbit.length)}deg`, ['--n' as string]: i }}
                >
                  <span className="lf-orbit-logo">
                    <span className="lf-orbit-face">
                      <img src={mark.src} alt="" />
                    </span>
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="reveal">
            <p className="lf-stat">{pieces.length}</p>
            <p className="lf-stat-label">Pieces in the builder</p>
            <div className="lf-eyebrow">
              <span className="lf-pill">
                <i />
                Pieces
              </span>
            </div>
            <h2>Connect a step in the picker.</h2>
            <p className="lf-center-sub">HTTP covers anything without a piece.</p>
          </div>
        </div>
      </section>

      <section className="lf-section lf-use" id="use-cases">
        <div className="lf-eyebrow">
          <span className="lf-pill">
            <i />
            Use cases
          </span>
        </div>
        <h2>Five flows you can open.</h2>
        <div className="lf-rail">
          <div className="lf-rail-track">
            {useCases.map((tpl, i) => (
              <article className="lf-use-card" key={`${tpl.id}-${i}`}>
                <h3>{tpl.name}</h3>
                <p>{tpl.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="lf-close-wrap">
        <section className="lf-close reveal">
          <div className="lf-close-copy">
            <h2 style={{ textAlign: 'left', margin: 0 }}>Open the builder.</h2>
            <p>The canvas, the automation list, and the run log are in the app.</p>
            <Link className="lf-btn lf-btn-light" to="/app">
              Open the app
            </Link>
          </div>
          <div className="lf-close-visual">
            <FlowsMock />
          </div>
        </section>
      </div>

      <footer className="lf-footer">
        <div>
          <a className="lf-brand" href="#top">
            <img src="/Routed F symbol.svg" alt="" width={26} height={26} />
            FlowForge
          </a>
          <p className="lf-copy">© 2026 FlowForge</p>
        </div>
        <nav aria-label="Footer">
          <Link to="/app">Open app</Link>
          <a href="#product">Product</a>
          <a href="#use-cases">Use cases</a>
          <a href="#pieces">Pieces</a>
          <a href="#runs">Runs</a>
        </nav>
      </footer>
    </div>
  )
}
