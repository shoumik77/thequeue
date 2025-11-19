import { useEffect, useMemo, useState } from 'react'
import { api, updateRequestStatus, updateRequestPosition } from '../api'
import type { SessionOut, RequestOut } from '../types'
import QRCode from 'qrcode.react'

export default function Dashboard() {
  const [name, setName] = useState('')
  const [session, setSession] = useState<SessionOut | null>(null)
  const [requests, setRequests] = useState<RequestOut[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'accepted' | 'playing' | 'done' | 'rejected'>('all')

  const audienceUrl = useMemo(() => {
    if (!session) return ''
    const origin = window.location.origin
    return `${origin}/s/${session.slug}`
  }, [session])

  async function createSession() {
    setLoading(true)
    setError(null)
    try {
      const data = await api<SessionOut>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      setSession(data)
      setRequests([])
    } catch (e: any) {
      setError(e.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  async function loadRequests() {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const data = await api<RequestOut[]>(`/sessions/${session.id}/requests`)
      setRequests(data)
    } catch (e: any) {
      setError(e.message || 'Failed to load requests')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) loadRequests()
  }, [session?.id])

  // auto-poll every 5s when a session is active
  useEffect(() => {
    if (!session) return
    const id = setInterval(() => {
      loadRequests()
    }, 5000)
    return () => clearInterval(id)
  }, [session?.id])

  async function onSetStatus(id: number, status: RequestOut['status']) {
    if (status === 'done') {
      const ok = window.confirm('Mark this request as Done?')
      if (!ok) return
    }
    if (status === 'rejected') {
      const ok = window.confirm('Reject this request?')
      if (!ok) return
    }
    try {
      await updateRequestStatus(id, status)
      await loadRequests()
    } catch (e: any) {
      setError(e.message || 'Failed to update status')
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold">DJ Dashboard</h1>
      {!session ? (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            Session name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Friday Night – Club XYZ"
              className="mt-2 w-full rounded-md border border-gray-300 bg-white/80 p-2 text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
            />
          </label>
          <button
            onClick={createSession}
            disabled={!name || loading}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Start New Session'}
          </button>
          {error && <p className="text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-semibold">Session:</span> {session.name} (id: {session.id})
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">Audience link:</span>
            <a className="text-blue-600 hover:underline" href={audienceUrl} target="_blank" rel="noreferrer">{audienceUrl}</a>
            <button
              onClick={() => navigator.clipboard.writeText(audienceUrl)}
              className="rounded-md border border-gray-300 px-2 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Copy
            </button>
          </div>
          <div className="pt-2">
            <div className="inline-block rounded-lg bg-white p-3 shadow dark:bg-gray-800">
              <QRCode value={audienceUrl} size={128} includeMargin={true} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadRequests}
              disabled={loading}
              className="rounded-md bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              {loading ? 'Loading…' : 'Refresh Requests'}
            </button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['all','pending','accepted','playing','done','rejected'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`rounded-md border px-3 py-1 text-sm ${statusFilter === key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                {key}
              </button>
            ))}
          </div>
          {/* Now Playing & Next Up */}
          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
              <h3 className="text-lg font-semibold mb-2">Now Playing</h3>
              {(() => {
                const np = requests.find(r => r.status === 'playing')
                return np ? (
                  <div>
                    <div className="font-medium">{np.song_title}{np.artist ? <span className="text-gray-500"> — {np.artist}</span> : ''}</div>
                    <div className="text-xs text-gray-500 mt-1">From: {np.guest_name || 'Anonymous'}</div>
                    {np.note && <div className="text-sm mt-1">Note: {np.note}</div>}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No song is currently playing.</div>
                )
              })()}
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4 bg-white/70 dark:bg-gray-900/40">
              <h3 className="text-lg font-semibold mb-2">Next Up</h3>
              {(() => {
                const list = requests.filter(r => r.status === 'accepted').slice(0, 3)
                if (list.length === 0) return <div className="text-sm text-gray-500">No upcoming songs.</div>
                return (
                  <ol className="list-decimal pl-5 space-y-2">
                    {list.map(r => (
                      <li key={r.id}>
                        <span className="font-medium">{r.song_title}</span>{r.artist ? <span className="text-gray-500"> — {r.artist}</span> : ''}
                        <span className="text-xs text-gray-500"> · From: {r.guest_name || 'Anonymous'}</span>
                      </li>
                    ))}
                  </ol>
                )
              })()}
            </div>
          </section>

          <h2 className="text-xl font-semibold pt-4">Requests</h2>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800 rounded-md bg-white/60 dark:bg-gray-900/40">
            {(() => {
              const list = statusFilter === 'all' ? requests : requests.filter(r => r.status === statusFilter)
              if (list.length === 0) return <li className="p-4 text-sm text-gray-500">No requests yet.</li>
              return list.map((r) => (
              <li key={r.id} className="p-4">
                <div className="font-medium">
                  {r.song_title}{r.artist ? <span className="text-gray-500"> — {r.artist}</span> : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  From: {r.guest_name || 'Anonymous'} · Status: {r.status} · Pos: {r.position}
                </div>
                {r.note && <div className="text-sm mt-1">Note: {r.note}</div>}
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={async () => {
                      const newPos = Math.max(1, r.position - 1)
                      await updateRequestPosition(r.id, newPos)
                      await loadRequests()
                    }}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    ↑ Up
                  </button>
                  <button
                    onClick={async () => {
                      const maxPos = requests.length
                      const newPos = Math.min(maxPos, r.position + 1)
                      await updateRequestPosition(r.id, newPos)
                      await loadRequests()
                    }}
                    className="rounded-md border px-3 py-1 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    ↓ Down
                  </button>
                  <button onClick={() => onSetStatus(r.id, 'accepted')} className="rounded-md bg-amber-500/90 px-3 py-1 text-white hover:bg-amber-600">Accept</button>
                  <button onClick={() => onSetStatus(r.id, 'playing')} className="rounded-md bg-green-600 px-3 py-1 text-white hover:bg-green-700">Playing</button>
                  <button onClick={() => onSetStatus(r.id, 'done')} className="rounded-md bg-gray-700 px-3 py-1 text-white hover:bg-gray-800">Done</button>
                  <button onClick={() => onSetStatus(r.id, 'rejected')} className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700">Reject</button>
                </div>
              </li>
              ))
            })()}
          </ul>
        </div>
      )}
    </div>
  )
}
