import { useState } from 'react'
import { LOCAL_LOGOS, brandfetchUrl, logoFit, type ServiceInfo } from '../plugins/services'
import { cn } from '@/lib/utils'

/**
 * Square brand chip — the official logo in a hairline tile.
 *
 * Lookup order:
 *   1. bundled SVG (`src/assets/logos`, keyed by service) — offline, exact
 *   2. Brandfetch CDN by domain — covers brands with no bundled mark
 *   3. letter tile — services with no brand at all (SMTP, Triggers, Logic,
 *      Core) or a failed request, so the UI never shows a broken image.
 *
 * Sizing is optical, not literal: `logoFit` scales each source so its ink
 * covers the same share of the tile (74% for bundled marks), which is what
 * makes a 24×24 glyph, the Postgres elephant and a Zammad burst read as the
 * same size. The tile itself stays on the 4px grid (24 / 32 / 36 px).
 *
 * One component for every surface: picker rows/cards, canvas nodes and the
 * config-panel header.
 */
export default function ServiceLogo({
  service,
  size,
  className,
}: {
  service: ServiceInfo
  /** rendered width/height of the tile in px */
  size: number
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const local = LOCAL_LOGOS[service.key]
  const src = local ?? (service.domain ? brandfetchUrl(service.domain, size) : null)
  const fit = logoFit(service)
  const hasLogo = Boolean(src) && fit !== null && !failed
  // Optical size of the artwork inside the tile.
  const art = hasLogo ? Math.round(size * (fit as number) * 10) / 10 : 0

  return (
    <span
      className={cn(
        'inline-grid shrink-0 place-items-center overflow-hidden rounded-md border border-line',
        hasLogo ? 'bg-white' : 'bg-line',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {hasLogo ? (
        <img
          className="object-contain"
          src={src as string}
          style={{ width: art, height: art }}
          width={art}
          height={art}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-mono leading-none font-bold text-ink"
          style={{ fontSize: Math.round(size * 0.56) }}
        >
          {service.name.charAt(0)}
        </span>
      )}
    </span>
  )
}
