import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpen,
  Bot,
  Braces,
  Calendar,
  Clock,
  Code,
  Cpu,
  Database,
  FileText,
  GitBranch,
  GitMerge,
  Globe,
  Headset,
  Hourglass,
  Image,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  MousePointerClick,
  Repeat,
  Rss,
  Search,
  Send,
  Sheet,
  Sparkles,
  Split,
  Table,
  Ticket,
  Users,
  Webhook,
} from 'lucide-react'

export type PluginKind = 'trigger' | 'action' | 'logic'

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'json' | 'boolean'

export interface PluginField {
  key: string
  label: string
  type: FieldType
  placeholder?: string
  required?: boolean
  options?: string[]
  defaultValue?: string | number | boolean
  help?: string
}

export interface PluginOutput {
  id: string
  label?: string
}

export interface PluginDefinition {
  type: string
  label: string
  description: string
  category: string
  kind: PluginKind
  icon: LucideIcon
  color: string
  fields: PluginField[]
  outputs: PluginOutput[]
}

const single: PluginOutput[] = [{ id: 'out' }]

export const plugins: PluginDefinition[] = [
  {
    type: 'trigger.manual',
    label: 'Manual Trigger',
    description: 'Start the workflow by clicking Run',
    category: 'Triggers',
    kind: 'trigger',
    icon: MousePointerClick,
    color: '#f97316',
    fields: [],
    outputs: single,
  },
  {
    type: 'trigger.webhook',
    label: 'Webhook',
    description: 'Start when an HTTP request is received',
    category: 'Triggers',
    kind: 'trigger',
    icon: Webhook,
    color: '#f97316',
    fields: [
      { key: 'method', label: 'HTTP Method', type: 'select', options: ['POST', 'GET', 'PUT', 'PATCH', 'DELETE'], defaultValue: 'POST' },
      { key: 'path', label: 'Path', type: 'text', placeholder: '/my-hook', required: true },
      { key: 'respondImmediately', label: 'Respond immediately', type: 'boolean', defaultValue: true },
    ],
    outputs: single,
  },
  {
    type: 'trigger.schedule',
    label: 'Schedule',
    description: 'Run on a cron schedule or interval',
    category: 'Triggers',
    kind: 'trigger',
    icon: Clock,
    color: '#f97316',
    fields: [
      { key: 'cron', label: 'Cron expression', type: 'text', placeholder: '0 9 * * *', required: true, help: 'Minute Hour Day Month Weekday' },
      { key: 'timezone', label: 'Timezone', type: 'text', defaultValue: 'Asia/Kolkata' },
    ],
    outputs: single,
  },
  {
    type: 'core.http',
    label: 'HTTP Request',
    description: 'Call any REST API',
    category: 'Core',
    kind: 'action',
    icon: Globe,
    color: '#3b82f6',
    fields: [
      { key: 'method', label: 'Method', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], defaultValue: 'GET' },
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/items', required: true },
      { key: 'headers', label: 'Headers', type: 'json', placeholder: '{ "Authorization": "Bearer ..." }' },
      { key: 'body', label: 'Body', type: 'json', placeholder: '{ }' },
    ],
    outputs: single,
  },
  {
    type: 'core.code',
    label: 'Code',
    description: 'Run custom JavaScript',
    category: 'Core',
    kind: 'action',
    icon: Code,
    color: '#3b82f6',
    fields: [
      {
        key: 'code',
        label: 'JavaScript',
        type: 'textarea',
        defaultValue: '// `input` holds the previous step output\nreturn input;',
      },
    ],
    outputs: single,
  },
  {
    type: 'core.transform',
    label: 'Set / Transform',
    description: 'Map, rename or set fields',
    category: 'Core',
    kind: 'action',
    icon: Braces,
    color: '#3b82f6',
    fields: [
      { key: 'mapping', label: 'Mapping', type: 'json', placeholder: '{ "email": "{{ steps.webhook.body.email }}" }', required: true },
    ],
    outputs: single,
  },
  {
    type: 'logic.if',
    label: 'IF',
    description: 'Branch on a condition',
    category: 'Logic',
    kind: 'logic',
    icon: GitBranch,
    color: '#a855f7',
    fields: [
      { key: 'left', label: 'Value', type: 'text', placeholder: '{{ steps.http.status }}', required: true },
      { key: 'operator', label: 'Operator', type: 'select', options: ['equals', 'not equals', 'contains', 'greater than', 'less than', 'is empty'], defaultValue: 'equals' },
      { key: 'right', label: 'Compare to', type: 'text', placeholder: '200' },
    ],
    outputs: [
      { id: 'true', label: 'true' },
      { id: 'false', label: 'false' },
    ],
  },
  {
    type: 'logic.router',
    label: 'Router',
    description: 'Route to one of several branches',
    category: 'Logic',
    kind: 'logic',
    icon: Split,
    color: '#a855f7',
    fields: [
      { key: 'value', label: 'Value to route on', type: 'text', placeholder: '{{ steps.ai.category }}', required: true },
      { key: 'cases', label: 'Cases (comma separated)', type: 'text', placeholder: 'sales, support, other' },
    ],
    outputs: [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
      { id: 'default', label: 'default' },
    ],
  },
  {
    type: 'logic.loop',
    label: 'Loop Over Items',
    description: 'Run the next steps for each item',
    category: 'Logic',
    kind: 'logic',
    icon: Repeat,
    color: '#a855f7',
    fields: [{ key: 'items', label: 'Items', type: 'text', placeholder: '{{ steps.http.body.results }}', required: true }],
    outputs: [
      { id: 'item', label: 'each' },
      { id: 'done', label: 'done' },
    ],
  },
  {
    type: 'logic.merge',
    label: 'Merge',
    description: 'Wait for branches and combine',
    category: 'Logic',
    kind: 'logic',
    icon: GitMerge,
    color: '#a855f7',
    fields: [{ key: 'mode', label: 'Mode', type: 'select', options: ['append', 'combine by key', 'wait for all'], defaultValue: 'append' }],
    outputs: single,
  },
  {
    type: 'logic.delay',
    label: 'Delay',
    description: 'Pause before continuing',
    category: 'Logic',
    kind: 'logic',
    icon: Hourglass,
    color: '#a855f7',
    fields: [
      { key: 'amount', label: 'Amount', type: 'number', defaultValue: 5 },
      { key: 'unit', label: 'Unit', type: 'select', options: ['seconds', 'minutes', 'hours', 'days'], defaultValue: 'minutes' },
    ],
    outputs: single,
  },
  {
    type: 'ai.llm',
    label: 'AI Prompt',
    description: 'Ask an LLM (OpenAI-compatible)',
    category: 'AI',
    kind: 'action',
    icon: Bot,
    color: '#10b981',
    fields: [
      { key: 'model', label: 'Model', type: 'select', options: ['gpt-4o-mini', 'claude-sonnet', 'gemini-flash', 'llama-3 (local)'], defaultValue: 'gpt-4o-mini' },
      { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Classify this email: {{ steps.gmail.body }}', required: true },
      { key: 'schema', label: 'Output JSON schema (optional)', type: 'json', placeholder: '{ "category": "string" }' },
    ],
    outputs: single,
  },
  {
    type: 'ai.extract',
    label: 'AI Extract Data',
    description: 'Turn text into structured JSON',
    category: 'AI',
    kind: 'action',
    icon: FileText,
    color: '#10b981',
    fields: [
      { key: 'text', label: 'Text', type: 'textarea', placeholder: '{{ steps.pdf.text }}', required: true },
      { key: 'fields', label: 'Fields to extract', type: 'text', placeholder: 'name, amount, date' },
    ],
    outputs: single,
  },
  {
    type: 'app.gmail.send',
    label: 'Gmail: Send Email',
    description: 'Send an email from Gmail',
    category: 'Apps',
    kind: 'action',
    icon: Mail,
    color: '#ef4444',
    fields: [
      { key: 'to', label: 'To', type: 'text', required: true },
      { key: 'subject', label: 'Subject', type: 'text', required: true },
      { key: 'body', label: 'Body', type: 'textarea' },
    ],
    outputs: single,
  },
  {
    type: 'app.sheets.append',
    label: 'Sheets: Append Row',
    description: 'Add a row to Google Sheets',
    category: 'Apps',
    kind: 'action',
    icon: Sheet,
    color: '#22c55e',
    fields: [
      { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true },
      { key: 'sheet', label: 'Sheet name', type: 'text', defaultValue: 'Sheet1' },
      { key: 'values', label: 'Row values', type: 'json', placeholder: '{ "Date": "{{ now }}", "Amount": 180 }' },
    ],
    outputs: single,
  },
  {
    type: 'app.slack.message',
    label: 'Slack: Send Message',
    description: 'Post a message to a channel',
    category: 'Apps',
    kind: 'action',
    icon: MessageSquare,
    color: '#8b5cf6',
    fields: [
      { key: 'channel', label: 'Channel', type: 'text', placeholder: '#alerts', required: true },
      { key: 'text', label: 'Message', type: 'textarea', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.telegram.message',
    label: 'Telegram: Send Message',
    description: 'Send a message via a bot',
    category: 'Apps',
    kind: 'action',
    icon: Send,
    color: '#0ea5e9',
    fields: [
      { key: 'chatId', label: 'Chat ID', type: 'text', required: true },
      { key: 'text', label: 'Message', type: 'textarea', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.postgres.query',
    label: 'Postgres: Query',
    description: 'Run a SQL query',
    category: 'Apps',
    kind: 'action',
    icon: Database,
    color: '#0369a1',
    fields: [{ key: 'sql', label: 'SQL', type: 'textarea', placeholder: 'SELECT * FROM leads WHERE email = $1', required: true }],
    outputs: single,
  },
  {
    type: 'ai.ollama',
    label: 'Ollama (Local AI)',
    description: 'Generate text with a local model',
    category: 'AI',
    kind: 'action',
    icon: Cpu,
    color: '#65a30d',
    fields: [
      { key: 'endpoint', label: 'Endpoint', type: 'text', defaultValue: 'http://localhost:11434' },
      { key: 'model', label: 'Model', type: 'text', defaultValue: 'llama3.1' },
      { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Classify this ticket: {{ steps.intake.body }}', required: true },
    ],
    outputs: single,
  },
  {
    type: 'ai.gemini',
    label: 'Google Gemini',
    description: 'Generate text with a hosted model',
    category: 'AI',
    kind: 'action',
    icon: Sparkles,
    color: '#0284c7',
    fields: [
      { key: 'credential', label: 'Credential (Gemini API key)', type: 'text', required: true },
      { key: 'model', label: 'Model', type: 'select', options: ['gemini-2.0-flash', 'gemini-1.5-pro'], defaultValue: 'gemini-2.0-flash' },
      { key: 'prompt', label: 'Prompt', type: 'textarea', placeholder: 'Summarize these sales rows: {{ steps.fetch.rows }}', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.tavily.search',
    label: 'Tavily Web Search',
    description: 'Search the web for current information',
    category: 'Apps',
    kind: 'action',
    icon: Search,
    color: '#f59e0b',
    fields: [
      { key: 'credential', label: 'Credential (Tavily API key)', type: 'text', required: true },
      { key: 'query', label: 'Query', type: 'text', placeholder: '{{ steps.topics.topic }}', required: true },
      { key: 'maxResults', label: 'Max results', type: 'number', defaultValue: 5 },
    ],
    outputs: single,
  },
  {
    type: 'app.images.search',
    label: 'Stock Images',
    description: 'Find stock photos by keyword',
    category: 'Apps',
    kind: 'action',
    icon: Image,
    color: '#ec4899',
    fields: [
      { key: 'provider', label: 'Provider', type: 'select', options: ['Pixabay', 'Pexels'], defaultValue: 'Pixabay' },
      { key: 'credential', label: 'Credential (provider API key)', type: 'text', required: true },
      { key: 'query', label: 'Keywords', type: 'text', placeholder: '{{ steps.topics.keywords }}', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.baserow.row',
    label: 'Baserow: Save Row',
    description: 'Create or update a database row',
    category: 'Apps',
    kind: 'action',
    icon: Table,
    color: '#2563eb',
    fields: [
      { key: 'credential', label: 'Credential (API token)', type: 'text', required: true },
      { key: 'tableId', label: 'Table ID', type: 'text', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['create row', 'update row'], defaultValue: 'create row' },
      { key: 'row', label: 'Row (JSON)', type: 'json', placeholder: '{ "Topic": "{{ steps.topics.topic }}" }', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.sheets.read',
    label: 'Sheets: Read Rows',
    description: 'Fetch rows from Google Sheets',
    category: 'Apps',
    kind: 'action',
    icon: Sheet,
    color: '#22c55e',
    fields: [
      { key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text', required: true },
      { key: 'sheet', label: 'Sheet name', type: 'text', defaultValue: 'Sheet1' },
      { key: 'range', label: 'Range', type: 'text', defaultValue: 'A1:Z1000' },
    ],
    outputs: single,
  },
  {
    type: 'app.notion.page',
    label: 'Notion: Save Page',
    description: 'Create or update a database page',
    category: 'Apps',
    kind: 'action',
    icon: BookOpen,
    color: '#737373',
    fields: [
      { key: 'credential', label: 'Credential (integration token)', type: 'text', required: true },
      { key: 'databaseId', label: 'Database ID', type: 'text', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['create page', 'update page'], defaultValue: 'create page' },
      { key: 'properties', label: 'Properties (JSON)', type: 'json', placeholder: '{ "Title": "{{ steps.analysis.title }}" }' },
      { key: 'content', label: 'Content', type: 'textarea', placeholder: '{{ steps.analysis.summary }}' },
    ],
    outputs: single,
  },
  {
    type: 'app.discord.message',
    label: 'Discord: Send Message',
    description: 'Post to a channel via webhook',
    category: 'Apps',
    kind: 'action',
    icon: MessageCircle,
    color: '#5865F2',
    fields: [
      { key: 'credential', label: 'Credential (webhook URL)', type: 'text', required: true },
      { key: 'text', label: 'Message', type: 'textarea', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.mattermost.message',
    label: 'Mattermost: Send Message',
    description: 'Notify a team channel',
    category: 'Apps',
    kind: 'action',
    icon: MessagesSquare,
    color: '#1d4ed8',
    fields: [
      { key: 'credential', label: 'Credential (webhook URL or token)', type: 'text', required: true },
      { key: 'channel', label: 'Channel', type: 'text', placeholder: 'support', required: true },
      { key: 'text', label: 'Message', type: 'textarea', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.email.send',
    label: 'Email: Send (SMTP)',
    description: 'Send email via any provider',
    category: 'Apps',
    kind: 'action',
    icon: Mail,
    color: '#ea580c',
    fields: [
      { key: 'credential', label: 'Credential (SMTP / API key)', type: 'text', required: true },
      { key: 'to', label: 'To', type: 'text', required: true },
      { key: 'subject', label: 'Subject', type: 'text', required: true },
      { key: 'body', label: 'Body', type: 'textarea' },
    ],
    outputs: single,
  },
  {
    type: 'app.facebook.post',
    label: 'Facebook: Publish Post',
    description: 'Publish to a Facebook Page',
    category: 'Apps',
    kind: 'action',
    icon: Megaphone,
    color: '#1877F2',
    fields: [
      { key: 'credential', label: 'Credential (Page access token)', type: 'text', required: true },
      { key: 'pageId', label: 'Page ID', type: 'text', required: true },
      { key: 'message', label: 'Caption', type: 'textarea', required: true },
      { key: 'imageUrl', label: 'Image URL', type: 'text' },
    ],
    outputs: single,
  },
  {
    type: 'app.instagram.post',
    label: 'Instagram: Publish Post',
    description: 'Publish to a professional account',
    category: 'Apps',
    kind: 'action',
    icon: Megaphone,
    color: '#E1306C',
    fields: [
      { key: 'credential', label: 'Credential (access token)', type: 'text', required: true },
      { key: 'imageUrl', label: 'Image URL', type: 'text', required: true },
      { key: 'caption', label: 'Caption', type: 'textarea', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.linkedin.post',
    label: 'LinkedIn: Publish Post',
    description: 'Publish a post with optional media',
    category: 'Apps',
    kind: 'action',
    icon: Megaphone,
    color: '#0A66C2',
    fields: [
      { key: 'credential', label: 'Credential (OAuth token)', type: 'text', required: true },
      { key: 'message', label: 'Post text', type: 'textarea', required: true },
      { key: 'imageUrl', label: 'Image URL', type: 'text' },
    ],
    outputs: single,
  },
  {
    type: 'app.mastodon.post',
    label: 'Mastodon: Publish Post',
    description: 'Post to a Mastodon instance',
    category: 'Apps',
    kind: 'action',
    icon: Megaphone,
    color: '#6364FF',
    fields: [
      { key: 'credential', label: 'Credential (instance + token)', type: 'text', required: true },
      { key: 'status', label: 'Post text', type: 'textarea', required: true },
      { key: 'visibility', label: 'Visibility', type: 'select', options: ['public', 'unlisted', 'private'], defaultValue: 'public' },
    ],
    outputs: single,
  },
  {
    type: 'app.wordpress.post',
    label: 'WordPress: Publish Article',
    description: 'Publish a blog article',
    category: 'Apps',
    kind: 'action',
    icon: Rss,
    color: '#21759B',
    fields: [
      { key: 'credential', label: 'Credential (app password / token)', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'content', label: 'Content', type: 'textarea', required: true },
      { key: 'status', label: 'Status', type: 'select', options: ['draft', 'publish'], defaultValue: 'draft' },
    ],
    outputs: single,
  },
  {
    type: 'app.zammad.ticket',
    label: 'Zammad: Manage Ticket',
    description: 'Create or update a support ticket',
    category: 'Apps',
    kind: 'action',
    icon: Ticket,
    color: '#059669',
    fields: [
      { key: 'credential', label: 'Credential (API token)', type: 'text', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['create ticket', 'update ticket'], defaultValue: 'create ticket' },
      { key: 'title', label: 'Title', type: 'text', placeholder: '{{ steps.intake.subject }}', required: true },
      { key: 'body', label: 'Body', type: 'textarea' },
      { key: 'group', label: 'Group', type: 'text', defaultValue: 'Users' },
      { key: 'priority', label: 'Priority', type: 'select', options: ['low', 'normal', 'high'], defaultValue: 'normal' },
    ],
    outputs: single,
  },
  {
    type: 'app.chatwoot.message',
    label: 'Chatwoot: Reply',
    description: 'Reply in a conversation',
    category: 'Apps',
    kind: 'action',
    icon: Headset,
    color: '#06b6d4',
    fields: [
      { key: 'credential', label: 'Credential (API token)', type: 'text', required: true },
      { key: 'conversationId', label: 'Conversation ID', type: 'text', required: true },
      { key: 'message', label: 'Message', type: 'textarea', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.espocrm.record',
    label: 'EspoCRM: Save Record',
    description: 'Create or update a CRM record',
    category: 'Apps',
    kind: 'action',
    icon: Users,
    color: '#c026d3',
    fields: [
      { key: 'credential', label: 'Credential (API token)', type: 'text', required: true },
      { key: 'entity', label: 'Entity', type: 'text', placeholder: 'Contact, Case, Lead…', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['create', 'update'], defaultValue: 'create' },
      { key: 'data', label: 'Data (JSON)', type: 'json', placeholder: '{ "email": "{{ steps.extract.email }}" }', required: true },
    ],
    outputs: single,
  },
  {
    type: 'app.calendar.event',
    label: 'Calendar: Manage Event',
    description: 'Check availability or create events',
    category: 'Apps',
    kind: 'action',
    icon: Calendar,
    color: '#0ea5e9',
    fields: [
      { key: 'credential', label: 'Credential (Google OAuth)', type: 'text', required: true },
      { key: 'operation', label: 'Operation', type: 'select', options: ['check availability', 'create event'], defaultValue: 'check availability' },
      { key: 'calendarId', label: 'Calendar ID', type: 'text', defaultValue: 'primary' },
      { key: 'summary', label: 'Title', type: 'text', placeholder: '{{ steps.details.topic }}' },
      { key: 'start', label: 'Start', type: 'text', placeholder: '2026-10-20T10:00:00+05:30' },
      { key: 'end', label: 'End', type: 'text', placeholder: '2026-10-20T10:30:00+05:30' },
      { key: 'attendees', label: 'Attendees (comma separated)', type: 'text' },
    ],
    outputs: single,
  },
  {
    type: 'app.quickchart.image',
    label: 'QuickChart: Make Chart',
    description: 'Render a chart image from data',
    category: 'Apps',
    kind: 'action',
    icon: BarChart3,
    color: '#d946ef',
    fields: [
      { key: 'chartType', label: 'Chart type', type: 'select', options: ['pie', 'bar', 'line', 'doughnut'], defaultValue: 'pie' },
      { key: 'labels', label: 'Labels (comma separated)', type: 'text', placeholder: 'North, South, East, West', required: true },
      { key: 'values', label: 'Values (comma separated)', type: 'text', placeholder: '120, 90, 75, 60', required: true },
      { key: 'title', label: 'Title', type: 'text', placeholder: 'Sales by region' },
    ],
    outputs: single,
  },
]

export const pluginMap: Record<string, PluginDefinition> = Object.fromEntries(plugins.map((p) => [p.type, p]))

export const categories = [...new Set(plugins.map((p) => p.category))]

export function defaultConfig(def: PluginDefinition): Record<string, unknown> {
  const config: Record<string, unknown> = {}
  for (const f of def.fields) {
    if (f.defaultValue !== undefined) config[f.key] = f.defaultValue
  }
  return config
}

export function missingRequired(def: PluginDefinition, config: Record<string, unknown>): string[] {
  return def.fields
    .filter((f) => f.required && (config[f.key] === undefined || config[f.key] === ''))
    .map((f) => f.label)
}
