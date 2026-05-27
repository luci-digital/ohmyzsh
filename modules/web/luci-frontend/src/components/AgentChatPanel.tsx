import { useState, useRef, useEffect } from 'react'
import { chatWithAgent } from '#/functions/luciverse'
import type { AgentProfile, ChatMessage } from '#/lib/luciverse'

interface Props {
  agent: AgentProfile
}

export default function AgentChatPanel({ agent }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const response = await chatWithAgent({
        data: { agentId: agent.id, messages: next },
      })
      setMessages([...next, { role: 'assistant', content: response.content }])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="island-shell flex h-full flex-col rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-3">
        <div>
          <p className="island-kicker mb-0">{agent.service}</p>
          <p className="m-0 text-sm font-semibold text-[var(--sea-ink)]">{agent.title}</p>
        </div>
        <button
          type="button"
          onClick={() => { setMessages([]); setError(null) }}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)]"
        >
          Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: 200 }}>
        {messages.length === 0 && (
          <p className="text-sm text-[var(--sea-ink-soft)] text-center mt-8">
            Send a message to start a session with {agent.title}.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={[
              'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
              msg.role === 'user'
                ? 'ml-auto bg-[rgba(79,184,178,0.18)] text-[var(--sea-ink)]'
                : 'mr-auto bg-[var(--surface)] text-[var(--sea-ink)]',
            ].join(' ')}
          >
            <p className="m-0 whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {loading && (
          <div className="mr-auto rounded-2xl bg-[var(--surface)] px-4 py-2.5">
            <span className="inline-flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-[var(--lagoon)] animate-bounce"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </div>
        )}
        {error && (
          <p className="text-xs text-red-500 text-center">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--line)] px-4 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
            placeholder={`Message ${agent.title}…`}
            disabled={loading}
            className="flex-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm text-[var(--sea-ink)] placeholder-[var(--sea-ink-soft)] outline-none focus:border-[var(--lagoon)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="rounded-full border border-[rgba(50,143,151,0.3)] bg-[rgba(79,184,178,0.14)] px-4 py-2 text-sm font-semibold text-[var(--lagoon-deep)] transition hover:-translate-y-0.5 hover:bg-[rgba(79,184,178,0.24)] disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
