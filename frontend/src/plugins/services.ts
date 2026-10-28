// Service grouping for the canvas step picker: every step belongs to a
// service (Google Sheets, Slack, Gmail…) and a use case within it
// ("Insert row", "Delete row", "Send message"…), mirroring how the picker
// navbar is organized.
//
// Logos come from Brandfetch's Logo CDN, keyed by domain — every branded
// service below carries one, so the picker and the canvas nodes can show the
// official mark. Free up to 1M requests/month; services with no bundled mark
// fall through to the CDN, then to a letter tile. Framework buckets
// (Triggers, Logic, Core) have no domain, so they fall back to a letter tile.

/** Retina-sized logo URL for a service domain. */
export const brandfetchUrl = (domain: string, size: number): string => {
  const px = Math.round(size * 2)
  return `https://cdn.brandfetch.io/${domain}/w/${px}/h/${px}`
}

/* ---------- Bundled brand marks ----------
   Self-hosted SVGs (src/assets/logos) — no network, no rate limits, stable
   in screenshots and offline demos. Keyed by service key; anything missing
   falls through to the Brandfetch CDN, then to a letter tile. */

import baserowSvg from '../assets/logos/baserow.svg'
import chatwootSvg from '../assets/logos/chatwoot.svg'
import discordSvg from '../assets/logos/discord.svg'
import facebookSvg from '../assets/logos/facebook.svg'
import gmailSvg from '../assets/logos/gmail.svg'
import googlecalendarSvg from '../assets/logos/googlecalendar.svg'
import googlesheetsSvg from '../assets/logos/googlesheets.svg'
import googlegeminiSvg from '../assets/logos/googlegemini.svg'
import instagramSvg from '../assets/logos/instagram.svg'
import mastodonSvg from '../assets/logos/mastodon.svg'
import mattermostSvg from '../assets/logos/mattermost.svg'
import notionSvg from '../assets/logos/notion.svg'
import ollamaSvg from '../assets/logos/ollama.svg'
import postgresqlSvg from '../assets/logos/postgresql.svg'
import telegramSvg from '../assets/logos/telegram.svg'
import wordpressSvg from '../assets/logos/wordpress.svg'
import unsplashSvg from '../assets/logos/unsplash.svg'
import zammadSvg from '../assets/logos/zammad.svg'

export const LOCAL_LOGOS: Record<string, string> = {
  sheets: googlesheetsSvg,
  postgres: postgresqlSvg,
  baserow: baserowSvg,
  notion: notionSvg,
  discord: discordSvg,
  mattermost: mattermostSvg,
  gmail: gmailSvg,
  gcal: googlecalendarSvg,
  chatwoot: chatwootSvg,
  telegram: telegramSvg,
  facebook: facebookSvg,
  instagram: instagramSvg,
  mastodon: mastodonSvg,
  wordpress: wordpressSvg,
  zammad: zammadSvg,
  ollama: ollamaSvg,
  gemini: googlegeminiSvg,
  unsplash: unsplashSvg,
}

/** True when the service can show a real logo (bundled or via its domain). */
export function hasLogo(service: ServiceInfo): boolean {
  return Boolean(LOCAL_LOGOS[service.key] || service.domain)
}

/* ---------- Optical sizing ----------
   Source artboards differ wildly, so a raw `object-contain` makes some marks
   touch the tile edge while others sit small and off-weight. Every logo is
   therefore scaled by a fit factor until its *ink* (the largest dimension of
   the drawn artwork) covers the same fraction of the tile.

   Measured ink as a fraction of the tile, before fitting:
   - bundled SVGs ......... 0.95–1.00  → all land on LOGO_FIT below
   - Brandfetch images ..... 0.76–1.00, and they differ in kind: slack/gmail
     arrive as a padded white card, espocrm/linkedin/tavily as a solid colour
     square (which reads heavier, so it is scaled down further).
   Numbers here are ink_target / ink_measured — tweak a row to retune one
   mark; nothing else needs to change. */

/** Ink coverage target for bundled marks: 74% of the tile, 13% padding each side. */
const LOGO_FIT = 0.74

/** Per-domain fit for CDN logos (unlisted domains use this). */
const DEFAULT_BRANDFETCH_FIT = 0.85

const BRANDFETCH_FIT: Record<string, number> = {
  'slack.com': 0.97, // padded card, mark already at 0.76
  'espocrm.com': 0.68, // solid square
  'linkedin.com': 0.68, // solid square
  'tavily.com': 0.7, // near-solid square
  'quickchart.io': 0.83,
}

/** Fit factor for a service's logo image, or null when there is no logo. */
export function logoFit(service: ServiceInfo): number | null {
  if (LOCAL_LOGOS[service.key]) return LOGO_FIT
  if (!service.domain) return null
  return BRANDFETCH_FIT[service.domain] ?? DEFAULT_BRANDFETCH_FIT
}

import type { PluginDefinition } from './registry'

export interface ServiceInfo {
  /** stable key for the navbar */
  key: string
  name: string
  /** apex or product domain — the logo lookup key */
  domain?: string
  /** group heading inside the service panel */
  useCase: string
}

interface Entry extends Omit<ServiceInfo, 'useCase'> {
  useCase: string
}

const byType: Record<string, Entry> = {
  'app.sheets.read': { key: 'sheets', name: 'Google Sheets', domain: 'sheets.google.com', useCase: 'Rows' },
  'app.sheets.append': { key: 'sheets', name: 'Google Sheets', domain: 'sheets.google.com', useCase: 'Rows' },
  'app.sheets.update': { key: 'sheets', name: 'Google Sheets', domain: 'sheets.google.com', useCase: 'Rows' },
  'app.sheets.delete': { key: 'sheets', name: 'Google Sheets', domain: 'sheets.google.com', useCase: 'Rows' },
  'app.postgres.query': { key: 'postgres', name: 'Postgres', domain: 'postgresql.org', useCase: 'Queries' },
  'app.baserow.row': { key: 'baserow', name: 'Baserow', domain: 'baserow.io', useCase: 'Rows' },
  'app.notion.page': { key: 'notion', name: 'Notion', domain: 'notion.so', useCase: 'Pages' },
  'app.slack.message': { key: 'slack', name: 'Slack', domain: 'slack.com', useCase: 'Messages' },
  'app.discord.message': { key: 'discord', name: 'Discord', domain: 'discord.com', useCase: 'Messages' },
  'app.mattermost.message': { key: 'mattermost', name: 'Mattermost', domain: 'mattermost.com', useCase: 'Messages' },
  'app.gmail.send': { key: 'gmail', name: 'Gmail', domain: 'gmail.com', useCase: 'Emails' },
  'app.email.send': { key: 'smtp', name: 'Email (SMTP)', useCase: 'Emails' },
  'app.calendar.event': { key: 'gcal', name: 'Google Calendar', domain: 'calendar.google.com', useCase: 'Events' },
  'app.zammad.ticket': { key: 'zammad', name: 'Zammad', domain: 'zammad.org', useCase: 'Tickets' },
  'app.chatwoot.message': { key: 'chatwoot', name: 'Chatwoot', domain: 'chatwoot.com', useCase: 'Conversations' },
  'app.telegram.message': { key: 'telegram', name: 'Telegram', domain: 'telegram.org', useCase: 'Messages' },
  'app.espocrm.record': { key: 'espocrm', name: 'EspoCRM', domain: 'espocrm.com', useCase: 'Records' },
  'app.facebook.post': { key: 'facebook', name: 'Facebook', domain: 'facebook.com', useCase: 'Publishing' },
  'app.instagram.post': { key: 'instagram', name: 'Instagram', domain: 'instagram.com', useCase: 'Publishing' },
  'app.linkedin.post': { key: 'linkedin', name: 'LinkedIn', domain: 'linkedin.com', useCase: 'Publishing' },
  'app.mastodon.post': { key: 'mastodon', name: 'Mastodon', domain: 'mastodon.social', useCase: 'Publishing' },
  'app.wordpress.post': { key: 'wordpress', name: 'WordPress', domain: 'wordpress.org', useCase: 'Publishing' },
  'app.tavily.search': { key: 'tavily', name: 'Tavily', domain: 'tavily.com', useCase: 'Research' },
  'app.images.search': { key: 'unsplash', name: 'Unsplash', domain: 'unsplash.com', useCase: 'Media' },
  'app.quickchart.image': { key: 'quickchart', name: 'QuickChart', domain: 'quickchart.io', useCase: 'Charts' },
  'ai.ollama': { key: 'ollama', name: 'Ollama', domain: 'ollama.com', useCase: 'AI' },
  'ai.gemini': { key: 'gemini', name: 'Google Gemini', domain: 'gemini.google.com', useCase: 'AI' },
}

/** Short action-type chip shown next to step names ("Write", "Read", "Send"…). */
export function chipOf(p: PluginDefinition): string {
  return CHIP_BY_TYPE[p.type] ?? 'Step'
}

const CHIP_BY_TYPE: Record<string, string> = {
  'trigger.manual': 'Trigger',
  'trigger.schedule': 'Trigger',
  'trigger.webhook': 'Trigger',
  'core.code': 'Run',
  'core.transform': 'Transform',
  'core.end': 'End',
  'logic.if': 'Flow',
  'logic.router': 'Flow',
  'logic.merge': 'Flow',
  'logic.delay': 'Wait',
  'ai.ollama': 'AI',
  'ai.gemini': 'AI',
  'app.http.request': 'Request',
  'app.sheets.read': 'Read',
  'app.sheets.append': 'Write',
  'app.sheets.update': 'Write',
  'app.sheets.delete': 'Write',
  'app.postgres.query': 'Run',
  'app.baserow.row': 'Write',
  'app.notion.page': 'Write',
  'app.slack.message': 'Send',
  'app.discord.message': 'Send',
  'app.mattermost.message': 'Send',
  'app.telegram.message': 'Send',
  'app.chatwoot.message': 'Send',
  'app.gmail.send': 'Send',
  'app.email.send': 'Send',
  'app.calendar.event': 'Manage',
  'app.zammad.ticket': 'Manage',
  'app.espocrm.record': 'Write',
  'app.facebook.post': 'Publish',
  'app.instagram.post': 'Publish',
  'app.linkedin.post': 'Publish',
  'app.mastodon.post': 'Publish',
  'app.wordpress.post': 'Publish',
  'app.tavily.search': 'Search',
  'app.images.search': 'Search',
  'app.quickchart.image': 'Create',
}

/** Resolve the service a step belongs to (never null — framework kinds get buckets). */
export function serviceOf(p: PluginDefinition): ServiceInfo {
  const hit = byType[p.type]
  if (hit) return hit
  if (p.kind === 'trigger') return { key: 'triggers', name: 'Triggers', useCase: 'Start a run' }
  if (p.kind === 'logic') return { key: 'logic', name: 'Logic', useCase: 'Branch & flow' }
  return { key: 'core', name: 'Core', useCase: 'Transform' }
}

/** Navbar order: data first, comms, social, intelligence, then framework buckets. */
export const SERVICE_ORDER = [
  'sheets',
  'postgres',
  'baserow',
  'notion',
  'slack',
  'discord',
  'mattermost',
  'gmail',
  'smtp',
  'gcal',
  'zammad',
  'chatwoot',
  'telegram',
  'espocrm',
  'facebook',
  'instagram',
  'linkedin',
  'mastodon',
  'wordpress',
  'tavily',
  'unsplash',
  'quickchart',
  'ollama',
  'gemini',
  'triggers',
  'logic',
  'core',
]
