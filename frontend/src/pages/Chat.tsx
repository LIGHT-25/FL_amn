import { Bot, Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { client } from '../api';
import { mockUser } from '../api/mockUser';

interface Message {
  id: number;
  role: 'user' | 'bot';
  text: string;
}

let nextId = 1;
const firstName = mockUser.name.split(' ')[0];

/** Mock chatbot: answers real questions from live store data. The full AI
 * builder (turning words into workflows) arrives with the backend. */
async function answerChat(input: string): Promise<string> {
  const q = input.toLowerCase();
  const [workflows, executions] = await Promise.all([client.listWorkflows(), client.listExecutions()]);
  const active = workflows.filter((w) => w.status === 'active');
  const failed = executions.filter((e) => e.status === 'failed');
  const running = executions.filter((e) => e.status === 'running');
  const latest = [...executions].sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt))[0];

  if (/^(hi|hello|hey|yo|sup)\b/.test(q.trim())) {
    return (
      `Hello ${firstName}! I can answer questions about your automations right now — ` +
      `try "how many workflows", "any failures?", or "last run".\nTurning words into new workflows arrives with the backend.`
    );
  }
  if (q.includes('fail')) {
    if (failed.length === 0) return 'Good news — no failed runs. Everything executed cleanly.';
    return (
      `${failed.length} failed run${failed.length === 1 ? '' : 's'}:\n` +
      failed.map((e) => `• ${e.workflowName} — ${e.error ?? 'unknown error'}`).join('\n') +
      `\nOpen Debugging to walk through the steps.`
    );
  }
  if (q.includes('last run') || q.includes('recent') || q.includes('latest')) {
    if (!latest) return 'No runs yet. Run an automation and ask me again.';
    const when = new Date(latest.startedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `${latest.workflowName} ${latest.status} on ${when}.${latest.error ? `\nError: ${latest.error}` : ''}`;
  }
  if (q.includes('running') || q.includes('live') || q.includes('right now')) {
    if (running.length === 0) return 'Nothing is running right now.';
    return `Currently running:\n${running.map((e) => `• ${e.workflowName}`).join('\n')}`;
  }
  if (q.includes('active')) {
    if (active.length === 0) return 'No active automations. Flip a toggle on the dashboard to activate one.';
    return `Active automations:\n${active.map((w) => `• ${w.name}`).join('\n')}`;
  }
  if (q.includes('how many') || q.includes('count') || q.includes('number')) {
    return `${workflows.length} automation${workflows.length === 1 ? '' : 's'} (${active.length} active), ${executions.length} recorded run${executions.length === 1 ? '' : 's'}.`;
  }
  if (q.includes('list') || q.includes('show') || q.includes('workflow') || q.includes('automation')) {
    if (workflows.length === 0) return 'No automations yet. Create one from the dashboard or Explore.';
    return workflows.map((w) => `• ${w.name} (${w.status})`).join('\n');
  }
  if (q.includes('help') || q.includes('what can you')) {
    return 'Ask me things like:\n• "how many workflows"\n• "any failures?"\n• "last run"\n• "what is running"\n• "list automations"';
  }
  return (
    `I answer questions about your automations — counts, failures, recent runs. ` +
    `Try "help" for examples. Building new workflows from chat arrives with the backend.`
  );
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, role: 'bot', text: `Hello ${firstName}! Ask me about your automations — try "any failures?"` },
  ]);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, thinking]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft('');
    setMessages((m) => [...m, { id: nextId++, role: 'user', text }]);
    setThinking(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const reply = await answerChat(text);
      setMessages((m) => [...m, { id: nextId++, role: 'bot', text: reply }]);
    } finally {
      setThinking(false);
    }
  };

  const rowCls = 'flex items-start gap-2.5';
  const avatarCls =
    'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[9px] border border-line bg-panel-2 text-muted';
  const bubbleBase =
    'max-w-[75%] whitespace-pre-line rounded-xl px-3.5 py-2.5 text-[13.5px] leading-[1.6]';

  return (
    <div className="mx-auto flex h-full max-w-[860px] flex-col px-7 pt-6 pb-5">
      <h1 className="text-xl font-[650]">Chat</h1>
      <p className="mt-1.5 mb-4 text-sm text-muted">
        Ask about your automations. Answers come from live workspace data.
      </p>
      <div
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-0.5 pt-1 pb-3"
        ref={logRef}
      >
        {messages.map((m) => (
          <div className={cn(rowCls, m.role === 'user' && 'flex-row-reverse')} key={m.id}>
            <span className={avatarCls}>
              {m.role === 'bot' ? (
                <Bot size={16} />
              ) : (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0d9488] text-[13px] font-semibold text-white">
                  {mockUser.initials}
                </span>
              )}
            </span>
            <span
              className={cn(
                bubbleBase,
                m.role === 'user'
                  ? 'border border-lime-400/30 bg-lime-400/[0.12]'
                  : 'border border-line bg-panel',
              )}
            >
              {m.text}
            </span>
          </div>
        ))}
        {thinking && (
          <div className={rowCls}>
            <span className={avatarCls}>
              <Bot size={16} />
            </span>
            <span className={cn(bubbleBase, 'border border-line bg-panel')}>
              <span className="inline-flex gap-[5px] px-0.5 py-1">
                <span
                  className="h-[7px] w-[7px] animate-pulse rounded-full bg-muted"
                  style={{ animationDuration: '1.1s', animationTimingFunction: 'ease-in-out' }}
                />
                <span
                  className="h-[7px] w-[7px] animate-pulse rounded-full bg-muted"
                  style={{ animationDuration: '1.1s', animationTimingFunction: 'ease-in-out', animationDelay: '0.18s' }}
                />
                <span
                  className="h-[7px] w-[7px] animate-pulse rounded-full bg-muted"
                  style={{ animationDuration: '1.1s', animationTimingFunction: 'ease-in-out', animationDelay: '0.36s' }}
                />
              </span>
            </span>
          </div>
        )}
      </div>
      <form className="flex gap-2 border-t border-line pt-3" onSubmit={send}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your automations…"
          aria-label="Chat message"
          className="h-auto flex-1 rounded-[10px] border-line bg-panel px-3.5 py-2.5 text-[14px] focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-lime-400/15"
        />
        <Button
          type="submit"
          disabled={draft.trim() === '' || thinking}
          className="h-auto gap-[7px] rounded-[10px] px-4 py-2.5 text-[14px] text-[#16220a] shadow-none hover:bg-lime-400 [&_svg]:size-[15px]"
        >
          <Send size={15} /> Send
        </Button>
      </form>
    </div>
  );
}
