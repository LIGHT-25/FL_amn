// Starter templates for the Explore page, following the platform
// integration document: each template mirrors its doc flow, and "Use
// template" creates the workflow and seeds these nodes via seedCanvas().

import type { Edge } from '@xyflow/react';
import { BarChart3, CalendarDays, Inbox, Mail, Newspaper, type LucideIcon } from 'lucide-react';
import { pluginMap } from '../plugins/registry';
import type { CanvasSnapshot, WorkflowNode } from '../store/workflowStore';

export interface TemplateNodeDef {
  pluginType: string;
  label: string;
  config: Record<string, unknown>;
  x: number;
  y: number;
}

export interface TemplateEdgeDef {
  from: number;
  to: number;
  sourceHandle?: string;
}

export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  tags: string[];
  nodes: TemplateNodeDef[];
  edges: TemplateEdgeDef[];
}

const newId = () => crypto.randomUUID().slice(0, 8);

export function buildTemplateCanvas(tpl: AutomationTemplate): CanvasSnapshot {
  const ids = tpl.nodes.map(() => newId());
  const nodes: WorkflowNode[] = tpl.nodes.map((n, i) => ({
    id: ids[i],
    type: 'workflow',
    position: { x: n.x, y: n.y },
    data: { pluginType: n.pluginType, label: n.label, config: { ...n.config } },
  }));
  const singleOut = (idx: number) => pluginMap[tpl.nodes[idx].pluginType]?.outputs.length === 1;
  // Every template terminates at an End node: wire each single-output node
  // that has no downstream step into it.
  const routed = new Set(tpl.edges.map((e) => e.from));
  const sinks = tpl.nodes
    .map((_, i) => i)
    .filter((i) => !routed.has(i) && singleOut(i));
  const endNode: WorkflowNode = {
    id: newId(),
    type: 'workflow',
    position: {
      x: Math.max(...sinks.map((i) => tpl.nodes[i].x)) + 340,
      y: sinks.length ? tpl.nodes[sinks[0]].y : 0,
    },
    data: { pluginType: 'core.end', label: 'End', config: {} },
  };
  nodes.push(endNode);
  const edges: Edge[] = tpl.edges.map((e) => ({
    id: `e-${newId()}`,
    source: ids[e.from],
    target: ids[e.to],
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
    animated: true,
    reconnectable: true,
    data: {
      sourceColor: pluginMap[tpl.nodes[e.from].pluginType]?.color ?? '#78786e',
      targetColor: pluginMap[tpl.nodes[e.to].pluginType]?.color ?? '#78786e',
    },
  }));
  for (const s of sinks) {
    edges.push({
      id: `e-${newId()}`,
      source: ids[s],
      sourceHandle: pluginMap[tpl.nodes[s].pluginType]?.outputs[0]?.id ?? 'out',
      target: endNode.id,
      targetHandle: null,
      animated: true,
      reconnectable: true,
      data: {
        sourceColor: pluginMap[tpl.nodes[s].pluginType]?.color ?? '#78786e',
        targetColor: pluginMap['core.end']?.color ?? '#a1a1aa',
      },
    });
  }
  return { nodes, edges };
}

export const templates: AutomationTemplate[] = [
  {
    id: 'tpl-content',
    name: 'Content Pipeline',
    description: 'Topics from Google Sheets (or local content-calendar), Tavily research, Gemini captions, Unsplash images, then Facebook when Status is approved.',
    icon: Newspaper,
    color: '#10b981',
    tags: ['Google Sheets', 'Gemini', 'Unsplash', 'Social'],
    nodes: [
      { pluginType: 'trigger.schedule', label: 'Daily topics', config: { stepKey: 'schedule', cron: '0 9 * * *', timezone: 'Asia/Kolkata', activeFrom: '', activeUntil: '' }, x: 0, y: 0 },
      // spreadsheetId blank → GOOGLE_SHEETS_SPREADSHEET_ID from .env; use content-calendar for Postgres fallback
      { pluginType: 'app.sheets.read', label: 'Fetch topics', config: { stepKey: 'topics', spreadsheetId: '', sheet: 'Topics', range: 'A1:F100' }, x: 0, y: 180 },
      { pluginType: 'app.tavily.search', label: 'Research topic', config: { stepKey: 'research', query: '{{ steps.topics.topic }}', maxResults: 5 }, x: 0, y: 360 },
      {
        pluginType: 'ai.gemini',
        label: 'Write captions',
        config: {
          stepKey: 'captions',
          model: 'gemini-flash-lite-latest',
          prompt:
            'Write Facebook, Instagram and LinkedIn captions as JSON only with keys {"facebook","instagram","linkedin"} for topic: {{ steps.topics.topic }}\nResearch: {{ steps.research.results }}',
        },
        x: 0,
        y: 540,
      },
      { pluginType: 'app.images.search', label: 'Find images', config: { stepKey: 'images', provider: 'Unsplash', query: '{{ steps.topics.keywords }}' }, x: 0, y: 720 },
      // Status "approved" → Facebook publish. Change to "pending" (or anything else) to hit Slack revision instead.
      {
        pluginType: 'app.sheets.append',
        label: 'Save draft',
        config: {
          stepKey: 'draft',
          spreadsheetId: '',
          sheet: 'Drafts',
          values:
            '{ "Topic": "{{ steps.topics.topic }}", "Keywords": "{{ steps.topics.keywords }}", "Caption": "{{ steps.captions.facebook }}", "ImageUrl": "{{ steps.images.url }}", "Status": "approved" }',
        },
        x: 0,
        y: 900,
      },
      { pluginType: 'logic.if', label: 'Approved?', config: { stepKey: 'approval', left: '{{ steps.draft.status }}', operator: 'equals', right: 'approved' }, x: 0, y: 1080 },
      {
        pluginType: 'app.facebook.post',
        label: 'Publish post',
        config: {
          stepKey: 'publish',
          pageId: '',
          message: '{{ steps.captions.facebook }}',
          imageUrl: '{{ steps.images.url }}',
        },
        x: -340,
        y: 1260,
      },
      {
        pluginType: 'app.sheets.append',
        label: 'Mark published',
        config: {
          stepKey: 'published',
          spreadsheetId: '',
          sheet: 'Drafts',
          values: '{ "Status": "Published", "Topic": "{{ steps.topics.topic }}", "ImageUrl": "{{ steps.images.url }}" }',
        },
        x: -340,
        y: 1440,
      },
      { pluginType: 'app.slack.message', label: 'Revision needed', config: { stepKey: 'revision', channel: '#content', text: 'Draft needs revision: {{ steps.topics.topic }}' }, x: 340, y: 1260 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
      { from: 5, to: 6 },
      { from: 6, to: 7, sourceHandle: 'true' },
      { from: 7, to: 8 },
      { from: 6, to: 9, sourceHandle: 'false' },
    ],
  },
  {
    id: 'tpl-triage',
    name: 'Smart Ticket Triage',
    description: 'Webhook intake, Zammad ticket, Ollama classification, rule routing to billing or technical, CRM update.',
    icon: Inbox,
    color: '#3b82f6',
    tags: ['Webhook', 'AI classify', 'CRM'],
    nodes: [
      { pluginType: 'trigger.webhook', label: 'Ticket intake', config: { method: 'POST', path: '/tickets', respondImmediately: true }, x: 0, y: 0 },
      { pluginType: 'app.zammad.ticket', label: 'Create ticket', config: { credential: 'zammad-token', operation: 'create ticket', title: '{{ steps.intake.subject }}', body: '{{ steps.intake.body }}', group: 'Users', priority: 'normal' }, x: 0, y: 180 },
      { pluginType: 'ai.ollama', label: 'Classify ticket', config: { endpoint: 'http://localhost:11434', model: 'llama3.1', prompt: 'Classify category, urgency, sentiment and summary for:\n{{ steps.intake.body }}' }, x: 0, y: 360 },
      { pluginType: 'core.transform', label: 'Normalize', config: { mapping: '{ "department": "{{ steps.classify.department }}", "priority": "{{ steps.classify.priority }}" }' }, x: 0, y: 540 },
      { pluginType: 'logic.router', label: 'Route by rules', config: { value: '{{ steps.normalize.department }}', cases: 'billing, technical, other' }, x: 0, y: 720 },
      { pluginType: 'app.gmail.send', label: 'Billing reply', config: { to: '{{ steps.intake.email }}', subject: 'Re: {{ steps.intake.subject }}', body: '{{ steps.classify.summary }}' }, x: -360, y: 900 },
      { pluginType: 'app.mattermost.message', label: 'Notify tech team', config: { credential: 'mattermost-webhook', channel: 'support', text: 'Technical ticket {{ steps.ticket.id }}: {{ steps.intake.subject }}' }, x: 360, y: 900 },
      { pluginType: 'app.espocrm.record', label: 'Update CRM', config: { credential: 'espocrm-token', entity: 'Case', operation: 'update', data: '{ "status": "Assigned", "priority": "{{ steps.normalize.priority }}" }' }, x: 0, y: 1080 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5, sourceHandle: 'a' },
      { from: 4, to: 6, sourceHandle: 'b' },
      { from: 5, to: 7 },
      { from: 6, to: 7 },
      { from: 4, to: 7, sourceHandle: 'default' },
    ],
  },
  {
    id: 'tpl-reports',
    name: 'Sales Reports',
    description: 'Daily Sheets fetch, Code validation, Gemini insights, risk check with Slack alert, chart, Notion report, email.',
    icon: BarChart3,
    color: '#a855f7',
    tags: ['Sheets', 'AI insights', 'Charts'],
    nodes: [
      { pluginType: 'trigger.schedule', label: 'Daily 9 AM', config: { cron: '0 9 * * *', timezone: 'Asia/Kolkata' }, x: 0, y: 0 },
      { pluginType: 'app.sheets.read', label: 'Fetch sales', config: { spreadsheetId: 'sales-sheet-id', sheet: 'Sales', range: 'A1:Z5000' }, x: 0, y: 180 },
      { pluginType: 'core.code', label: 'Validate & clean', config: { code: '// `input` holds the sales rows\nreturn input.filter((r) => r.amount != null);' }, x: 0, y: 360 },
      { pluginType: 'ai.gemini', label: 'Analyze sales', config: { credential: 'gemini-key', model: 'gemini-2.0-flash', prompt: 'Find insights, risks and recommendations in:\n{{ steps.clean.rows }}' }, x: 0, y: 540 },
      { pluginType: 'logic.if', label: 'Risk?', config: { left: '{{ steps.analysis.riskScore }}', operator: 'greater than', right: '80' }, x: 0, y: 720 },
      { pluginType: 'app.slack.message', label: 'Alert team', config: { channel: '#alerts', text: 'Sales risk detected: {{ steps.analysis.risk }}' }, x: -340, y: 900 },
      { pluginType: 'logic.merge', label: 'Continue', config: { mode: 'append' }, x: 0, y: 900 },
      { pluginType: 'app.quickchart.image', label: 'Sales chart', config: { chartType: 'pie', labels: 'North, South, East, West', values: '120, 90, 75, 60', title: 'Sales by region' }, x: 0, y: 1080 },
      { pluginType: 'app.notion.page', label: 'Save report', config: { credential: 'notion-token', databaseId: 'reports-db-id', operation: 'create page', properties: '{ "Title": "Daily sales report" }', content: '{{ steps.analysis.summary }}' }, x: 0, y: 1260 },
      { pluginType: 'app.gmail.send', label: 'Email summary', config: { to: 'team@example.com', subject: 'Daily sales report', body: '{{ steps.analysis.summary }}\nChart: {{ steps.chart.url }}' }, x: 0, y: 1440 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5, sourceHandle: 'true' },
      { from: 5, to: 6 },
      { from: 4, to: 6, sourceHandle: 'false' },
      { from: 6, to: 7 },
      { from: 7, to: 8 },
      { from: 8, to: 9 },
    ],
  },
  {
    id: 'tpl-meeting-schedule',
    name: 'Meeting Scheduling',
    description: 'Extract request details with Gemini, check Calendar, create the event or propose alternatives by email.',
    icon: CalendarDays,
    color: '#f97316',
    tags: ['Calendar', 'AI extract', 'Email'],
    nodes: [
      { pluginType: 'trigger.manual', label: 'Plan meeting', config: {}, x: 0, y: 0 },
      { pluginType: 'ai.gemini', label: 'Extract details', config: { credential: 'gemini-key', model: 'gemini-2.0-flash', prompt: 'Extract topic, attendees, duration and preferred range from:\n{{ meeting.request }}' }, x: 0, y: 180 },
      { pluginType: 'app.calendar.event', label: 'Check free/busy', config: { credential: 'google-oauth', operation: 'check availability', calendarId: 'primary', attendees: '{{ steps.details.attendees }}' }, x: 0, y: 360 },
      { pluginType: 'logic.if', label: 'Slot found?', config: { left: '{{ steps.availability.slots }}', operator: 'is empty', right: '' }, x: 0, y: 540 },
      { pluginType: 'app.calendar.event', label: 'Create event', config: { credential: 'google-oauth', operation: 'create event', calendarId: 'primary', summary: '{{ steps.details.topic }}', start: '{{ steps.availability.firstStart }}', end: '{{ steps.availability.firstEnd }}', attendees: '{{ steps.details.attendees }}' }, x: -340, y: 720 },
      { pluginType: 'app.gmail.send', label: 'Send invite', config: { to: '{{ steps.details.attendees }}', subject: 'Invite: {{ steps.details.topic }}', body: 'Agenda: {{ steps.details.agenda }}\nMeet: {{ steps.event.link }}' }, x: -340, y: 900 },
      { pluginType: 'app.sheets.append', label: 'Save record', config: { spreadsheetId: 'meetings-sheet-id', sheet: 'Meetings', values: '{ "Topic": "{{ steps.details.topic }}", "Event": "{{ steps.event.id }}" }' }, x: -340, y: 1080 },
      { pluginType: 'ai.gemini', label: 'Suggest alternatives', config: { credential: 'gemini-key', model: 'gemini-2.0-flash', prompt: 'Suggest 2-3 alternative slots from:\n{{ steps.availability.all }}' }, x: 340, y: 720 },
      { pluginType: 'app.gmail.send', label: 'Send proposal', config: { to: '{{ steps.details.attendees }}', subject: 'Alternative slots: {{ steps.details.topic }}', body: '{{ steps.alternatives.slots }}' }, x: 340, y: 900 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4, sourceHandle: 'false' },
      { from: 4, to: 5 },
      { from: 5, to: 6 },
      { from: 3, to: 7, sourceHandle: 'true' },
      { from: 7, to: 8 },
    ],
  },
  {
    id: 'tpl-meeting-followup',
    name: 'Meeting Follow-up',
    description: 'After the meeting: Gemini summary, email it, track action items in Sheets, remind before deadlines.',
    icon: Mail,
    color: '#0ea5e9',
    tags: ['AI summary', 'Email', 'Reminders'],
    nodes: [
      { pluginType: 'trigger.schedule', label: 'Hourly check', config: { cron: '15 * * * *', timezone: 'Asia/Kolkata' }, x: 0, y: 0 },
      { pluginType: 'ai.gemini', label: 'Summarize notes', config: { credential: 'gemini-key', model: 'gemini-2.0-flash', prompt: 'Summarize decisions and action items with owners and deadlines from:\n{{ meeting.notes }}' }, x: 0, y: 180 },
      { pluginType: 'app.gmail.send', label: 'Send summary', config: { to: '{{ steps.details.attendees }}', subject: 'Summary: {{ steps.details.topic }}', body: '{{ steps.summary.text }}' }, x: 0, y: 360 },
      { pluginType: 'app.sheets.append', label: 'Save actions', config: { spreadsheetId: 'meetings-sheet-id', sheet: 'Actions', values: '{ "Owner": "{{ steps.summary.owner }}", "Deadline": "{{ steps.summary.deadline }}", "Status": "Pending" }' }, x: 0, y: 540 },
      { pluginType: 'logic.delay', label: 'Wait a day', config: { amount: 1, unit: 'days' }, x: 0, y: 720 },
      { pluginType: 'app.gmail.send', label: 'Deadline reminder', config: { to: '{{ steps.summary.owner }}', subject: 'Reminder: action due', body: '{{ steps.summary.action }} is due {{ steps.summary.deadline }}' }, x: 0, y: 900 },
    ],
    edges: [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4 },
      { from: 4, to: 5 },
    ],
  },
];
