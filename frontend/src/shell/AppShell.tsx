import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { httpClient } from '../api/httpClient'
import Sidebar from './Sidebar'

export default function AppShell() {
  const [open, setOpen] = useState(true)
  const { data: quota } = useQuery({
    queryKey: ['quota'],
    queryFn: () => httpClient.getQuota(),
    staleTime: 60_000,
  })

  const showDemoBanner = quota?.demoMode || (quota != null && quota.runsLimit <= 50)

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-ink">
      <Sidebar open={open} onToggle={() => setOpen((o) => !o)} />
      <main className="min-w-0 flex-1 overflow-y-auto [&>.app]:h-full">
        {showDemoBanner ? (
          <div className="border-b border-amber-900/40 bg-amber-950/40 px-4 py-2 text-center text-[12.5px] text-amber-100/90">
            Demo uses shared platform keys · {quota?.runsRemaining ?? '—'} runs left today ·{' '}
            <Link className="underline underline-offset-2 hover:text-amber-50" to="/app/settings">
              Settings
            </Link>
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}
