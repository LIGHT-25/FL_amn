import { useQuery } from '@tanstack/react-query'
import { getMockUser } from '../api/mockUser'
import { httpClient } from '../api/httpClient'

export default function Settings() {
  const user = getMockUser()
  const { data: quota, isPending, isError } = useQuery({
    queryKey: ['quota'],
    queryFn: () => httpClient.getQuota(),
    refetchInterval: 30_000,
  })

  return (
    <div className="mx-auto max-w-xl px-7 pb-10 pt-6">
      <h1 className="m-0 text-xl font-semibold text-ink">Settings</h1>
      <p className="mt-1.5 text-sm text-muted">Account and demo usage for this shared instance.</p>

      <section className="mt-6 rounded-xl border border-line bg-panel p-5">
        <h2 className="m-0 text-sm font-medium text-muted">Account</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Name</dt>
            <dd className="m-0 text-ink">{user.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="m-0 text-ink">{user.email ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-panel p-5">
        <h2 className="m-0 text-sm font-medium text-muted">Daily run quota</h2>
        {isPending ? (
          <p className="mt-3 text-sm text-muted">Loading…</p>
        ) : isError || !quota ? (
          <p className="mt-3 text-sm text-muted">Could not load quota.</p>
        ) : (
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Runs today</dt>
              <dd className="m-0 text-ink">
                {quota.runsToday} / {quota.runsLimit}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Remaining</dt>
              <dd className="m-0 font-medium text-ink">{quota.runsRemaining}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Workflows</dt>
              <dd className="m-0 text-ink">
                {quota.workflows} / {quota.workflowsLimit}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Hosted schedules</dt>
              <dd className="m-0 text-ink">
                {quota.activeSchedules} / {quota.activeSchedulesLimit}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Demo mode</dt>
              <dd className="m-0 text-ink">{quota.demoMode ? 'On (shared platform keys)' : 'Off'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Live publish</dt>
              <dd className="m-0 text-ink">{quota.publishEnabled ? 'Enabled' : 'Disabled'}</dd>
            </div>
          </dl>
        )}
        <p className="mt-4 m-0 text-[12.5px] leading-relaxed text-muted">
          Credentials are managed by the platform operator. You do not need to paste API keys into node
          settings on this demo.
        </p>
      </section>
    </div>
  )
}
