interface Props {
  modules: Record<string, boolean>
}

export default function ModuleGrid({ modules }: Props) {
  const entries = Object.entries(modules)

  return (
    <div className="island-shell rounded-2xl p-6">
      <p className="island-kicker mb-4">Substrate Modules</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {entries.map(([name, loaded]) => (
          <div
            key={name}
            className={[
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium',
              loaded
                ? 'border-[rgba(79,184,178,0.25)] bg-[rgba(79,184,178,0.06)] text-[var(--sea-ink)]'
                : 'border-[var(--line)] bg-transparent text-[var(--sea-ink-soft)] opacity-50',
            ].join(' ')}
          >
            <span
              className={[
                'h-1.5 w-1.5 shrink-0 rounded-full',
                loaded ? 'bg-[var(--lagoon)]' : 'bg-[var(--line)]',
              ].join(' ')}
            />
            <span className="truncate">{name.replace(/_/g, ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
