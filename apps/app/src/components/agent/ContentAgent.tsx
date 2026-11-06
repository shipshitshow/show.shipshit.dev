'use client';
import { Button, cn, Textarea } from '@shipshitshow/ui';
import { SendHorizontal, Sparkles, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useSidebarState } from '@/components/livestreams/SidebarStateContext';
import { getProductionApp, getProductionPageLabel } from '@/lib/app-navigation';
import { AGENT_SUGGESTIONS, type AgentMessage } from '@/lib/content-agent';

type Capability = { available: boolean; model: string } | null;

/**
 * Right-hand chat about the page that is open. It sees every upload with its
 * numbers, and the transcript when the page is about one video. It drafts
 * only: nothing it writes is published.
 */
export function ContentAgent() {
  const pathname = usePathname();
  const { toggleAgent } = useSidebarState();
  const [capability, setCapability] = useState<Capability>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const thread = useRef<HTMLDivElement>(null);
  const app = getProductionApp(pathname);
  const label = getProductionPageLabel(pathname);
  const context =
    app && label !== app.label ? `${app.label} / ${label}` : label;

  useEffect(() => {
    fetch('/api/agent', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then(setCapability)
      .catch(() => setCapability(null));
  }, []);

  useEffect(() => {
    const element = thread.current;
    if (element && messages.length > 0)
      element.scrollTop = element.scrollHeight;
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: AgentMessage[] = [...messages, { content, role: 'user' }];
    setMessages(next);
    setDraft('');
    setError('');
    setBusy(true);
    try {
      const response = await fetch('/api/agent', {
        body: JSON.stringify({ messages: next, path: pathname }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        reply?: string;
      };
      if (!response.ok || !body.reply)
        throw new Error(body.error ?? 'The agent did not answer.');
      setMessages([...next, { content: body.reply, role: 'assistant' }]);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'The agent failed.',
      );
    } finally {
      setBusy(false);
    }
  }

  const unavailable = capability !== null && !capability.available;
  return (
    <aside
      aria-label="Content agent"
      className="flex w-[340px] min-w-0 shrink-0 flex-col border-l border-surface-border bg-surface-elevated/30 max-lg:fixed max-lg:inset-y-0 max-lg:right-0 max-lg:z-30 max-lg:w-[min(380px,100%)] max-lg:bg-surface max-lg:shadow-2xl"
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Sparkles size={15} aria-hidden="true" />
          Content agent
        </p>
        <button
          type="button"
          onClick={toggleAgent}
          aria-label="Close the agent"
          className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="mx-4 flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs text-text-secondary">
        <span className="text-text-muted">Context</span>
        <span className="min-w-0 truncate">{context}</span>
      </div>
      <div
        ref={thread}
        aria-live="polite"
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
      >
        {unavailable ? (
          <p className="text-[13px] leading-relaxed text-text-secondary">
            The agent needs OPENROUTER_API_KEY in the server environment.
          </p>
        ) : null}
        {messages.map((message, index) => (
          <div
            // Messages never reorder; the index is stable.
            key={index}
            className={cn(
              'max-w-[94%] whitespace-pre-wrap text-[13px] leading-relaxed',
              message.role === 'user'
                ? 'self-end rounded-xl bg-surface-border/60 px-3 py-2 text-text-primary'
                : 'text-text-secondary',
            )}
          >
            {message.content}
          </div>
        ))}
        {busy ? <p className="text-[13px] text-text-muted">Thinking…</p> : null}
        {error ? (
          <p className="text-[13px] text-accent-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {messages.length === 0 && !unavailable ? (
        <div className="space-y-1 px-3 pb-2">
          {AGENT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => send(suggestion)}
              className="block w-full rounded-md border border-surface-border px-3 py-2 text-left text-[13px] text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
      <form
        className="flex items-end gap-2 border-t border-surface-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
      >
        <Textarea
          rows={2}
          value={draft}
          disabled={unavailable}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              send(draft);
            }
          }}
          placeholder="Ask about this page"
          aria-label="Message the content agent"
          className="min-h-14 resize-none"
        />
        <Button
          type="submit"
          variant="accent"
          size="icon"
          aria-label="Send"
          disabled={busy || unavailable || !draft.trim()}
          className="size-10 shrink-0"
        >
          <SendHorizontal size={16} aria-hidden="true" />
        </Button>
      </form>
    </aside>
  );
}
