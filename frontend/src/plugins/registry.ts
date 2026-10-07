import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Braces,
  Clock,
  Code,
  Database,
  FileText,
  GitBranch,
  GitMerge,
  Globe,
  Hourglass,
  Mail,
  MessageSquare,
  MousePointerClick,
  Repeat,
  Send,
  Sheet,
  Split,
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
