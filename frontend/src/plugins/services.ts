// Service grouping for the canvas step picker: every step belongs to a
// service (Google Sheets, Slack, Gmail…) and a use case within it
// ("Insert row", "Delete row", "Send message"…), mirroring how the picker
// navbar is organized.
//
// Official brand logos come from logo.dev — paste your publishable token
// (free tier at logo.dev, starts with "pk_…") and every logo lights up.
// Without a token the UI falls back to letter tiles automatically.

export const LOGO_DEV_TOKEN = ''

export const logoDevUrl = (domain: string, size: number): string =>
  `https://img.logo.dev/${domain}?token=${LOGO_DEV_TOKEN}&size=${size * 2}&format=png&retina=true`

import type { PluginDefinition } from './registry'

export interface ServiceInfo {
  /** stable key for the navbar */
  key: string
  name: string
  /** apex or product domain for logo.dev */
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
  'app.images.search': { key: 'stock', name: 'Stock Images', useCase: 'Media' },
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

/** Step name inside a service panel: "Sheets: Read Rows" → "Read Rows". */
export function stepDisplayName(p: PluginDefinition): string {
  const idx = p.label.indexOf(':')
  return idx === -1 ? p.label : p.label.slice(idx + 1).trim()
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
  'stock',
  'quickchart',
  'ollama',
  'gemini',
  'triggers',
  'logic',
  'core',
]
