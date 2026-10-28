import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { fetchMe, getAccessToken, getSession, isAuthenticated, refreshSession } from './session'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [ok, setOk] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (isAuthenticated()) {
        if (!cancelled) {
          setOk(true)
          setReady(true)
        }
        return
      }
      // Session cookie may still be valid after a tab refresh wiped sessionStorage.
      if (getSession() && !getAccessToken()) {
        const refreshed = await refreshSession()
        if (!cancelled) {
          setOk(refreshed)
          setReady(true)
        }
        return
      }
      if (getAccessToken()) {
        const me = await fetchMe()
        if (!cancelled) {
          setOk(Boolean(me))
          setReady(true)
        }
        return
      }
      const refreshed = await refreshSession()
      if (!cancelled) {
        setOk(refreshed)
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [location.pathname])

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg text-sm text-muted">
        Checking session…
      </div>
    )
  }

  if (!ok) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  return children
}
