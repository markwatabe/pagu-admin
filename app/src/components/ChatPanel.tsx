import { useState, useRef, useCallback, useEffect } from 'react';
import { db } from '../lib/db';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolEvent {
  type: 'tool_use' | 'tool_result';
  name: string;
}

function parseSSELines(buffer: string): { events: string[]; remaining: string } {
  const events: string[] = [];
  const lines = buffer.split('\n');
  const remaining = lines.pop() ?? '';
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      events.push(line.slice(6));
    }
  }
  return { events, remaining };
}

export function ChatPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = db.useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolEvents]);

  // Abort in-flight request when panel closes
  useEffect(() => {
    if (!open && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, [open]);

  const send = useCallback(async () => {
    if (!input.trim() || loading || !user) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setToolEvents([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.refresh_token}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('No response stream available');
      }

      const decoder = new TextDecoder();
      let assistantText = '';
      let sseBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const { events, remaining } = parseSSELines(sseBuffer);
        sseBuffer = remaining;

        for (const eventData of events) {
          try {
            const data = JSON.parse(eventData);
            if (data.type === 'text') {
              assistantText += data.text;
              const text = assistantText;
              setMessages((prev) => [
                ...prev.slice(0, prev.length > 0 && prev[prev.length - 1].role === 'assistant' ? -1 : prev.length),
                { role: 'assistant', content: text },
              ]);
            } else if (data.type === 'tool_use') {
              setToolEvents((prev) => [...prev, { type: 'tool_use', name: data.name }]);
            } else if (data.type === 'tool_result') {
              setToolEvents((prev) => [...prev, { type: 'tool_result', name: data.name }]);
            } else if (data.type === 'error') {
              setMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${data.message}` }]);
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : err}`,
      }]);
    } finally {
      abortRef.current = null;
      setLoading(false);
      setToolEvents([]);
    }
  }, [input, messages, loading, user]);

  if (!open) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l border-gray-200 bg-white shadow-lg z-[60] flex flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Pagu Assistant</h2>
        <button
          onClick={onClose}
          aria-label="Close chat"
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          &times;
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-gray-400 text-center mt-8">
            Ask me about recipes or menu items.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-sm ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
            <div
              className={`inline-block max-w-[80%] rounded-xl px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {toolEvents.map((evt, i) => (
          <div key={`tool-${i}`} className="text-xs text-gray-400 italic">
            {evt.type === 'tool_use' ? `Using ${evt.name}...` : `${evt.name} done`}
          </div>
        ))}
        {loading && toolEvents.length === 0 && (
          <div className="text-xs text-gray-400 italic">Thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-100 px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about recipes..."
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
