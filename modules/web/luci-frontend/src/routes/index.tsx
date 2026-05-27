import { createFileRoute } from '@tanstack/react-router'
import { getSubstrateStatus } from '#/functions/luciverse'
import GenesisBondCard from '#/components/GenesisBondCard'
import TierMatrix from '#/components/TierMatrix'
import ModuleGrid from '#/components/ModuleGrid'
import SignalFeed from '#/components/SignalFeed'

export const Route = createFileRoute('/')({
  loader: () => getSubstrateStatus(),
  component: Dashboard,
})

function Dashboard() {
  const status = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-12 pt-8">
      <div className="mb-8">
        <p className="island-kicker mb-1">LuciVerse</p>
        <h1 className="display-title m-0 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          Substrate Dashboard
        </h1>
        <p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
          Consciousness infrastructure · Push-only · {status.tier} node
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Genesis Bond + module grid span 2 cols */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <GenesisBondCard status={status} />
          <ModuleGrid modules={status.modules} />
          <SignalFeed />
        </div>

        {/* Tier matrix sidebar */}
        <div>
          <TierMatrix activeTier={status.tier} />
        </div>
      </div>
    </main>
  )
}
