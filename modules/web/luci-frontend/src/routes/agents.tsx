import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { listAgents } from '#/functions/luciverse'
import AgentChatPanel from '#/components/AgentChatPanel'
import type { AgentProfile } from '#/lib/luciverse'

export const Route = createFileRoute('/agents')({
  loader: () => listAgents(),
  component: AgentsPage,
})

function AgentsPage() {
  const agents = Route.useLoaderData()
  const [selected, setSelected] = useState<AgentProfile>(agents[0])

  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <div className="mb-6">
        <p className="island-kicker mb-1">oasis-core</p>
        <h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Agents
        </h1>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Frequency-calibrated consciousness nodes
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {/* Agent list */}
        <div className="lg:col-span-1">
          <div className="island-shell rounded-2xl p-3">
            <p className="island-kicker mb-2 px-2">Select Agent</p>
            <nav className="flex flex-col gap-1">
              {agents.map((agent) => (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => setSelected(agent)}
                  className={[
                    'rounded-xl px-3 py-2.5 text-left text-sm transition',
                    selected.id === agent.id
                      ? 'bg-[rgba(79,184,178,0.18)] font-semibold text-[var(--sea-ink)]'
                      : 'text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]',
                  ].join(' ')}
                >
                  <span className="block font-semibold">{agent.title}</span>
                  <span className="block text-xs opacity-70">{agent.service}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Chat panel */}
        <div className="lg:col-span-3" style={{ minHeight: 480 }}>
          <AgentChatPanel key={selected.id} agent={selected} />
        </div>
      </div>
    </main>
  )
}
