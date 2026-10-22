import {
    ArrowRight,
    ArrowUpRight,
    Bot,
    Check,
    ChevronRight,
    CirclePlay,
    Code2,
    Database,
    GitBranch,
    Layers3,
    MessageSquare,
    ShieldCheck,
    Sparkles,
    Workflow,
    Zap,
  } from 'lucide-react'
  import './landing-page.css'
  
  const features = [
    {
      icon: Workflow,
      title: 'Visual workflow builder',
      description:
        'Connect triggers, actions, and AI-powered steps in a visual workspace without unnecessary complexity.',
    },
    {
      icon: Bot,
      title: 'AI-powered automation',
      description:
        'Let intelligent agents handle repetitive tasks, understand context, and support better decisions.',
    },
    {
      icon: GitBranch,
      title: 'Flexible orchestration',
      description:
        'Build multi-step workflows with branching logic and reusable automation templates.',
    },
    {
      icon: ShieldCheck,
      title: 'Visibility and control',
      description:
        'Keep track of workflow runs, monitor outcomes, and understand what happens at every step.',
    },
  ]
  
  const useCases = [
    {
      icon: Sparkles,
      number: '01',
      title: 'Content automation',
      description:
        'Generate content, organize drafts, and streamline publishing workflows.',
      color: 'violet',
    },
    {
      icon: MessageSquare,
      number: '02',
      title: 'Customer support',
      description:
        'Classify incoming tickets, prioritize requests, and assist resolution.',
      color: 'blue',
    },
    {
      icon: Database,
      number: '03',
      title: 'Data processing',
      description:
        'Connect data sources, clean information, and automate report preparation.',
      color: 'green',
    },
    {
      icon: Zap,
      number: '04',
      title: 'Everyday operations',
      description:
        'Coordinate emails, meetings, and repetitive administrative tasks.',
      color: 'orange',
    },
  ]
  
  function WorkflowPreview() {
    return (
      <div className="landing-preview">
        <div className="preview-topbar">
          <div className="preview-window-dots">
            <span />
            <span />
            <span />
          </div>
          <div className="preview-title">
            <span className="preview-live-dot" />
            Customer support workflow
          </div>
          <span className="preview-status">Active</span>
        </div>
  
        <div className="preview-canvas">
          <div className="preview-grid" />
  
          <div className="preview-flow">
            <div className="preview-node">
              <span className="preview-node-icon trigger-icon">
                <Zap size={17} />
              </span>
              <span className="preview-node-copy">
                <strong>New support ticket</strong>
                <small>Trigger · Incoming request</small>
              </span>
              <Check className="preview-check" size={16} />
            </div>
  
            <div className="preview-connector">
              <span />
            </div>
  
            <div className="preview-node">
              <span className="preview-node-icon ai-icon">
                <Bot size={18} />
              </span>
              <span className="preview-node-copy">
                <strong>AI classification</strong>
                <small>Analyze intent and priority</small>
              </span>
              <Check className="preview-check" size={16} />
            </div>
  
            <div className="preview-connector">
              <span />
            </div>
  
            <div className="preview-node">
              <span className="preview-node-icon action-icon">
                <GitBranch size={17} />
              </span>
              <span className="preview-node-copy">
                <strong>Route to the right team</strong>
                <small>Conditional action</small>
              </span>
              <span className="preview-running">Running</span>
            </div>
          </div>
  
          <div className="preview-floating-card">
            <span className="floating-card-icon">
              <Layers3 size={17} />
            </span>
            <span>
              <strong>Workflow completed</strong>
              <small>3 steps · 2.4 seconds</small>
            </span>
            <Check size={16} className="floating-card-check" />
          </div>
  
          <div className="preview-side-label">
            <span className="side-label-dot" />
            AI orchestration
          </div>
        </div>
  
        <div className="preview-bottom">
          <div>
            <span className="preview-bottom-label">Workflow status</span>
            <strong>Everything is running smoothly</strong>
          </div>
          <div className="preview-mini-bars" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    )
  }
  
  export default function LandingPage() {
    return (
      <main className="landing-page">
        <header className="landing-navbar">
          <a href="#home" className="landing-brand" aria-label="FlowForge home">
          <span className="brand-logo-circle">
          <img
            src="/android-chrome-192x192.png"
            alt="FlowForge Logo"
            className="brand-logo"
           />
           </span>
            <span>
              FlowForge
              <small>INTELLIGENT AUTOMATION</small>
            </span>
          </a>
  
          <nav className="landing-nav-links" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#use-cases">Use cases</a>
            <a href="#how-it-works">How it works</a>
          </nav>
  
          <div className="landing-nav-actions">
            <a href="/app" className="landing-login">
              Open workspace
            </a>
            <a href="/app" className="landing-nav-cta">
              Get started <ArrowUpRight size={16} />
            </a>
          </div>
        </header>
  
        <section className="landing-hero" id="home">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
  
          <div className="hero-content">
            <div className="hero-eyebrow">
              <span className="eyebrow-sparkle">
                <Sparkles size={14} />
              </span>
              THE FUTURE OF WORK IS AUTOMATED
              <ChevronRight size={14} />
            </div>
  
            <h1>
              Automate workflows.
              <br />
              <span>Amplify intelligence.</span>
            </h1>
  
            <p className="hero-description">
              Bring your tools, tasks, and AI together in one intelligent
              workspace. Spend less time on repetitive work and more time on
              what matters.
            </p>
  
            <div className="hero-actions">
              <a href="/app" className="primary-cta">
                Explore your workspace <ArrowRight size={18} />
              </a>
              <a href="#how-it-works" className="secondary-cta">
                <CirclePlay size={19} /> See how it works
              </a>
            </div>
  
            <div className="hero-trust">
              <div className="trust-avatars" aria-hidden="true">
                <span>T</span>
                <span>A</span>
                <span>F</span>
                <span>+</span>
              </div>
              <p>
                <strong>Built for smarter work</strong>
                <span>Designed to make automation more accessible</span>
              </p>
            </div>
          </div>
  
          <div className="hero-visual">
            <div className="visual-orbit orbit-one" />
            <div className="visual-orbit orbit-two" />
            <WorkflowPreview />
  
            <div className="hero-float-chip chip-top">
              <span className="chip-icon chip-purple">
                <Sparkles size={16} />
              </span>
              AI-powered decisions
            </div>
  
            <div className="hero-float-chip chip-bottom">
              <span className="chip-icon chip-green">
                <Check size={16} />
              </span>
              <span>
                <strong>Less busywork</strong>
                <small>More room to create</small>
              </span>
            </div>
          </div>
  
          <div className="hero-bottom-note">
            <span className="note-line" />
            YOUR WORKFLOWS, WORKING SMARTER
            <span className="note-line" />
          </div>
        </section>
  
        <section className="landing-section features-section" id="features">
          <div className="section-heading">
            <span className="section-kicker">BUILT FOR YOUR WORKFLOW</span>
            <h2>
              Powerful automation.
              <br />
              <span>Without the complexity.</span>
            </h2>
            <p>
              Everything you need to design, coordinate, and manage intelligent
              workflows in one place.
            </p>
          </div>
  
          <div className="feature-grid">
            {features.map((feature) => {
              const Icon = feature.icon
  
              return (
                <article className="feature-card" key={feature.title}>
                  <span className="feature-icon">
                    <Icon size={22} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <a href="/app" aria-label={`Explore ${feature.title}`}>
                    Explore feature <ArrowUpRight size={15} />
                  </a>
                </article>
              )
            })}
          </div>
        </section>
  
        <section
          className="landing-section use-cases-section"
          id="use-cases"
        >
          <div className="section-heading use-cases-heading">
            <span className="section-kicker">ONE PLATFORM, MANY POSSIBILITIES</span>
            <h2>
              Turn repetitive tasks into
              <br />
              <span>intelligent systems.</span>
            </h2>
            <p>
              From everyday coordination to data-heavy processes, build
              workflows that help your team move forward.
            </p>
          </div>
  
          <div className="use-case-grid">
            {useCases.map((useCase) => {
              const Icon = useCase.icon
  
              return (
                <article
                  className={`use-case-card use-case-${useCase.color}`}
                  key={useCase.number}
                >
                  <div className="use-case-top">
                    <span className="use-case-icon">
                      <Icon size={22} />
                    </span>
                    <span className="use-case-number">{useCase.number}</span>
                  </div>
                  <h3>{useCase.title}</h3>
                  <p>{useCase.description}</p>
                  <a href="/app">
                    Build a workflow <ArrowRight size={16} />
                  </a>
                </article>
              )
            })}
          </div>
        </section>
  
        <section
          className="landing-section how-section"
          id="how-it-works"
        >
          <div className="how-intro">
            <span className="section-kicker">FROM IDEA TO AUTOMATION</span>
            <h2>
              Three steps.
              <br />
              <span>More momentum.</span>
            </h2>
            <p>
              Start with a task you want to simplify. Turn it into a workflow
              and let the platform coordinate the steps.
            </p>
            <a href="/app" className="text-link">
              Explore the workspace <ArrowRight size={17} />
            </a>
          </div>
  
          <div className="how-steps">
            <article className="how-step">
              <span className="step-number">01</span>
              <span className="step-icon">
                <Code2 size={22} />
              </span>
              <div>
                <h3>Design your workflow</h3>
                <p>
                  Choose a starting point and connect the actions your process
                  needs.
                </p>
              </div>
            </article>
  
            <article className="how-step">
              <span className="step-number">02</span>
              <span className="step-icon">
                <Bot size={22} />
              </span>
              <div>
                <h3>Add intelligence</h3>
                <p>
                  Bring AI and decision-making into the steps where they add
                  value.
                </p>
              </div>
            </article>
  
            <article className="how-step">
              <span className="step-number">03</span>
              <span className="step-icon">
                <Zap size={22} />
              </span>
              <div>
                <h3>Run and improve</h3>
                <p>
                  Execute your workflow, inspect the results, and refine the
                  process.
                </p>
              </div>
            </article>
          </div>
        </section>
  
        <section className="landing-cta-section">
          <div className="cta-decoration cta-decoration-one" />
          <div className="cta-decoration cta-decoration-two" />
          <span className="cta-kicker">
            <Sparkles size={15} /> MAKE TIME FOR WHAT MATTERS
          </span>
          <h2>
            Your next great idea
            <br />
            deserves <span>less busywork.</span>
          </h2>
          <p>
            Start exploring a smarter way to bring your workflows together.
          </p>
          <a href="/app" className="cta-button">
            Enter FlowForge <ArrowRight size={18} />
          </a>
          <span className="cta-footnote">
            <Check size={14} /> Explore the existing workspace
          </span>
        </section>
  
        <footer className="landing-footer">
          <a href="#home" className="landing-brand footer-brand">
            <span className="brand-mark">
              <Workflow size={21} />
            </span>
            <span>
              FlowForge
              <small>INTELLIGENT AUTOMATION</small>
            </span>
          </a>
  
          <p>Make workflows work for you.</p>
  
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#use-cases">Use cases</a>
            <a href="#how-it-works">How it works</a>
          </div>
  
          <span className="footer-copyright">
            © {new Date().getFullYear()} FlowForge
          </span>
        </footer>
      </main>
    )
  }